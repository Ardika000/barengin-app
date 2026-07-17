<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SplitBillShare extends Model
{
    public const STATUS_UNPAID  = 'unpaid';
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID    = 'paid';

    protected $fillable = ['split_bill_id', 'user_id', 'amount', 'status', 'transaction_id', 'paid_at'];

    protected function casts()
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function split_bill()
    {
        return $this->belongsTo(SplitBill::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
