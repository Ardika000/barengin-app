<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $fillable = ['wallet_id', 'type', 'amount', 'description', 'source_type', 'source_id'];

    protected function casts()
    {
        return ['amount' => 'decimal:2'];
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }
}
