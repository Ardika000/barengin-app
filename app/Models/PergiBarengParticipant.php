<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PergiBarengParticipant extends Model
{
    protected $fillable = [
        'pergi_bareng_id',
        'user_id',
        'full_name',
        'birth_date', 
        'paspor',
        'phone_number',
        'nik',
    ];

    public function user(){
        return $this->belongsTo(User::class, 'user_id');
    }

    public function pergi_bareng(){
        return $this->belongsTo(PergiBareng::class ,'pergi_bareng_id');
    }
}