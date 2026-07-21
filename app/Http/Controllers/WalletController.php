<?php

namespace App\Http\Controllers;

use App\Models\Wallet;
use App\Models\WalletTopup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Isi saldo dompet lewat Midtrans Snap.
 *
 * Nomor rekening (VA BCA) yang ditampilkan di halaman dompet adalah identitas
 * tetap milik pengguna; uang sungguhan tetap masuk lewat Snap, lalu dikreditkan
 * ke dompet saat transaksinya lunas (lihat MidtransController::settleWalletTopup).
 */
class WalletController extends Controller
{
    /** Batas isi saldo sekali jalan - Midtrans menolak nominal < Rp1. */
    private const MIN_TOPUP = 10000;
    private const MAX_TOPUP = 10000000;

    public function topUp(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:' . self::MIN_TOPUP, 'max:' . self::MAX_TOPUP],
        ], [
            'amount.min' => 'Minimal isi saldo Rp' . number_format(self::MIN_TOPUP, 0, ',', '.') . '.',
            'amount.max' => 'Maksimal isi saldo Rp' . number_format(self::MAX_TOPUP, 0, ',', '.') . '.',
        ]);

        $wallet = Wallet::forUser((int) $user->id);
        $amount = (int) $data['amount'];
        $transactionId = (string) Str::uuid();

        try {
            DB::transaction(function () use ($transactionId, $user, $amount, $wallet) {
                DB::table('transactions')->insert([
                    'id'             => $transactionId,
                    'user_id'        => $user->id,
                    'total_amount'   => $amount,
                    'type'           => 'wallet_topup',
                    'payment_method' => 'Midtrans',
                    'expired_at'     => now()->addHours(24),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                WalletTopup::create([
                    'wallet_id'      => $wallet->id,
                    'transaction_id' => $transactionId,
                    'amount'         => $amount,
                    'status'         => WalletTopup::STATUS_PENDING,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('[BARENGIN] Gagal insert transaksi isi saldo: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal menyimpan transaksi.'], 500);
        }

        \Midtrans\Config::$serverKey    = config('midtrans.server_key');
        \Midtrans\Config::$isProduction = config('midtrans.is_production', false);
        \Midtrans\Config::$isSanitized  = true;
        \Midtrans\Config::$is3ds        = true;

        $params = [
            'transaction_details' => [
                'order_id'     => $transactionId,
                'gross_amount' => $amount,
            ],
            'item_details' => [[
                'id'       => 'WALLET-TOPUP',
                'price'    => $amount,
                'quantity' => 1,
                'name'     => 'Isi Saldo Dompet',
            ]],
            'customer_details' => [
                'first_name' => $user->full_name ?? 'Pengguna',
                'email'      => $user->email,
                'phone'      => $user->phone ?? '08000000000',
            ],
            // URL tujuan setelah pembayaran untuk channel yang REDIRECT keluar
            // halaman (VA, sebagian e-wallet). WAJIB di-set: tanpa ini Midtrans
            // memakai "Finish Redirect URL" default dashboard - yang bisa mengarah
            // ke halaman trip success, sehingga isi saldo malah mendarat di sana.
            // Channel popup tetap ditangani callback JS (onSuccess) di WalletCard.
            'callbacks' => [
                'finish' => route('profile-history'),
            ],
        ];

        try {
            $snapToken = \Midtrans\Snap::getSnapToken($params);

            DB::table('transactions')->where('id', $transactionId)->update([
                'snap_token' => $snapToken,
                'updated_at' => now(),
            ]);

            return response()->json([
                'snap_token'     => $snapToken,
                'transaction_id' => $transactionId,
            ]);
        } catch (\Throwable $e) {
            // Rollback bila Midtrans gagal agar tidak ada topup menggantung.
            WalletTopup::where('transaction_id', $transactionId)->delete();
            DB::table('transactions')->where('id', $transactionId)->delete();

            Log::error('[BARENGIN] Gagal Snap Token isi saldo: ' . $e->getMessage());

            return response()->json([
                'error'  => 'Gagal menghubungi Midtrans.',
                'detail' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
