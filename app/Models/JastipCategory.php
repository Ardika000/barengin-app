<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JastipCategory extends Model
{
    protected $fillable = ['name', 'slug'];

    public function jastip_items()
    {
        return $this->hasMany(JastipItem::class, 'jastip_category_id');
    }
}
