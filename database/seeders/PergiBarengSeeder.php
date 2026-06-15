<?php

namespace Database\Seeders;

use App\Models\PergiBareng;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class PergiBarengSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get beberapa user untuk jadi initiator
        $users = User::where('id', '>=', 1)->take(5)->get();

        if ($users->isEmpty()) {
            if(method_exists(User::class, 'factory')){
                $users = User::factory(5)->create();
            }else{
                $this->command?->warn('Users table kosong dan UserFactory tidak ditemukan. Jalankan UsersSeeder dulu.');
                return;
            }
        }

        $trips = [
            [
                'name' => 'Bandara Soekarno Hatta ke Bandung',
                'description' => 'Halo guys! Aku sedang mencari teman barengan untuk perjalanan ke kota bandung. Kondisi mobil bersih dan nyaman. Ayo pergi bareng!',
                'departure_loc' => 'Bandara Soekarno Hatta, Jakarta',
                'destination_loc' => 'Bandung',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 5,
                'time_appointment' => Carbon::now()->setTime(14, 0), // Hari ini jam 14:00
                'img_name' => 'bus-1.jpg',
            ],
            [
                'name' => 'Jakarta ke Puncak via Bogor',
                'description' => 'Perjalanan wisata ke Puncak dengan nikmati pemandangan alam yang indah. Mobil terawat, perjalanan santai dan aman.',
                'departure_loc' => 'Sentul City, Jakarta',
                'destination_loc' => 'Puncak, Bogor',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 4,
                'time_appointment' => Carbon::now()->addHours(3)->setTime(15, 0), // Hari ini jam 15:00
                'img_name' => 'bus-2.jpg',
            ],
            [
                'name' => 'Tangerang ke Bandung - Trip Belanja',
                'description' => 'Liburan belanja ke Bandung Factory Outlet. Semua diatur rapih, parkir aman, dan banyak snack di perjalanan!',
                'departure_loc' => 'Tangerang City',
                'destination_loc' => 'Bandung Factory Outlet',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 6,
                'time_appointment' => Carbon::now()->addDays(1)->setTime(8, 30), // Besok jam 8:30
                'img_name' => 'bus-3.jpg',
            ],
            [
                'name' => 'Jakarta ke Pelabuhan Ratu',
                'description' => 'Liburan pantai ke Pelabuhan Ratu, Sukabumi. Pemandangan sunset yang cantik, pantai sepi dan asri. Yuk ikutan!',
                'departure_loc' => 'Blok M, Jakarta',
                'destination_loc' => 'Pelabuhan Ratu, Sukabumi',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 5,
                'time_appointment' => Carbon::now()->addDays(3)->setTime(6, 0),
                'img_name' => 'bus-4.jpg',
            ],
            [
                'name' => 'Depok ke Cianjur - Agro Wisata',
                'description' => 'Kunjungi kebun strawberry dan agro wisata Cianjur. Memetik buah sendiri, suasana segar, dan pemandangan sawah yang hijau.',
                'departure_loc' => 'Depok',
                'destination_loc' => 'Cianjur',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 5,
                'time_appointment' => Carbon::now()->addDays(4)->setTime(7, 30),
                'img_name' => 'bus-5.jpg',
            ],
            [
                'name' => 'Jakarta ke Anyer - Pantai & Hot Spring',
                'description' => 'Weekend getaway ke Anyer! Nikmati pantai, kolam air panas alami, dan kuliner seafood segar. Perjalanan santai, suasana asik!',
                'departure_loc' => 'Kota Jakarta',
                'destination_loc' => 'Anyer, Banten',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 6,
                'time_appointment' => Carbon::now()->addDays(5)->setTime(6, 30),
                'img_name' => 'bus-6.jpg',
            ],
            [
                'name' => 'Bekasi ke Cirebon - Kuliner & Budaya',
                'description' => 'Jelajahi Kota Cirebon yang penuh sejarah! Coba makanan lokal enak, kunjungi masjid Raya yang indah, dan beli oleh-oleh.',
                'departure_loc' => 'Bekasi',
                'destination_loc' => 'Cirebon',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 5,
                'time_appointment' => Carbon::now()->addDays(6)->setTime(7, 0),
                'img_name' => 'bus-7.jpg',
            ],
            [
                'name' => 'Jakarta ke Krakatau - Petualangan Ekstrim',
                'description' => 'Petualangan seru ke Krakatau! Naik mobil, snorkeling, dan lihat keindahan alam Krakatau yang menakjubkan. Hanya untuk yang berani!',
                'departure_loc' => 'Pelabuhan Bakauheni',
                'destination_loc' => 'Krakatau, Selat Sunda',
                'transportation' => 'Sewa Mobil',
                'people_amount' => 8,
                'time_appointment' => Carbon::now()->addDays(7)->setTime(5, 0),
                'img_name' => 'bus-8.jpg',
            ],
            [
                'name' => 'Bogor ke Carita - Pantai Eksotis',
                'description' => 'Pantai Carita yang indah dengan pasir putih dan ombak yang oke untuk surfing. Pemandangan bintang malam yang spektakuler!',
                'departure_loc' => 'Bogor',
                'destination_loc' => 'Carita, Banten',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 4,
                'time_appointment' => Carbon::now()->addDays(5)->setTime(8, 0),
                'img_name' => 'bus-9.jpg',
            ],
            [
                'name' => 'Tangsel ke Tanjung Lesung - Resort Mewah',
                'description' => 'Weekend di resort mewah Tanjung Lesung! Pantai private, hotel bintang 4, dan all-inclusive package. Puas dijamin!',
                'departure_loc' => 'Tangerang Selatan',
                'destination_loc' => 'Tanjung Lesung',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 4,
                'time_appointment' => Carbon::now()->addDays(8)->setTime(9, 0),
                'img_name' => 'bus-10.jpg',
            ],
        ];

        foreach ($trips as $index => $trip) {
            // Assign random user sebagai initiator
            $trip['initiator_id'] = $users[$index % count($users)]->id;

            PergiBareng::create($trip);
        }

        $this->command?->info('PergiBareng seeder telah berhasil di-generate dengan 10 data!');
    }
}
