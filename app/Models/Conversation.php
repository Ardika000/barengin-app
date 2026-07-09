<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'trip_id', 'pergi_bareng_id', 'jastip_item_id', 'is_group'
    ];

    public function trip(){
        return $this->belongsTo(Trip::class);
    }

    public function pergi_bareng(){
        return $this->belongsTo(PergiBareng::class);
    }

    public function jastip_item(){
        return $this->belongsTo(JastipItem::class);
    }

    public function messages(){
        return $this->hasMany(Message::class);
    }

    public function participants(){
        return $this->belongsToMany(User::class, 'conversation_participants')
            ->withPivot('last_read_at');
    }
}