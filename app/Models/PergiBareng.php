<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PergiBareng extends Model
{      
    
    protected $fillable = ['initiator_id', 'name', 'description', 'time_appointment', 'transportation', 'people_amount', 'departure_loc', 'destination_loc', 'img_name'];

    protected function casts(){
        return [
            'time_appointment'=> 'datetime'
        ];
    }

    public function initiator(){
        return $this->belongsTo(User::class, 'initiator_id');
    }

    public function pergi_bareng_participants(){
        return $this->hasMany(PergiBarengParticipant::class);
    }

    public function financing_estimate(){
        return $this->hasMany(FinancingEstimate::class);
    }

    public function pergi_bareng_requests(){
        return $this->hasMany(PergiBarengRequest::class);
    }

    public function conversations(){
        return $this->hasOne(Conversation::class);
    }

}
