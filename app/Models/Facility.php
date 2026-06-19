<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Facility extends Model
{
    protected $fillable = ['name', 'slug'];

    public function trip(){
        return $this->belongsToMany(Trip::class, 'trip_facilities');
    }
}
