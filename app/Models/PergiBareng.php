<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class PergiBareng extends Model
{

    protected $fillable = ['initiator_id', 'name', 'description', 'time_appointment', 'transportation', 'people_amount', 'departure_loc', 'destination_loc', 'img_name', 'finished_at'];

    /**
     * Status berdasarkan waktu janji (tak ada tanggal selesai terpisah):
     *  - will_start : sebelum JAM janji (bukan sekadar sebelum harinya)
     *  - ongoing    : sejak jam janji, dan TETAP berlangsung sampai penyelenggara
     *                 menekan "Selesaikan"
     *  - finish     : hanya setelah penyelenggara menyelesaikannya (`finished_at`)
     *
     * Divalidasi hingga jam, bukan hanya tanggal: perjalanan pukul 23:40 baru
     * "berlangsung" pada 23:40, bukan sejak 00:00 hari itu.
     *
     * TIDAK ADA transisi otomatis ke `finish` di tengah malam — satu-satunya
     * jalan menuju selesai adalah penyelenggara mengisi `finished_at`. Selama itu
     * belum terjadi, perjalanan tetap `ongoing` walau harinya sudah lewat.
     */
    public function status(): string
    {
        if ($this->finished_at) {
            return 'finish';
        }

        if (! $this->time_appointment) {
            return 'will_start';
        }

        // Belum sampai jam keberangkatan → masih menunggu; sejak jam itu →
        // berlangsung, tanpa batas akhir otomatis.
        return Carbon::now()->lt(Carbon::parse($this->time_appointment))
            ? 'will_start'
            : 'ongoing';
    }

    protected function casts(){
        return [
            'time_appointment'=> 'datetime',
            'finished_at' => 'datetime',
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
