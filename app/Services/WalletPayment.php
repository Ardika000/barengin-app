<?php

namespace App\Services;

use App\Http\Controllers\MidtransController;
use App\Models\Wallet;
use Illuminate\Support\Facades\Log;

// Bayar pakai saldo dompet. Pelunasannya sengaja menumpang applyStatus() milik
// Midtrans supaya efek sampingnya lewat jalur yang sama persis.
class WalletPayment
{
    // False = sumbernya sudah pernah didebit. Pelunasan tetap jalan supaya pesanan
    // tak menggantung padahal uangnya sudah diambil.
    public function settle(
        int $userId,
        string $transactionId,
        float $amount,
        string $description,
        string $sourceType,
        int $sourceId,
    ): bool {
        $debited = Wallet::forUser($userId)->debit($amount, $description, $sourceType, $sourceId);

        if (! $debited) {
            Log::warning('Pembayaran saldo: sumber ini sudah pernah didebit, saldo tidak dipotong lagi.', [
                'user_id' => $userId,
                'transaction_id' => $transactionId,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'amount' => $amount,
            ]);
        }

        MidtransController::applyStatus($transactionId, 'settlement');

        return $debited;
    }
}
