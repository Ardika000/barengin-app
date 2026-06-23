<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    // Izinkan kolom-kolom ini diisi
    protected $fillable = ['name', 'email', 'body'];
}