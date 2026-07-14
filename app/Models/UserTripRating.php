<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Rating sebuah trip dari peserta (tabel user_trip_ratings).
 * Catatan: kolom FK-nya bernama `trips_id` (bukan trip_id).
 */
class UserTripRating extends Model
{
    protected $table = 'user_trip_ratings';

    protected $fillable = [
        'user_id', 'trips_id', 'rating_amount', 'comment',
    ];

    protected function casts()
    {
        return [
            'rating_amount' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function trip()
    {
        return $this->belongsTo(Trip::class, 'trips_id');
    }
}
