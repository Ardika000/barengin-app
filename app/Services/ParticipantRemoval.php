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

// Mengeluarkan peserta dari pergi bareng / trip. Dipakai halaman manajemen dan
// tombol "Keluarkan" di grup chat, disatukan di sini biar tak menyimpang.
class ParticipantRemoval
{
    public function fromPergiBareng(PergiBareng $trip, int $userId): bool
    {
        $removed = PergiBarengParticipant::where('pergi_bareng_id', $trip->id)
            ->where('user_id', $userId)
            ->delete();

        // Tetap dilepas walau baris pesertanya sudah tidak ada.
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

    // Lepas SATU kursi saja, bukan seluruh kursi milik peserta.
    //
    // Satu orang bisa punya beberapa baris peserta (dari permintaan terpisah), jadi
    // pelepasan dari grup chat & notifikasinya baru dijalankan setelah dia benar-benar
    // tidak punya kursi tersisa di perjalanan ini.
    public function removeSeatFromPergiBareng(PergiBareng $trip, int $participantId): string
    {
        $row = PergiBarengParticipant::where('pergi_bareng_id', $trip->id)
            ->whereKey($participantId)
            ->first();

        if (! $row) {
            return 'not_found';
        }

        $userId = (int) $row->user_id;

        if ((int) $row->quantity > 1) {
            $row->decrement('quantity');
        } else {
            $row->delete();
        }

        $seatsLeft = (int) PergiBarengParticipant::where('pergi_bareng_id', $trip->id)
            ->where('user_id', $userId)
            ->sum('quantity');

        if ($seatsLeft > 0) {
            ActivityLog::record('Mengurangi 1 kursi peserta di pergi bareng: ' . $trip->name);

            return 'seat_removed';
        }

        $this->detachFromGroup(
            Conversation::where('pergi_bareng_id', $trip->id)->where('is_group', true)->first(),
            $userId,
        );

        UserNotification::send(
            $userId,
            'group.removed',
            ['name' => $trip->name, 'kind' => 'pergi_bareng'],
            '/pergi-bareng/' . $trip->id,
        );

        ActivityLog::record('Mengeluarkan peserta dari pergi bareng: ' . $trip->name);

        return 'fully_removed';
    }

    // Peserta trip sudah bayar, jadi dananya dikembalikan ke dompet dulu.
    public function fromTrip(Trip $trip, int $userId): bool
    {
        $runStart = $trip->current_run_started_at;

        $orders = TripOrder::where('trip_id', $trip->id)
            ->where('user_id', $userId)
            ->where('order_status', 'paid')
            ->when($runStart, fn ($q) => $q->where('created_at', '>=', $runStart))
            ->get();

        $conversation = Conversation::where('trip_id', $trip->id)->where('is_group', true)->first();

        if ($orders->isEmpty()) {
            $this->detachFromGroup($conversation, $userId);
            return false;
        }

        DB::transaction(function () use ($orders, $userId, $trip) {
            $wallet = Wallet::forUser($userId);

            foreach ($orders as $order) {
                // credit() idempotent per pesanan, klik dua kali tak refund dobel.
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
