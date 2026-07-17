<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Conversation;
use App\Models\PergiBareng;
use App\Models\PergiBarengParticipant;
use App\Models\Trip;
use App\Models\TripOrder;
use App\Models\UserNotification;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;

/**
 * Mengeluarkan seorang peserta dari pergi bareng / trip.
 *
 * Dipakai dari dua pintu masuk yang berbagi aturan sama:
 *  - Halaman manajemen (daftar peserta) milik penyelenggara/pemandu.
 *  - Tombol "Keluarkan" pada anggota grup chat.
 *
 * Mengeluarkan peserta selalu mencakup melepasnya dari grup chat entitas itu,
 * membebaskan kuota, memberi notifikasi, dan mencatat aktivitas — di satu tempat
 * agar kedua pintu masuk tak pernah menyimpang.
 */
class ParticipantRemoval
{
    /**
     * Keluarkan peserta dari sebuah pergi bareng. Peserta gabung tanpa bayar,
     * jadi cukup hapus baris pesertanya (membebaskan kursi) & lepas dari grup.
     *
     * @return bool true bila memang ada peserta yang dikeluarkan.
     */
    public function fromPergiBareng(PergiBareng $trip, int $userId): bool
    {
        $removed = PergiBarengParticipant::where('pergi_bareng_id', $trip->id)
            ->where('user_id', $userId)
            ->delete();

        // Selalu lepas dari grup, walau baris peserta sudah tidak ada — supaya
        // pintu "Keluarkan dari grup" tetap membersihkan keanggotaan chat.
        $this->detachFromGroup(
            Conversation::where('pergi_bareng_id', $trip->id)->where('is_group', true)->first(),
            $userId,
        );

        if (! $removed) {
            return false;
        }

        UserNotification::send(
            $userId,
            'group.removed',
            ['name' => $trip->name, 'kind' => 'pergi_bareng'],
            '/pergi-bareng/' . $trip->id,
        );

        ActivityLog::record('Mengeluarkan peserta dari pergi bareng: ' . $trip->name);

        return true;
    }

    /**
     * Keluarkan peserta dari sebuah trip. Peserta trip sudah membayar, jadi
     * dana dikembalikan ke dompetnya, pesanannya ditandai 'refunded' (membebaskan
     * kursi), lalu dilepas dari grup.
     *
     * Hanya pesanan berbayar pada RUN AKTIF yang diproses. Kredit dompet
     * idempotent per pesanan, jadi menekan "Keluarkan" dua kali tidak
     * mengembalikan dana dua kali.
     *
     * @return bool true bila memang ada pesanan berbayar yang dikembalikan.
     */
    public function fromTrip(Trip $trip, int $userId): bool
    {
        $runStart = $trip->current_run_started_at;

        $orders = TripOrder::where('trip_id', $trip->id)
            ->where('user_id', $userId)
            ->where('order_status', 'paid')
            ->when($runStart, fn ($q) => $q->where('created_at', '>=', $runStart))
            ->get();

        // Tetap lepas dari grup meski tak ada pesanan berbayar (mis. pemandu
        // membersihkan keanggotaan chat yang tersisa).
        $conversation = Conversation::where('trip_id', $trip->id)->where('is_group', true)->first();

        if ($orders->isEmpty()) {
            $this->detachFromGroup($conversation, $userId);
            return false;
        }

        DB::transaction(function () use ($orders, $userId, $trip) {
            $wallet = Wallet::forUser($userId);

            foreach ($orders as $order) {
                // Kembalikan dana lebih dulu (idempotent per pesanan), lalu tandai
                // pesanannya agar tidak terhitung sebagai kursi terisi lagi.
                $wallet->credit(
                    (float) $order->total,
                    'Pengembalian dana trip: ' . $trip->name,
                    'trip_order',
                    (int) $order->id,
                );

                $order->update(['order_status' => 'refunded']);
            }
        });

        $this->detachFromGroup($conversation, $userId);

        UserNotification::send(
            $userId,
            'group.removed',
            ['name' => $trip->name, 'kind' => 'trip', 'amount' => (float) $orders->sum('total')],
            '/trip-bareng/' . $trip->id,
        );

        ActivityLog::record('Mengeluarkan peserta dari trip (dana dikembalikan): ' . $trip->name);

        return true;
    }

    private function detachFromGroup(?Conversation $conversation, int $userId): void
    {
        $conversation?->participants()->detach($userId);
    }
}
