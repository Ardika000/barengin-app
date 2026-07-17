<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasUlids;
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $fillable = ['user_id', 'total_amount', 'type', 'payment_method', 'snap_token', 'va_number', 'expired_at'];

    protected function casts(){
        return [
            'total_amount' => 'decimal:2',
            'expired_at' => 'datetime'
        ];
    }

    public function user(){
        return $this->belongsTo(User::class, 'user_id');
    }

    public function trip_order(){
        return $this->hasOne(TripOrder::class);
    }

    public function jastip_order(){
        return $this->hasOne(JastipOrder::class);
    }

    public function split_bill_share(){
        return $this->hasOne(SplitBillShare::class);
    }
}
