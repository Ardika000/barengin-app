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
        'track_shared_at',
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
            'track_shared_at'   => 'datetime',
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

    public function scopeOpenForRequests($query)
    {
        return $query
            ->where('jastip_items.status', self::STATUS_PUBLISHED)
            ->where('jastip_items.allow_requests', true)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '>=', \Carbon\Carbon::today());
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    // Sekali dipublish jastiper dianggap sudah berkomitmen, jadi tak bisa dihapus.
    public function canBeDeleted(): bool
    {
        return $this->isDraft();
    }

    // Belum termasuk varian.
    public function totalPrice(): float
    {
        return (float) $this->base_price + (float) $this->jastip_fee;
    }

    // Sisi jastiper: draft -> published -> buy_time -> pickup_time -> finished.
    public static function jastiperStatusOf(?string $status, $endDate, $pickupStartDate, $pickupEndDate = null): string
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
        if ($pickupEndDate && $today->lte(\Carbon\Carbon::parse($pickupEndDate))) {
            return 'pickup_time';
        }
        return 'finished';
    }

    public function jastiperStatus(): string
    {
        return self::jastiperStatusOf(
            $this->status,
            $this->end_date,
            $this->pickup_start_date,
            $this->pickup_end_date,
        );
    }

    // Sisi pembeli: upcoming -> in_order -> in_process -> pickup -> finish.
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

    // Versi SQL dari jastiperStatusOf(); penanganan tanggal NULL harus sama persis.
    public function scopeJastiperStatus($query, ?string $status)
    {
        $today = \Carbon\Carbon::today();

        $orderClosed = function ($q) use ($today) {
            $q->where('jastip_items.status', self::STATUS_PUBLISHED)
                ->where(function ($w) use ($today) {
                    $w->whereNull('end_date')->orWhereDate('end_date', '<', $today);
                });
        };

        $pickupOpened = function ($q) use ($today) {
            $q->where(function ($w) use ($today) {
                $w->whereNull('pickup_start_date')->orWhereDate('pickup_start_date', '<=', $today);
            });
        };

        return match ($status) {
            'draft' => $query->where('jastip_items.status', self::STATUS_DRAFT),
            'published' => $query
                ->where('jastip_items.status', self::STATUS_PUBLISHED)
                ->whereNotNull('end_date')
                ->whereDate('end_date', '>=', $today),
            'buy_time' => $query
                ->tap($orderClosed)
                ->whereNotNull('pickup_start_date')
                ->whereDate('pickup_start_date', '>', $today),
            'pickup_time' => $query
                ->tap($orderClosed)
                ->tap($pickupOpened)
                ->whereNotNull('pickup_end_date')
                ->whereDate('pickup_end_date', '>=', $today),
            'finished' => $query
                ->tap($orderClosed)
                ->tap($pickupOpened)
                ->where(function ($q) use ($today) {
                    $q->whereNull('pickup_end_date')->orWhereDate('pickup_end_date', '<', $today);
                }),
            default => $query,
        };
    }

    public function scopeActiveWindow($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('end_date')->orWhereDate('end_date', '>=', \Carbon\Carbon::today());
        });
    }

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
