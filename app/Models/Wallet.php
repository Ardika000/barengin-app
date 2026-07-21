<?php

namespace App\Models;

use App\Exceptions\InsufficientBalanceException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Wallet extends Model
{
    protected $fillable = ['user_id', 'balance'];

    protected function casts()
    {
        return ['balance' => 'decimal:2'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function wallet_transactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function wallet_topups()
    {
        return $this->hasMany(WalletTopup::class);
    }

    public static function forUser(int $userId): self
    {
        return self::firstOrCreate(['user_id' => $userId], ['balance' => 0]);
    }

    public function hasSufficientBalance(float $amount): bool
    {
        return (float) $this->balance >= $amount;
    }

    // Idempotent per (source_type, source_id): webhook Midtrans bisa datang berulang.
    public function credit(float $amount, string $description, ?string $sourceType = null, ?int $sourceId = null): bool
    {
        return DB::transaction(function () use ($amount, $description, $sourceType, $sourceId) {
            if ($sourceType && $sourceId) {
                $exists = WalletTransaction::where('source_type', $sourceType)
                    ->where('source_id', $sourceId)
                    ->where('type', 'credit')
                    ->lockForUpdate()
                    ->exists();

                if ($exists) {
                    return false;
                }
            }

            WalletTransaction::create([
                'wallet_id' => $this->id,
                'type' => 'credit',
                'amount' => $amount,
                'description' => $description,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
            ]);

            $this->newQuery()->whereKey($this->id)->increment('balance', $amount);
            $this->refresh();

            $this->notifyBalanceChange('wallet.credited', $amount, $description, $sourceType, $sourceId);

            return true;
        });
    }

    // Idempotent per sumber, sama seperti credit().
    public function debit(float $amount, string $description, ?string $sourceType = null, ?int $sourceId = null): bool
    {
        return DB::transaction(function () use ($amount, $description, $sourceType, $sourceId) {
            if ($sourceType && $sourceId) {
                $exists = WalletTransaction::where('source_type', $sourceType)
                    ->where('source_id', $sourceId)
                    ->where('type', 'debit')
                    ->lockForUpdate()
                    ->exists();

                if ($exists) {
                    return false;
                }
            }

            // Dikunci biar dua request bersamaan tak membelanjakan saldo yang sama.
            $fresh = self::whereKey($this->id)->lockForUpdate()->first();

            if (! $fresh || (float) $fresh->balance < $amount) {
                throw new InsufficientBalanceException(
                    'Saldo dompet tidak mencukupi.',
                    (float) ($fresh->balance ?? 0),
                    $amount,
                );
            }

            WalletTransaction::create([
                'wallet_id' => $this->id,
                'type' => 'debit',
                'amount' => $amount,
                'description' => $description,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
            ]);

            $this->newQuery()->whereKey($this->id)->decrement('balance', $amount);
            $this->refresh();

            $this->notifyBalanceChange('wallet.debited', $amount, $description, $sourceType, $sourceId);

            return true;
        });
    }

    // Dipanggil dari credit()/debit(), bukan dari pemanggilnya, biar tak ada yang lolos.
    private function notifyBalanceChange(
        string $type,
        float $amount,
        string $description,
        ?string $sourceType,
        ?int $sourceId,
    ): void {
        UserNotification::send(
            (int) $this->user_id,
            $type,
            [
                'amount' => $amount,
                'name' => $description,
                'balance' => (float) $this->balance,
            ],
            '/profile-history',
            $sourceType && $sourceId
                ? $type . ':' . $sourceType . ':' . $sourceId
                : null,
        );
    }
}
