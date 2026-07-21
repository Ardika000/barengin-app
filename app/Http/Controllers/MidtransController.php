<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MidtransController extends Controller
{
    // Webhook Midtrans; URL-nya didaftarkan di dashboard: {APP_URL}/midtrans/notification
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
                        ->select('transaction_id'))
                    ->orWhereIn('t.id', DB::table('jastip_requests')
                        ->where('status', 'quoted')
                        ->whereNotNull('transaction_id')
                        ->select('transaction_id'))
                    ->orWhereIn('t.id', DB::table('split_bill_shares')
                        ->where('status', 'pending')
                        ->whereNotNull('transaction_id')
                        ->select('transaction_id'))
                    ->orWhereIn('t.id', DB::table('wallet_topups')
                        ->where('status', 'pending')
                        ->select('transaction_id'));
            })
            ->pluck('t.id');

        foreach ($ids as $id) {
            self::syncTransaction($id);
        }
    }

    // Pengganti webhook untuk localhost: dipanggil saat halaman Riwayat dibuka.
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
            // Transaksi belum ada di Midtrans / network error, abaikan.
            Log::info('[MIDTRANS] Gagal sync transaksi ' . $transactionId . ': ' . $e->getMessage());
        }
    }

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

        // Order refund jangan "hidup lagi" gara-gara webhook telat.
        DB::table('jastip_orders')
            ->where('transaction_id', $orderId)
            ->where('order_status', '!=', 'refunded')
            ->update(['order_status' => $orderStatus, 'updated_at' => now()]);

        // Transaksi dilepas saat gagal biar pemohon bisa bayar ulang.
        if ($orderStatus === 'paid') {
            DB::table('jastip_requests')
                ->where('transaction_id', $orderId)
                ->where('status', 'quoted')
                ->update(['status' => 'paid', 'updated_at' => now()]);
        } elseif ($orderStatus === 'unpaid') {
            DB::table('jastip_requests')
                ->where('transaction_id', $orderId)
                ->where('status', 'quoted')
                ->update(['transaction_id' => null, 'updated_at' => now()]);
        }

        if ($orderStatus === 'paid') {
            self::settleSplitBillShare($orderId);
        } elseif ($orderStatus === 'unpaid') {
            DB::table('split_bill_shares')
                ->where('transaction_id', $orderId)
                ->where('status', 'pending')
                ->update(['transaction_id' => null, 'status' => 'unpaid', 'updated_at' => now()]);
        }

        if ($orderStatus === 'paid') {
            self::settleWalletTopup($orderId);
        } elseif ($orderStatus === 'unpaid') {
            DB::table('wallet_topups')
                ->where('transaction_id', $orderId)
                ->where('status', 'pending')
                ->update(['status' => 'unpaid', 'updated_at' => now()]);
        }

        if ($orderStatus === 'paid') {
            self::fulfillPaidTripOrders($orderId);
            self::notifyPaid($orderId);
            self::notifySellersOfPaidJastip($orderId);
        }
    }

    // Idempotent: webhook Midtrans datang berkali-kali untuk transaksi yang sama.
    private static function settleWalletTopup(string $transactionId): void
    {
        $topup = \App\Models\WalletTopup::with('wallet')
            ->where('transaction_id', $transactionId)
            ->first();

        if (! $topup || $topup->status === \App\Models\WalletTopup::STATUS_PAID) {
            return;
        }

        $topup->forceFill(['status' => \App\Models\WalletTopup::STATUS_PAID])->save();

        $topup->wallet?->credit(
            (float) $topup->amount,
            'Isi saldo dompet',
            'wallet_topup',
            (int) $topup->id,
        );
    }

    // Dedupe per (transaksi x penjual) karena applyStatus() dipanggil berulang.
    private static function notifySellersOfPaidJastip(string $transactionId): void
    {
        $rows = DB::table('jastip_orders as jo')
            ->join('jastip_order_items as joi', 'joi.jastip_order_id', '=', 'jo.id')
            ->join('jastip_items as ji', 'ji.id', '=', 'joi.jastip_item_id')
            ->where('jo.transaction_id', $transactionId)
            ->where('jo.order_status', 'paid')
            ->get(['ji.user_id as seller_id', 'ji.name as item_name']);

        foreach ($rows->groupBy('seller_id') as $sellerId => $items) {
            if (! $sellerId) {
                continue;
            }

            \App\Models\UserNotification::send(
                (int) $sellerId,
                'selling.order_paid',
                [
                    'name' => $items->first()->item_name,
                    'more' => max(0, $items->count() - 1),
                ],
                '/admin/jastip',
                'selling.order_paid:trx:' . $transactionId . ':seller:' . $sellerId,
            );
        }
    }

    // Dedupe key wajib: applyStatus() dipanggil ulang tiap webhook & tiap sync.
    private static function notifyPaid(string $transactionId): void
    {
        $trx = DB::table('transactions')->where('id', $transactionId)->first();

        if (! $trx) {
            return;
        }

        \App\Models\UserNotification::send(
            (int) $trx->user_id,
            'payment.paid',
            ['amount' => (float) $trx->total_amount, 'kind' => $trx->type],
            '/profile-history?tab=transactions',
            'payment.paid:trx:' . $transactionId,
        );
    }

    // Uang riilnya ada di akun Midtrans platform, dompet cuma mencatat hak
    // penyelenggara. Idempotent karena webhook bisa datang berkali-kali.
    private static function settleSplitBillShare(string $transactionId): void
    {
        $share = \App\Models\SplitBillShare::with('split_bill')
            ->where('transaction_id', $transactionId)
            ->first();

        if (! $share || $share->status === \App\Models\SplitBillShare::STATUS_PAID) {
            return;
        }

        $bill = $share->split_bill;

        if (! $bill) {
            return;
        }

        $share->forceFill([
            'status' => \App\Models\SplitBillShare::STATUS_PAID,
            'paid_at' => now(),
        ])->save();

        \App\Models\Wallet::forUser((int) $bill->creator_id)->credit(
            (float) $share->amount,
            'Patungan: ' . $bill->title,
            'split_bill_share',
            (int) $share->id,
        );

        // Arahkan ke kartu tagihan di grup; Riwayat Profil cuma cadangan.
        $conversationId = \App\Models\Conversation::where('pergi_bareng_id', $bill->pergi_bareng_id)
            ->where('is_group', true)
            ->value('id');

        \App\Models\UserNotification::send(
            (int) $bill->creator_id,
            'split_bill.settled',
            [
                'title' => $bill->title,
                'amount' => (float) $share->amount,
                'payer' => \App\Models\User::find($share->user_id)?->full_name,
            ],
            $conversationId ? '/chat/' . $conversationId : '/profile-history',
            'split_bill.settled:share:' . $share->id,
        );

        $bill->refreshStatus();
    }

    // Idempotent lewat kolom fulfilled_at.
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

            // Potongan 10.000/kursi = layanan + asuransi milik platform, lihat
            // TripsController::processPayment.
            $trip = DB::table('trips')->where('id', $order->trip_id)->first();
            if ($trip) {
                $platformFee = 10000 * (int) $order->quantity;
                $tripRevenue = max(0.0, (float) $order->total - $platformFee);
                if ($tripRevenue > 0) {
                    \App\Models\Wallet::forUser((int) $trip->guider_id)->credit(
                        $tripRevenue,
                        'Pendapatan trip: ' . $trip->name,
                        'trip_order',
                        (int) $order->id,
                    );
                }
            }

            self::addBuyerToTripGroup((int) $order->trip_id, (int) $order->user_id);

            DB::table('trip_orders')
                ->where('id', $order->id)
                ->update(['fulfilled_at' => now(), 'updated_at' => now()]);
        }
    }

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

            // Pemandu tak perlu dikabari soal grup trip-nya sendiri.
            if ((int) $uid !== (int) $trip->guider_id) {
                \App\Models\UserNotification::send(
                    (int) $uid,
                    'group.joined',
                    ['name' => $trip->name, 'kind' => 'trip'],
                    '/chat/' . $conversation->id,
                    'group.joined:conv:' . $conversation->id . ':user:' . $uid,
                );
            }
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
