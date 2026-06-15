<?php

namespace Database\Seeders;

use App\Models\FinancingEstimate;
use App\Models\PergiBareng;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class FinancingEstimateSeeder extends Seeder
{
    public function run(): void
    {
        $trips = PergiBareng::query()->get();

        if($trips->isEmpty()){
            $this->command?->warn('FinancingEstimateSeeder: tidak ada data pergi_barengs. Jalankan PergiBarengSeeder dulu.');
            return;
        }

        foreach ($trips as $trip) {
            // Contoh rule sederhana: item pembiayaan tergantung transportasi
            $items = match ($trip->transportation) {
                'Mobil Pribadi' => ['Tol', 'Bensin', 'Parkir'],
                'Sewa Mobil' => ['Sewa Kendaraan', 'Bensin', 'Tol', 'Parkir'],
                'Transportasi Umum' => ['Tiket', 'Transit', 'Makan/Minum'],
                'Transportasi Online' => ['Ongkos Perjalanan', 'Makan/Minum'],
                default => ['Makan/Minum'],
            };

            foreach ($items as $name) {
                FinancingEstimate::create([
                    'pergi_bareng_id' => $trip->id,
                    'name' => $name,
                ]);
            }
        }

        $this->command?->info('FinancingEstimateSeeder: financing estimates berhasil dibuat.');
    }
}
