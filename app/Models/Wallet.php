<?php

namespace App\Models;

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

    /** Dompet milik user, dibuat saat pertama kali dibutuhkan. */
    public static function forUser(int $userId): self
    {
        return self::firstOrCreate(['user_id' => $userId], ['balance' => 0]);
    }

    /**
     * Tambah saldo sekaligus mencatat mutasinya. Idempotent terhadap
     * (source_type, source_id): webhook Midtrans bisa datang berkali-kali untuk
     * pembayaran yang sama, dan saldo tidak boleh bertambah dua kali.
     * Mengembalikan true bila saldo benar-benar bertambah.
     */
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

            return true;
        });
    }
}
