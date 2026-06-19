<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserRating extends Model
{
    protected $table = 'user_ratings';
    protected $fillable = ['user_id', 'rated_user_id', 'type', 'rating_amount', 'comment'];

    protected function casts(){
        return [
            'rating_amount' => 'decimal:2'
        ];
    }

    public function user(){
        return $this->belongsTo(User::class, 'user_id');
    }

    public function rated_user(){
        return $this->belongsTo(User::class, 'rated_user_id');
    }

}
