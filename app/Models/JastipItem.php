<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JastipItem extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'user_id', 'jastip_id', 'jastip_category_id', 'name', 'description',
        'pickup_province', 'pickup_city', 'pickup_address',
        'purchase_province', 'purchase_city', 'purchase_address',
        'max_slot', 'base_price', 'jastip_fee', 'min_buy', 'has_variants', 'weight_gram',
        'status', 'allow_requests', 'start_date', 'end_date', 'pickup_start_date', 'pickup_end_date',
    ];

    protected function casts()
    {
        return [
            'base_price'   => 'decimal:2',
            'jastip_fee'   => 'decimal:2',
            'weight_gram'  => 'decimal:2',
            'has_variants' => 'boolean',
            'allow_requests' => 'boolean',
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

    public function jastip_requests()
    {
        return $this->hasMany(JastipRequest::class);
    }

    /**
     * Item yang menerima request titipan & masih terbuka untuk memesan:
     * published, allow_requests aktif, dan batas pemesanan belum lewat.
     */
    public function scopeOpenForRequests($query)
    {
        return $query
            ->where('jastip_items.status', self::STATUS_PUBLISHED)
            ->where('jastip_items.allow_requests', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '>=', \Carbon\Carbon::today());
    }

    // ── Helpers ──────────────────────────────────────────────

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    /**
     * Jastip boleh dihapus selama belum memasuki H-1 batas pemesanan.
     * Draft selalu boleh; published diblokir mulai (end_date - 1 hari),
     * yang sekaligus memblokir fase buy_time/finished.
     */
    public function canBeDeleted(): bool
    {
        if ($this->isDraft()) {
            return true;
        }
        if (! $this->end_date) {
            return false;
        }

        return \Carbon\Carbon::today()->lt(
            \Carbon\Carbon::parse($this->end_date)->subDay()->startOfDay()
        );
    }

    /** Harga total = harga dasar + biaya jastip (belum termasuk varian). */
    public function totalPrice(): float
    {
        return (float) $this->base_price + (float) $this->jastip_fee;
    }

    /**
     * Status untuk jastiper (pemilik jastip), 4 tahap:
     *  - draft     : masih draft
     *  - published : masa pemesanan masih buka (hari ini <= end_date)
     *  - buy_time  : masa pemesanan tutup, sebelum pengambilan dibuka
     *                (setelah end_date, sebelum pickup_start_date) → saatnya membelikan
     *  - finished  : sudah masuk/melewati masa pengambilan → bisa di-reopen
     */
    public static function jastiperStatusOf(?string $status, $endDate, $pickupStartDate): string
    {
        if ($status === self::STATUS_DRAFT) {
            return 'draft';
        }
        $today = \Carbon\Carbon::today();
        if ($endDate && $today->lte(\Carbon\Carbon::parse($endDate))) {
            return 'published';
        }
        if ($pickupStartDate && $today->lt(\Carbon\Carbon::parse($pickupStartDate))) {
            return 'buy_time';
        }
        return 'finished';
    }

    public function jastiperStatus(): string
    {
        return self::jastiperStatusOf($this->status, $this->end_date, $this->pickup_start_date);
    }

    /**
     * Status siklus hidup jastip (untuk badge & kelayakan ulasan):
     *  - upcoming    : belum dibuka (sebelum start_date)
     *  - in_order    : masa pemesanan (start_date..end_date)
     *  - in_process  : sedang dibelikan jastiper (setelah order, sebelum pickup)
     *  - pickup      : masa pengambilan (pickup_start_date..pickup_end_date)
     *  - finish      : selesai (setelah pickup_end_date) → bisa diulas
     */
    public function lifecycleStatus(): string
    {
        $today = \Carbon\Carbon::today();

        if ($this->start_date && $today->lt(\Carbon\Carbon::parse($this->start_date))) {
            return 'upcoming';
        }
        if ($this->end_date && $today->lte(\Carbon\Carbon::parse($this->end_date))) {
            return 'in_order';
        }
        if ($this->pickup_start_date && $today->lt(\Carbon\Carbon::parse($this->pickup_start_date))) {
            return 'in_process';
        }
        if ($this->pickup_end_date && $today->lte(\Carbon\Carbon::parse($this->pickup_end_date))) {
            return 'pickup';
        }
        return 'finish';
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

    /**
     * Filter status jastiper (draft/published/buy_time/finished) di SQL.
     * Harus mencerminkan jastiperStatusOf() persis, termasuk kasus tanggal NULL:
     * published butuh end_date terisi dan >= hari ini; item published dengan
     * end_date NULL jatuh ke buy_time/finished — sama seperti versi PHP.
     */
    public function scopeJastiperStatus($query, ?string $status)
    {
        $today = \Carbon\Carbon::today();

        return match ($status) {
            'draft' => $query->where('jastip_items.status', self::STATUS_DRAFT),
            'published' => $query
                ->where('jastip_items.status', self::STATUS_PUBLISHED)
                ->whereNotNull('end_date')
                ->whereDate('end_date', '>=', $today),
            'buy_time' => $query
                ->where('jastip_items.status', self::STATUS_PUBLISHED)
                ->where(function ($q) use ($today) {
                    $q->whereNull('end_date')->orWhereDate('end_date', '<', $today);
                })
                ->whereNotNull('pickup_start_date')
                ->whereDate('pickup_start_date', '>', $today),
            'finished' => $query
                ->where('jastip_items.status', self::STATUS_PUBLISHED)
                ->where(function ($q) use ($today) {
                    $q->whereNull('end_date')->orWhereDate('end_date', '<', $today);
                })
                ->where(function ($q) use ($today) {
                    $q->whereNull('pickup_start_date')->orWhereDate('pickup_start_date', '<=', $today);
                }),
            default => $query,
        };
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
