<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jastip extends Model
{
    protected $fillable = ['user_id', 'origin_city', 'destination_city', 'pickup_location', 'arrival_date', 'start_date', 'end_date', 'allow_pickup', 'allow_delivery'];

    protected function casts(){
        return [
            'arrival_date' => 'date',
            'start_date' => 'date',
            'end_date' => 'date'
        ];
    }

    public function user(){
        return $this->belongsTo(User::class, 'user_id');
    }

    public function jastip_items(){
        return $this->hasMany(JastipItem::class);
    }
}
