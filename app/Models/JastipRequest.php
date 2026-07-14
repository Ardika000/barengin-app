<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Permintaan titipan (request barang di luar katalog) ke seorang jastiper,
 * terikat ke satu destinasi/trip jastiper (model Jastip).
 */
class JastipRequest extends Model
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_QUOTED    = 'quoted';
    public const STATUS_PAID      = 'paid';
    public const STATUS_REJECTED  = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'jastip_id', 'user_id', 'item_name', 'description', 'quantity',
        'budget', 'note', 'image_name', 'status',
        'quoted_item_price', 'quoted_fee', 'quoted_at', 'transaction_id',
    ];

    protected function casts()
    {
        return [
            'budget'            => 'decimal:2',
            'quoted_item_price' => 'decimal:2',
            'quoted_fee'        => 'decimal:2',
            'quoted_at'         => 'datetime',
        ];
    }

    public function jastip()
    {
        return $this->belongsTo(Jastip::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Total penawaran = (harga barang × qty) + biaya jastip. */
    public function quotedTotal(): float
    {
        return (float) $this->quoted_item_price * (int) $this->quantity + (float) $this->quoted_fee;
    }
}
