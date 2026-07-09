<?php

namespace Database\Seeders;

use App\Models\JastipCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class JastipCategorySeeder extends Seeder
{
    public function run(): void
    {
        // Kategori barang jastip — hanya nama + slug (identifier unik), tanpa ikon/emoji.
        $names = [
            'Fashion',
            'Sepatu',
            'Tas & Dompet',
            'Jam Tangan',
            'Perhiasan',
            'Skincare & Kecantikan',
            'Parfum',
            'Makanan & Minuman',
            'Elektronik',
            'Gadget & Aksesoris',
            'Hobi & Koleksi',
            'Mainan & Games',
            'Olahraga',
            'Kesehatan',
            'Ibu & Bayi',
        ];

        foreach ($names as $name) {
            JastipCategory::updateOrCreate(
                ['name' => $name],
                ['slug' => Str::slug($name)],
            );
        }

        $this->command?->info('JastipCategorySeeder: ' . count($names) . ' kategori dibuat.');
    }
}
