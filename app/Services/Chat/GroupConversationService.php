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

    // ── Buat grup langsung saat resource dibuat (pemilik jadi anggota pertama) ──
    // Dipanggil dari store() Trip/PergiBareng/Jastip agar grup sudah ada sejak awal,
    // bukan menunggu tombol grup diklik.

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

    /**
     * Re-trip: pakai grup yang SAMA tetapi keluarkan semua peserta lama, sisakan
     * hanya pemilik (pemandu) — menunggu peserta run baru bergabung. Dipanggil
     * dari AdminTripController::retrip.
     */
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

        // Pemilik tetap jadi anggota agar grup tak kehilangan pengelolanya.
        $this->attachIfMissing($conversation, $ownerId);
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
