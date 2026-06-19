<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripFacility extends Model
{
    // Pastikan nama tabelnya didefinisikan secara manual jika tidak mengikuti jamak bahasa Inggris (facilities)
    protected $table = 'facilities'; 

    protected $fillable = ['name', 'slug', 'icon'];

    public function trips()
    {
        return $this->belongsToMany(Trip::class, 'trip_facilities', 'facility_id', 'trip_id');
    }
}