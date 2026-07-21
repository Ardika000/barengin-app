<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Trip extends Model
{
    use HasFactory;

    public const STATUS_DRAFT   = 'draft';
    public const STATUS_CREATED = 'created';
    public const STATUS_ONGOING = 'ongoing';
    public const STATUS_DONE    = 'done';

    public const STATUS_LABELS = [
        self::STATUS_DRAFT   => 'Draf',
        self::STATUS_CREATED => 'Terjadwal',
        self::STATUS_ONGOING => 'Berlangsung',
        self::STATUS_DONE    => 'Selesai',
    ];

    protected $fillable = [
        'guider_id', 'name', 'description', 'people_amount',
        'start_date', 'end_date', 'rating', 'price',
        'image', 'location', 'status', 'current_run_started_at', 'finished_at',
    ];

    protected function casts()
    {
        return [
            'rating' => 'decimal:2',
            'price' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'current_run_started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function guider()
    {
        return $this->belongsTo(User::class, 'guider_id');
    }

    public function detail_trips()
    {
        return $this->hasMany(TripActivity::class);
    }

    public function facilities()
    {
        return $this->belongsToMany(Facility::class, 'trip_facilities', 'trip_id', 'facility_id');
    }

    public function trip_orders()
    {
        return $this->hasMany(TripOrder::class);
    }

    public function conversations()
    {
        return $this->hasOne(Conversation::class);
    }

    // FK-nya bernama `trips_id`, bukan `trip_id`.
    public function ratings()
    {
        return $this->hasMany(UserTripRating::class, 'trips_id');
    }

    public function histories()
    {
        return $this->hasMany(TripHistory::class)->orderByDesc('completed_at');
    }

    public function statusLabel(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    public static function statusFromDates($start, $end): string
    {
        $today = Carbon::now()->startOfDay();
        $startDay = Carbon::parse($start)->startOfDay();
        $endDay = Carbon::parse($end)->endOfDay();

        if ($today->lt($startDay)) {
            return self::STATUS_CREATED;
        }
        if ($today->gt($endDay)) {
            return self::STATUS_DONE;
        }
        return self::STATUS_ONGOING;
    }

    // Trip yang diselesaikan manual (finished_at) dilewati, kalau tidak akan
    // ditarik balik ke 'ongoing' karena end_date-nya belum lewat.
    public static function refreshStatuses(): int
    {
        $changed = 0;
        self::where('status', '!=', self::STATUS_DRAFT)
            ->whereNull('finished_at')
            ->get()->each(function ($trip) use (&$changed) {
            $expected = self::statusFromDates($trip->start_date, $trip->end_date);
            if ($trip->status !== $expected) {
                $trip->status = $expected;
                $trip->save();
                $changed++;
            }
        });
        return $changed;
    }
}
