<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Trip extends Model
{
    use HasFactory;
    protected $fillable = ['name', 'description', 'people_amount', 'start_date', 'end_date', 'rating', 'price'];
    protected function casts()
    {
        return [
            'rating' => 'decimal:2',
            'price' => 'decimal:2'
        ];
    }

    public function detail_trips()
    {
        return $this->hasMany(TripActivity::class);
    }

    public function facilities()
    {
        return $this->belongsToMany(TripFacility::class, 'trip_facilities', 'trip_id', 'facility_id');
    }

    public function trip_orders()
    {
        return $this->hasMany(TripOrder::class);
    }

    public function conversations()
    {
        return $this->hasOne(Conversation::class);
    }
}
