<?php

namespace Database\Seeders;

use App\Models\Trip;
use App\Models\TripFacility; 
use Illuminate\Database\Seeder;

class TripFacilitySeeder extends Seeder
{
    public function run(): void
    {
        $trips = Trip::all();
        
        // Ambil ID dari Model TripFacility
        $allFacilityIds = TripFacility::pluck('id')->toArray();

        if (empty($allFacilityIds)) {
            $this->command->info('Tabel facilities masih kosong.');
            return;
        }

        foreach ($trips as $index => $trip) {
            // Bersihkan relasi lama agar tidak duplikat
            $trip->facilities()->detach();

            if ($index === 0) {
                // Trip pertama dapet 3 fasilitas (Sesuai gambar desainmu)
                $fasilitasGambar = array_slice($allFacilityIds, 0, 3);
                $trip->facilities()->attach($fasilitasGambar); 
            } 
            elseif ($index === 1) {
                // Trip kedua dapet semua fasilitas
                $trip->facilities()->attach($allFacilityIds);
            }
            elseif ($index === 2) {
                // Trip ketiga kosong (tanpa fasilitas)
            }
            else {
                // Sisanya dapet 1-3 fasilitas acak
                $randomCount = rand(1, min(3, count($allFacilityIds)));
                $randomKeys = array_rand($allFacilityIds, $randomCount);
                $facilitiesToAttach = is_array($randomKeys) ? array_intersect_key($allFacilityIds, array_flip((array)$randomKeys)) : [$allFacilityIds[$randomKeys]];
                
                $trip->facilities()->attach($facilitiesToAttach);
            }
        }
    }
}