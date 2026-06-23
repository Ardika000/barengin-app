<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MidtransController extends Controller
{
    /**
     * Webhook notifikasi dari Midtrans (server-to-server).
     * Set URL ini di dashboard Midtrans: {APP_URL}/midtrans/notification
     */
    public function notification()
    {
        self::configure();

        try {
            $notif = new \Midtrans\Notification();
        } catch (\Throwable $e) {
            Log::warning('[MIDTRANS] Notifikasi tidak valid: ' . $e->getMessage());
            return response()->json(['message' => 'invalid notification'], 400);
        }

        self::applyStatus(
            $notif->order_id,
            $notif->transaction_status,
            $notif->fraud_status ?? null,
        );

        return response()->json(['message' => 'ok']);
    }

    /**
     * Sinkronkan semua transaksi pending/unpaid milik seorang user.
     */
    public static function syncPendingForUser(int $userId): void
    {
        $ids = DB::table('transactions as t')
            ->where('t.user_id', $userId)
            ->where(function ($q) {
                $q->whereIn('t.id', DB::table('trip_orders')
                        ->whereIn('order_status', ['pending', 'unpaid'])
                        ->select('transaction_id'))
                    ->orWhereIn('t.id', DB::table('jastip_orders')
                        ->whereIn('order_status', ['pending', 'unpaid'])
                        ->select('transaction_id'));
            })
            ->pluck('t.id');

        foreach ($ids as $id) {
            self::syncTransaction($id);
        }
    }

    /**
     * Cek status transaksi langsung ke Midtrans lalu sinkronkan ke DB.
     * Dipakai saat membuka halaman Profile History (cocok untuk localhost
     * tanpa webhook publik).
     */
    public static function syncTransaction(string $transactionId): void
    {
        try {
            self::configure();
            $status = (array) \Midtrans\Transaction::status($transactionId);

            self::applyStatus(
                $transactionId,
                $status['transaction_status'] ?? null,
                $status['fraud_status'] ?? null,
            );
        } catch (\Throwable $e) {
            // Transaksi belum ada di Midtrans / network error -> abaikan saja
            Log::info('[MIDTRANS] Gagal sync transaksi ' . $transactionId . ': ' . $e->getMessage());
        }
    }

    /**
     * Petakan status Midtrans -> order_status (paid | pending | unpaid)
     * dan update trip_orders / jastip_orders terkait.
     */
    public static function applyStatus(?string $orderId, ?string $txStatus, ?string $fraudStatus = null): void
    {
        if (! $orderId || ! $txStatus) {
            return;
        }

        $orderStatus = match ($txStatus) {
            'capture'    => $fraudStatus === 'challenge' ? 'pending' : 'paid',
            'settlement' => 'paid',
            'pending'    => 'pending',
            'deny', 'expire', 'cancel', 'failure' => 'unpaid',
            default      => null,
        };

        if (! $orderStatus) {
            return;
        }

        DB::table('trip_orders')
            ->where('transaction_id', $orderId)
            ->update(['order_status' => $orderStatus, 'updated_at' => now()]);

        DB::table('jastip_orders')
            ->where('transaction_id', $orderId)
            ->update(['order_status' => $orderStatus, 'updated_at' => now()]);

        // Saat lunas: buat peserta trip & masukkan pembeli ke grup chat
        if ($orderStatus === 'paid') {
            self::fulfillPaidTripOrders($orderId);
        }
    }

    /**
     * Setelah trip order lunas: buat baris trip_participants (mengurangi kuota)
     * dan masukkan pembeli ke grup chat. Idempotent lewat kolom fulfilled_at.
     */
    private static function fulfillPaidTripOrders(string $transactionId): void
    {
        $orders = DB::table('trip_orders')
            ->where('transaction_id', $transactionId)
            ->where('order_status', 'paid')
            ->whereNull('fulfilled_at')
            ->get();

        foreach ($orders as $order) {
            $participants = json_decode($order->participants ?? '', true);
            $rows = [];

            if (is_array($participants) && count($participants) > 0) {
                foreach ($participants as $p) {
                    $rows[] = [
                        'trip_id'      => $order->trip_id,
                        'full_name'    => mb_substr($p['name'] ?? 'Peserta', 0, 100),
                        'paspor'       => ! empty($p['passport']) ? mb_substr($p['passport'], 0, 12) : null,
                        'phone_number' => mb_substr((string) ($p['phone'] ?? '-'), 0, 15) ?: '-',
                        'nik'          => mb_substr((string) ($p['nik'] ?? '-'), 0, 16) ?: '-',
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ];
                }
            }

            // Fallback bila data peserta kosong: buat sejumlah quantity
            if (empty($rows)) {
                for ($i = 0; $i < (int) $order->quantity; $i++) {
                    $rows[] = [
                        'trip_id'      => $order->trip_id,
                        'full_name'    => 'Peserta ' . ($i + 1),
                        'paspor'       => null,
                        'phone_number' => '-',
                        'nik'          => '-',
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ];
                }
            }

            if (! empty($rows)) {
                DB::table('trip_participants')->insert($rows);
            }

            self::addBuyerToTripGroup((int) $order->trip_id, (int) $order->user_id);

            DB::table('trip_orders')
                ->where('id', $order->id)
                ->update(['fulfilled_at' => now(), 'updated_at' => now()]);
        }
    }

    /**
     * Buat (jika belum ada) grup chat trip & masukkan pembeli + pemandu.
     */
    private static function addBuyerToTripGroup(int $tripId, int $userId): void
    {
        $trip = DB::table('trips')->where('id', $tripId)->first();
        if (! $trip) {
            return;
        }

        $conversation = Conversation::firstOrCreate(
            ['trip_id' => $tripId, 'is_group' => true],
            ['pergi_bareng_id' => null],
        );

        $members  = collect([$userId, $trip->guider_id])->filter()->unique();
        $existing = $conversation->participants()->pluck('users.id');

        foreach ($members->diff($existing) as $uid) {
            $conversation->participants()->attach($uid, ['last_read_at' => now()]);
        }
    }

    private static function configure(): void
    {
        \Midtrans\Config::$serverKey    = config('midtrans.server_key');
        \Midtrans\Config::$isProduction = config('midtrans.is_production', false);
        \Midtrans\Config::$isSanitized  = true;
        \Midtrans\Config::$is3ds        = true;
    }
}
