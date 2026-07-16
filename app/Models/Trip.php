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

    /** Label bahasa Indonesia untuk tiap status */
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

    /** Rating trip dari peserta. FK di tabel user_trip_ratings bernama `trips_id`. */
    public function ratings()
    {
        return $this->hasMany(UserTripRating::class, 'trips_id');
    }

    /** Arsip run sebelumnya (dibuat saat re-trip). */
    public function histories()
    {
        return $this->hasMany(TripHistory::class)->orderByDesc('completed_at');
    }

    public function statusLabel(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    /** Status yang seharusnya berdasarkan tanggal trip (untuk trip yang sudah dipublish). */
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

    /**
     * Perbarui status semua trip yang sudah dipublish (bukan draft)
     * mengikuti tanggalnya. Dipakai oleh cron & saat membuka dashboard.
     *
     * Trip yang diselesaikan manual oleh pemandu (`finished_at`) dilewati:
     * tanpa ini, trip yang selesai lebih cepat akan dikembalikan ke 'ongoing'
     * karena end_date-nya belum lewat.
     */
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
