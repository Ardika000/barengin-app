<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Favorite extends Model
{
    public const TYPE_TRIP = 'trip';
    public const TYPE_PERGI_BARENG = 'pergi_bareng';

    protected $fillable = ['user_id', 'favoritable_type', 'favoritable_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
