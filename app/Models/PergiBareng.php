<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class PergiBareng extends Model
{

    protected $fillable = ['initiator_id', 'name', 'description', 'time_appointment', 'transportation', 'people_amount', 'departure_loc', 'destination_loc', 'img_name', 'finished_at', 'track_shared_at'];

    // Dihitung sampai jam, bukan tanggal. Tidak ada transisi otomatis ke finish,
    // satu-satunya jalan ke sana adalah penyelenggara mengisi finished_at.
    public function status(): string
    {
        if ($this->finished_at) {
            return 'finish';
        }

        if (! $this->time_appointment) {
            return 'will_start';
        }

        return Carbon::now()->lt(Carbon::parse($this->time_appointment))
            ? 'will_start'
            : 'ongoing';
    }

    protected function casts(){
        return [
            'time_appointment'=> 'datetime',
            'finished_at' => 'datetime',
            'track_shared_at' => 'datetime',
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

    public function split_bills(){
        return $this->hasMany(SplitBill::class);
    }

}
