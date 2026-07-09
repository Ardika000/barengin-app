<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JastipItemVariant extends Model
{
    protected $fillable = [
        'jastip_item_id', 'var_name', 'var_value', 'additional_price',
        'stock', 'min_buy', 'image_name',
    ];

    protected function casts()
    {
        return [
            'additional_price' => 'decimal:2',
        ];
    }

    public function jastip_item()
    {
        return $this->belongsTo(JastipItem::class);
    }

    public function jastip_order_items()
    {
        return $this->hasMany(JastipOrderItem::class);
    }
}
