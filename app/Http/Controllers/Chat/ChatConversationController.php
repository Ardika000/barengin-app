<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\PergiBareng;
use App\Models\Trip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChatConversationController extends Controller
{
    public function openOrCreatePersonal(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
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

        return redirect()->route('chat.show', ['conversation' => $conversationId]);
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

        $buyerIds = DB::table('trip_orders')
            ->where('trip_id', $trip->id)
            // ->where('order_status', 'paid')
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
}
