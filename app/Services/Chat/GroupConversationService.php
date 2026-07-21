<?php

namespace App\Services\Chat;

use App\Models\Conversation;
use App\Models\User;

class GroupConversationService{
    public function joinTripConversation(User $user, int $tripId){
        $conversation = Conversation::firstOrCreate([
            'trip_id' => $tripId,
            'pergi_bareng_id' => null,
            'is_group' => true,
        ]);

        if (! $conversation->participants()->where('users.id', $user->id)->exists()) {
            $conversation->participants()->attach($user->id, ['last_read_at' => now()]);
        }

        return $conversation;
    }

    public function joinPergiBarengConversation(User $user, int $perbarId){
        $conversation = Conversation::firstOrCreate([
            'trip_id' => null,
            'pergi_bareng_id' => $perbarId,
            'is_group' => true,
        ]);

        if (! $conversation->participants()->where('users.id', $user->id)->exists()) {
            $conversation->participants()->attach($user->id, ['last_read_at' => now()]);
        }

        return $conversation;
    }

    // Dipanggil dari store() Trip/PergiBareng/Jastip agar grupnya ada sejak awal.

    public function ensureTripGroup(int $tripId, ?int $ownerId = null): Conversation
    {
        $conversation = Conversation::firstOrCreate(
            ['trip_id' => $tripId, 'is_group' => true],
            ['pergi_bareng_id' => null, 'jastip_item_id' => null],
        );

        $this->attachIfMissing($conversation, $ownerId);

        return $conversation;
    }

    public function ensurePergiBarengGroup(int $pergiBarengId, ?int $ownerId = null): Conversation
    {
        $conversation = Conversation::firstOrCreate(
            ['pergi_bareng_id' => $pergiBarengId, 'is_group' => true],
            ['trip_id' => null, 'jastip_item_id' => null],
        );

        $this->attachIfMissing($conversation, $ownerId);

        return $conversation;
    }

    public function ensureJastipGroup(int $jastipItemId, ?int $ownerId = null): Conversation
    {
        $conversation = Conversation::firstOrCreate(
            ['jastip_item_id' => $jastipItemId, 'is_group' => true],
            ['trip_id' => null, 'pergi_bareng_id' => null],
        );

        $this->attachIfMissing($conversation, $ownerId);

        return $conversation;
    }

    // Re-trip: grupnya dipakai lagi, tapi peserta run lama dikeluarkan semua.
    public function resetTripGroupToOwner(int $tripId, int $ownerId): void
    {
        $conversation = Conversation::where('trip_id', $tripId)
            ->where('is_group', true)
            ->first();

        if (! $conversation) {
            return;
        }

        $others = $conversation->participants()
            ->where('users.id', '!=', $ownerId)
            ->pluck('users.id');

        if ($others->isNotEmpty()) {
            $conversation->participants()->detach($others->all());
        }

        $this->attachIfMissing($conversation, $ownerId);
    }

    // Tambal grup trip dari peserta berbayar run aktif, buat data seeder atau
    // pesanan lama yang lolos sebelum addBuyerToTripGroup ada.
    public function syncTripGroupMembers(int $tripId): int
    {
        $trip = \App\Models\Trip::find($tripId);
        if (! $trip) {
            return 0;
        }

        $conversation = $this->ensureTripGroup($tripId, (int) $trip->guider_id);

        $runStart = $trip->current_run_started_at;

        $paidUserIds = \Illuminate\Support\Facades\DB::table('trip_orders')
            ->where('trip_id', $tripId)
            ->where('order_status', 'paid')
            ->when($runStart, fn ($q) => $q->where('created_at', '>=', $runStart))
            ->distinct()
            ->pluck('user_id');

        $existing = $conversation->participants()->pluck('users.id');
        $missing  = $paidUserIds->diff($existing);

        foreach ($missing as $uid) {
            $conversation->participants()->attach((int) $uid, ['last_read_at' => now()]);
        }

        return $missing->count();
    }

    private function attachIfMissing(Conversation $conversation, ?int $userId): void
    {
        if (! $userId) {
            return;
        }

        if (! $conversation->participants()->where('users.id', $userId)->exists()) {
            $conversation->participants()->attach($userId, ['last_read_at' => now()]);
        }
    }
}
