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
                        ->select('transaction_id'))
                    // Request titipan yang sudah ditawar & sedang menunggu pembayaran
                    ->orWhereIn('t.id', DB::table('jastip_requests')
                        ->where('status', 'quoted')
                        ->whereNotNull('transaction_id')
                        ->select('transaction_id'))
                    // Bagian split bill yang menunggu pembayaran. Penting di
                    // localhost yang tidak punya webhook publik: status baru
                    // tersinkron saat halaman Profile History dibuka.
                    ->orWhereIn('t.id', DB::table('split_bill_shares')
                        ->where('status', 'pending')
                        ->whereNotNull('transaction_id')
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

        // Pesanan yang sudah di-refund (jastip dihapus jastiper) tidak boleh
        // "hidup lagi" karena webhook/sync yang datang terlambat.
        DB::table('jastip_orders')
            ->where('transaction_id', $orderId)
            ->where('order_status', '!=', 'refunded')
            ->update(['order_status' => $orderStatus, 'updated_at' => now()]);

        // Request titipan: hanya request yang masih 'quoted' yang bisa berubah —
        // paid → tandai dibayar; gagal/kedaluwarsa → lepaskan transaksi agar
        // pemohon bisa mencoba membayar lagi dengan transaksi baru.
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

        // Bagian split bill: lunas → catat & isi dompet penyelenggara; gagal →
        // lepaskan transaksinya agar anggota bisa membayar ulang.
        if ($orderStatus === 'paid') {
            self::settleSplitBillShare($orderId);
        } elseif ($orderStatus === 'unpaid') {
            DB::table('split_bill_shares')
                ->where('transaction_id', $orderId)
                ->where('status', 'pending')
                ->update(['transaction_id' => null, 'status' => 'unpaid', 'updated_at' => now()]);
        }

        // Saat lunas: buat peserta trip & masukkan pembeli ke grup chat
        if ($orderStatus === 'paid') {
            self::fulfillPaidTripOrders($orderId);
            self::notifyPaid($orderId);
            self::notifySellersOfPaidJastip($orderId);
        }
    }

    /**
     * Kabari jastiper bahwa produknya terbayar — aba-abanya untuk mulai belanja.
     *
     * Satu pesanan bisa memuat produk dari beberapa jastiper, jadi dikelompokkan
     * per penjual dan kunci dedupe-nya per (transaksi x penjual): setiap jastiper
     * dapat tepat satu notifikasi walau applyStatus() dipanggil berulang.
     */
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

    /**
     * Kabari pembeli bahwa transaksinya lunas.
     *
     * Transaksi adalah jangkar yang sama untuk semua jenis pesanan (trip, jastip,
     * split bill), jadi satu notifikasi per transaksi sudah mewakili semuanya.
     *
     * Kunci dedupe WAJIB: applyStatus() dipanggil ulang oleh webhook Midtrans
     * (yang memang mengirim berkali-kali) dan oleh syncPendingForUser() setiap
     * halaman Profile History dibuka. Tanpa kunci ini pembeli akan dibanjiri
     * notifikasi "lunas" yang sama.
     */
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

    /**
     * Tandai bagian split bill lunas lalu tambahkan nominalnya ke dompet
     * penyelenggara. Uangnya sendiri masuk ke akun Midtrans platform; dompet
     * mencatat berapa yang menjadi hak penyelenggara.
     *
     * Idempotent: notifikasi Midtrans bisa datang berkali-kali untuk transaksi
     * yang sama, jadi share yang sudah lunas dilewati dan Wallet::credit()
     * menolak kredit ganda dari sumber yang sama.
     */
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

        // Penyelenggara dikabari bahwa bagian ini masuk ke dompetnya. Aman dari
        // duplikat lewat dedupe_key + penjaga status PAID di atas.
        \App\Models\UserNotification::send(
            (int) $bill->creator_id,
            'split_bill.settled',
            [
                'title' => $bill->title,
                'amount' => (float) $share->amount,
                'payer' => \App\Models\User::find($share->user_id)?->full_name,
            ],
            '/profile-history',
            'split_bill.settled:share:' . $share->id,
        );

        $bill->refreshStatus();
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

            // Pemandu tidak perlu dikabari soal grup trip-nya sendiri.
            if ((int) $uid !== (int) $trip->guider_id) {
                \App\Models\UserNotification::send(
                    (int) $uid,
                    'group.joined',
                    ['name' => $trip->name, 'kind' => 'trip'],
                    '/chat?conversation=' . $conversation->id,
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
