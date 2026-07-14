<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jastip extends Model
{
    protected $fillable = ['user_id', 'title', 'origin_city', 'destination_city', 'pickup_location', 'arrival_date', 'start_date', 'end_date', 'allow_pickup', 'allow_delivery', 'allow_requests'];

    protected function casts(){
        return [
            'arrival_date' => 'date',
            'start_date' => 'date',
            'end_date' => 'date',
            'allow_pickup' => 'boolean',
            'allow_delivery' => 'boolean',
            'allow_requests' => 'boolean',
        ];
    }

    public function user(){
        return $this->belongsTo(User::class, 'user_id');
    }

    public function jastip_items(){
        return $this->hasMany(JastipItem::class);
    }

    public function jastip_requests(){
        return $this->hasMany(JastipRequest::class);
    }

    /** Destinasi yang masih menerima request titipan (belum lewat batas beli). */
    public function scopeOpenForRequests($query)
    {
        return $query
            ->where('allow_requests', true)
            ->whereDate('end_date', '>=', \Carbon\Carbon::today());
    }
}
