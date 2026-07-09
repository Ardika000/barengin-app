<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JastipItem extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'user_id', 'jastip_id', 'jastip_category_id', 'name', 'description',
        'pickup_province', 'pickup_city', 'pickup_address',
        'purchase_province', 'purchase_city', 'purchase_address',
        'max_slot', 'base_price', 'jastip_fee', 'min_buy', 'has_variants', 'weight_gram',
        'status', 'start_date', 'end_date', 'pickup_start_date', 'pickup_end_date',
    ];

    protected function casts()
    {
        return [
            'base_price'   => 'decimal:2',
            'jastip_fee'   => 'decimal:2',
            'weight_gram'  => 'decimal:2',
            'has_variants' => 'boolean',
            'start_date'   => 'date',
            'end_date'     => 'date',
            'pickup_start_date' => 'date',
            'pickup_end_date'   => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function jastip()
    {
        return $this->belongsTo(Jastip::class);
    }

    public function category()
    {
        return $this->belongsTo(JastipCategory::class, 'jastip_category_id');
    }

    public function jastip_item_images()
    {
        return $this->hasMany(JastipItemImage::class);
    }

    public function jastip_item_variants()
    {
        return $this->hasMany(JastipItemVariant::class);
    }

    public function jastip_order_items()
    {
        return $this->hasMany(JastipOrderItem::class);
    }

    // ── Helpers ──────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /** Harga total = harga dasar + biaya jastip (belum termasuk varian). */
    public function totalPrice(): float
    {
        return (float) $this->base_price + (float) $this->jastip_fee;
    }

    /**
     * Status jadwal: 'upcoming' (belum dibuka), 'ongoing' (sedang berlangsung),
     * atau 'closed' (sudah lewat batas pemesanan).
     */
    public function scheduleStatus(): string
    {
        $today = \Carbon\Carbon::today();
        if ($this->start_date && $today->lt(\Carbon\Carbon::parse($this->start_date))) {
            return 'upcoming';
        }
        if ($this->end_date && $today->gt(\Carbon\Carbon::parse($this->end_date))) {
            return 'closed';
        }
        return 'ongoing';
    }

    /** Hanya jastip yang masih relevan: sedang berlangsung atau akan dibuka (bukan yang sudah lewat). */
    public function scopeActiveWindow($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('end_date')->orWhereDate('end_date', '>=', \Carbon\Carbon::today());
        });
    }

    /** Filter berdasarkan jadwal: 'ongoing' atau 'upcoming'. */
    public function scopeSchedule($query, ?string $schedule)
    {
        $today = \Carbon\Carbon::today();
        if ($schedule === 'upcoming') {
            return $query->whereNotNull('start_date')->whereDate('start_date', '>', $today);
        }
        if ($schedule === 'ongoing') {
            return $query
                ->where(function ($q) use ($today) {
                    $q->whereNull('start_date')->orWhereDate('start_date', '<=', $today);
                })
                ->where(function ($q) use ($today) {
                    $q->whereNull('end_date')->orWhereDate('end_date', '>=', $today);
                });
        }
        return $query;
    }
}
