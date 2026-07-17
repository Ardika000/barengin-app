<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\JastipItem;
use App\Models\PergiBareng;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChatConversationController extends Controller
{
    public function openOrCreatePersonal(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            // Referensi opsional (kartu konteks Trip / Pergi Bareng / Jastip) untuk pesan pertama.
            'ref_type' => ['nullable', 'in:trip,pergi_bareng,jastip'],
            'ref_id' => ['nullable', 'integer'],
        ]);

        $me = $request->user();
        $otherId = (int) $data['user_id'];

        abort_if($otherId === $me->id, 422, 'Cannot chat with yourself.');

        $conversationId = Conversation::query()
            ->where('is_group', false)
            ->whereNull('trip_id')
            ->whereNull('pergi_bareng_id')
            ->whereHas('participants', fn ($q) => $q->where('users.id', $me->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $otherId))
            ->value('id');

        if (! $conversationId) {
            $conversation = DB::transaction(function () use ($me, $otherId) {
                $conv = Conversation::create([
                    'trip_id' => null,
                    'pergi_bareng_id' => null,
                    'is_group' => false,
                ]);

                $conv->participants()->attach($me->id, ['last_read_at' => now()]);
                $conv->participants()->attach($otherId, ['last_read_at' => now()]);

                return $conv;
            });

            $conversationId = $conversation->id;
        }

        // Teruskan referensi (bila ada) sebagai query agar halaman chat menampilkan
        // kartu konteks yang terpasang di komposer.
        $params = ['conversation' => $conversationId];
        if (! empty($data['ref_type']) && ! empty($data['ref_id'])) {
            $params['ref_type'] = $data['ref_type'];
            $params['ref_id'] = $data['ref_id'];
        }

        return redirect()->route('chat.show', $params);
    }

    public function openOrCreateTripGroup(Request $request, Trip $trip){
        $me = $request->user();
        $isGuider = (int) $trip->guider_id === (int) $me->id;

        $isBuyer = DB::table('trip_orders')
            ->where('trip_id', $trip->id)
            ->where('user_id', $me->id)
            ->exists();

        abort_unless($isGuider || $isBuyer, 403, 'Kamu tidak punya akses ke grup trip ini');

        $conversationId = Conversation::query()
            ->where('is_group', true)
            ->where('trip_id', $trip->id)
            ->value('id');

        if (! $conversationId) {
            $conversation = DB::transaction(function () use ($trip) {
                return Conversation::create([
                    'trip_id' => $trip->id,
                    'pergi_bareng_id' => null,
                    'is_group' => true,
                ]);
            });

            $conversationId = $conversation->id;
        }

        // Hanya pembeli berbayar pada RUN AKTIF (setelah re-trip terakhir). Ini
        // menjaga agar peserta run lama tidak ikut ditambahkan kembali setelah
        // grup di-reset saat re-trip.
        $buyerIds = DB::table('trip_orders')
            ->where('trip_id', $trip->id)
            ->where('order_status', 'paid')
            ->when(
                $trip->current_run_started_at,
                fn ($q) => $q->where('created_at', '>=', $trip->current_run_started_at),
            )
            ->pluck('user_id')
            ->unique()
            ->values();

        $memberIds = $buyerIds
            ->push($trip->guider_id)
            ->unique()
            ->values();

        $conv = Conversation::findOrFail($conversationId);
        $existingIds = $conv->participants()->pluck('users.id');

        $toAttach = $memberIds->diff($existingIds);

        foreach ($toAttach as $uid) {
            $conv->participants()->attach($uid, ['last_read_at' => now()]);
        }
        return redirect("/chat/{$conversationId}?tab=groups");
    }

    public function openOrCreatePergiBarengGroup(Request $request, $id)
    {
        $trip = PergiBareng::with(['pergi_bareng_participants'])->findOrFail($id);
        $me = $request->user();

        $initiatorId = $trip->initiator?->id;
        $isOrganizer = (int) $initiatorId === (int) $me->id;

        $isParticipant = $trip->pergi_bareng_participants()
            ->where('user_id', $me->id)
            ->exists();
        abort_unless($isOrganizer || $isParticipant, 403, 'Kamu tidak punya akses ke grup pergi bareng ini');

        $conversationId = Conversation::query()
            ->where('is_group', true)
            ->where('pergi_bareng_id', $trip->id)
            ->value('id');

        if (! $conversationId) {
            $conversation = DB::transaction(function () use ($trip) {
                return Conversation::create([
                    'trip_id' => null,
                    'pergi_bareng_id' => $trip->id,
                    'is_group' => true,
                ]);
            });

            $conversationId = $conversation->id;
        }

        $participantUserIds = $trip->pergi_bareng_participants()
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->toArray();

        $memberIds = collect($participantUserIds);
        if ($initiatorId) {
            $memberIds->push($initiatorId);
        }
        $memberIds = $memberIds->unique()->filter()->values();

        $conv = Conversation::findOrFail($conversationId);
        $existingIds = $conv->participants()->pluck('users.id');

        $toAttach = $memberIds->diff($existingIds);

        foreach ($toAttach as $uid) {
            $conv->participants()->attach($uid, ['last_read_at' => now()]);
        }
        
        return redirect("/chat/{$conversationId}?tab=groups");
    }

    /**
     * Grup chat jastip: jastiper (pemilik produk) mengobrol dengan semua pembeli
     * yang sudah membayar produk jastip ini. (#15)
     */
    public function openOrCreateJastipGroup(Request $request, $id)
    {
        $item = JastipItem::findOrFail($id);
        $me = $request->user();

        // Semua pembeli yang sudah membayar produk ini
        $buyerIds = DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->join('transactions', 'jastip_orders.transaction_id', '=', 'transactions.id')
            ->where('jastip_order_items.jastip_item_id', $item->id)
            ->where('jastip_orders.order_status', 'paid')
            ->pluck('transactions.user_id')
            ->unique()
            ->values();

        $isOwner = (int) $item->user_id === (int) $me->id;
        $isBuyer = $buyerIds->contains((int) $me->id);

        abort_unless($isOwner || $isBuyer, 403, 'Kamu tidak punya akses ke grup jastip ini');

        $conversationId = Conversation::query()
            ->where('is_group', true)
            ->where('jastip_item_id', $item->id)
            ->value('id');

        if (! $conversationId) {
            $conversation = DB::transaction(function () use ($item) {
                return Conversation::create([
                    'trip_id'         => null,
                    'pergi_bareng_id' => null,
                    'jastip_item_id'  => $item->id,
                    'is_group'        => true,
                ]);
            });

            $conversationId = $conversation->id;
        }

        $memberIds = $buyerIds
            ->push($item->user_id)
            ->unique()
            ->filter()
            ->values();

        $conv = Conversation::findOrFail($conversationId);
        $existingIds = $conv->participants()->pluck('users.id');

        foreach ($memberIds->diff($existingIds) as $uid) {
            $conv->participants()->attach($uid, ['last_read_at' => now()]);
        }

        return redirect("/chat/{$conversationId}?tab=groups");
    }

    public function removeParticipant(Request $request, Conversation $conversation, User $user)
    {
        $me = $request->user();

        abort_unless((bool) $conversation->is_group, 403, 'Hanya berlaku untuk grup.');

        $conversation->loadMissing(['trip:id,guider_id', 'pergi_bareng:id,initiator_id', 'jastip_item:id,user_id']);

        $ownerId = $conversation->trip?->guider_id
            ?? $conversation->pergi_bareng?->initiator_id
            ?? $conversation->jastip_item?->user_id;

        abort_unless(
            $ownerId !== null && (int) $ownerId === (int) $me->id,
            403,
            'Hanya pemilik grup yang dapat mengeluarkan anggota.'
        );

        abort_if(
            (int) $user->id === (int) $ownerId,
            422,
            'Pemilik grup tidak dapat dikeluarkan.'
        );

        $conversation->participants()->detach($user->id);

        return response()->json(['ok' => true]);
    }
}
