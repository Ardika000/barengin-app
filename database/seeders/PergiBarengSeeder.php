<?php

namespace Database\Seeders;

use App\Models\PergiBareng;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PergiBarengSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Gambar relevan dengan destinasi tiap pergi bareng (aset publik yang ada;
        // dipetakan per index agar foto sesuai suasana tujuan perjalanan).
        $images = [
            '/assets/trips/bandung-1.jpg',    // 0: ke Bandung
            '/assets/trips/bandung-2.jpg',    // 1: Puncak, Bogor (pegunungan Jabar)
            '/assets/trips/bandung-3.jpg',    // 2: Bandung Factory Outlet
            '/assets/trips/bali-2.jpg',       // 3: Pelabuhan Ratu (pantai)
            '/assets/trips/toba-2.jpg',       // 4: Cianjur agro wisata (alam hijau)
            '/assets/trips/bali-1.jpg',       // 5: Anyer (pantai)
            '/assets/trips/yogyakarta-1.jpg', // 6: Cirebon (kuliner & budaya)
            '/assets/trips/ijen-2.jpg',       // 7: Krakatau (vulkanik)
            '/assets/trips/bunaken-1.jpg',    // 8: Carita (pantai)
            '/assets/trips/bali-3.jpg',       // 9: Tanjung Lesung (resort pantai)
        ];

        // Get beberapa user untuk jadi initiator (urut id agar deterministik:
        // users[0] = admin → jadi initiator pergi bareng index 0 yang sudah
        // selesai, sehingga admin menerima rating type pergi_bareng).
        $users = User::where('id', '>=', 1)->orderBy('id')->take(5)->get();

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

        $allUserIds = $users->pluck('id')->all();

        foreach ($trips as $index => $trip) {
            // Assign random user sebagai initiator
            $trip['initiator_id'] = $users[$index % count($users)]->id;

            // Gambar berbeda per pergi bareng
            $trip['img_name'] = $images[$index % count($images)];

            // Waktu janji tersebar agar tiap status muncul:
            //  - index 0-2 : sudah lewat  → Selesai (bisa diulas)
            //  - index 3-4 : hari ini     → Berlangsung
            //  - index 5+  : akan datang  → Akan Mulai
            if ($index < 3) {
                $trip['time_appointment'] = Carbon::now()->subDays(rand(3, 30))->setTime(rand(6, 16), 0);
            } elseif ($index < 5) {
                $trip['time_appointment'] = Carbon::now()->setTime(rand(9, 18), 0);
            } else {
                $trip['time_appointment'] = Carbon::now()->addDays(rand(2, 12))->setTime(rand(6, 16), 0);
            }

            $pb = PergiBareng::create($trip);

            // Peserta (selain penyelenggara) — agar muncul di riwayat & bisa diulas saat selesai
            $candidates = array_values(array_filter($allUserIds, fn ($id) => $id !== $pb->initiator_id));
            $participantIds = [];
            if (! empty($candidates)) {
                shuffle($candidates);
                $count = min(count($candidates), rand(1, min(4, (int) $pb->people_amount - 1)));
                foreach (array_slice($candidates, 0, max(1, $count)) as $uid) {
                    DB::table('pergi_bareng_participants')->insert([
                        'pergi_bareng_id' => $pb->id,
                        'user_id'         => $uid,
                        'quantity'        => 1,
                        'created_at'      => now(),
                        'updated_at'      => now(),
                    ]);
                    $participantIds[] = $uid;
                }
            }

            // Ulasan penyelenggara utk pergi bareng yang sudah selesai:
            // peserta menilai initiator (type: pergi_bareng).
            if ($index < 3 && ! empty($participantIds)) {
                $pbComments = [
                    'Driver ramah dan tepat waktu, perjalanan nyaman!',
                    'Barengannya seru, mobil bersih. Mantap!',
                    'Komunikasi lancar, janjian gampang. Recommended!',
                    'Perjalanan aman dan santai, next ikut lagi.',
                ];
                foreach ($participantIds as $uid) {
                    DB::table('user_ratings')->insert([
                        'user_id'       => $uid,
                        'rated_user_id' => $pb->initiator_id,
                        'type'          => 'pergi_bareng',
                        'rating_amount' => rand(40, 50) / 10,
                        'comment'       => $pbComments[array_rand($pbComments)],
                        'created_at'    => $pb->time_appointment->copy()->addDays(1),
                        'updated_at'    => now(),
                    ]);
                }
            }
        }

        $this->command?->info('PergiBareng seeder telah berhasil di-generate dengan 10 data!');
    }
}
