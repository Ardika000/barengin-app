<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Arsip periode (run) sebelumnya dari sebuah trip yang dibuka ulang.
 */
class TripHistory extends Model
{
    protected $fillable = [
        'trip_id', 'start_date', 'end_date', 'joined_count', 'revenue', 'completed_at',
    ];

    protected function casts()
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'revenue' => 'decimal:2',
            'completed_at' => 'datetime',
        ];
    }

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
}
