<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SplitBill extends Model
{
    protected $fillable = ['pergi_bareng_id', 'creator_id', 'title', 'note', 'total_amount', 'status'];

    protected function casts()
    {
        return ['total_amount' => 'decimal:2'];
    }

    public function pergi_bareng()
    {
        return $this->belongsTo(PergiBareng::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function shares()
    {
        return $this->hasMany(SplitBillShare::class);
    }

    /** Tandai lunas bila tidak ada lagi bagian yang belum dibayar. */
    public function refreshStatus(): void
    {
        $outstanding = $this->shares()->where('status', '!=', SplitBillShare::STATUS_PAID)->exists();
        $status = $outstanding ? 'open' : 'settled';

        if ($this->status !== $status) {
            $this->forceFill(['status' => $status])->save();
        }
    }
}
