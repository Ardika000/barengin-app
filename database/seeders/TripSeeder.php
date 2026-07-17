<?php

namespace Database\Seeders;

use App\Models\Trip;
use Carbon\Carbon;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TripSeeder extends Seeder
{
    /**
     * Destinasi nyata + gambar yang relevan (diunduh ke public/assets/trips/{slug}-{1..3}.jpg
     * oleh skrip download_trip_images). `-1` = gambar kartu, `-2`/`-3` = gambar aktivitas.
     * `phase`: past (Selesai), ongoing (Berlangsung), future (Akan Mulai).
     */
    private function destinations(): array
    {
        return [
            ['slug' => 'bromo',      'name' => 'Gunung Bromo',   'location' => 'Jawa Timur',           'phase' => 'past'],
            ['slug' => 'borobudur',  'name' => 'Candi Borobudur','location' => 'Jawa Tengah',          'phase' => 'past'],
            ['slug' => 'toba',       'name' => 'Danau Toba',     'location' => 'Sumatera Utara',       'phase' => 'past'],
            ['slug' => 'bandung',    'name' => 'Bandung',        'location' => 'Jawa Barat',           'phase' => 'ongoing'],
            ['slug' => 'yogyakarta', 'name' => 'Yogyakarta',     'location' => 'DI Yogyakarta',        'phase' => 'ongoing'],
            ['slug' => 'bali',       'name' => 'Bali',           'location' => 'Bali',                 'phase' => 'future'],
            ['slug' => 'raja-ampat', 'name' => 'Raja Ampat',     'location' => 'Papua Barat Daya',     'phase' => 'future'],
            ['slug' => 'komodo',     'name' => 'Pulau Komodo',   'location' => 'Nusa Tenggara Timur',  'phase' => 'future'],
            ['slug' => 'ijen',       'name' => 'Kawah Ijen',     'location' => 'Jawa Timur',           'phase' => 'future'],
            ['slug' => 'bunaken',    'name' => 'Bunaken',        'location' => 'Sulawesi Utara',       'phase' => 'future'],
        ];
    }

    public function run()
    {
        $faker = Faker::create('id_ID');

        // Admin juga guider. Trip yang dipegangnya sengaja menyebar ke tiga fase
        // agar profil guider-nya lengkap: yang 'past' memberi rating & ulasan
        // trip_bareng, sementara 'ongoing' dan 'future' membuatnya benar-benar
        // tampil di etalase trip (listing menyembunyikan trip yang sudah lewat).
        $adminId = DB::table('users')->where('email', 'admin@barengin.com')->value('id');

        // Indeks destinasi yang dipandu admin → bromo (past), bandung (ongoing),
        // bali (future). Selaras dengan urutan destinations().
        $adminTripIndexes = [0, 3, 5];

        // 1. Buat 5 User Guider
        $guiderIds = [];
        for ($i = 0; $i < 5; $i++) {
            $guiderIds[] = DB::table('users')->insertGetId([
                'full_name' => $faker->name,
                'username' => $faker->unique()->userName,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'gender' => $faker->randomElement(['male', 'female']),
                'is_guider' => true,
                'onboarding_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Buat 10 User Customer
        $customerIds = [];
        for ($i = 0; $i < 10; $i++) {
            $customerIds[] = DB::table('users')->insertGetId([
                'full_name' => $faker->name,
                'username' => $faker->unique()->userName,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'gender' => $faker->randomElement(['male', 'female']),
                'onboarding_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Buat Data Fasilitas Master
        $facilityIds = [
            DB::table('facilities')->insertGetId(['name' => 'Transportasi AC', 'slug' => 'transportasi-ac', 'created_at' => now()]),
            DB::table('facilities')->insertGetId(['name' => 'Penginapan Hotel', 'slug' => 'penginapan-hotel', 'created_at' => now()]),
            DB::table('facilities')->insertGetId(['name' => 'Makan 3x Sehari', 'slug' => 'makan-3x-sehari', 'created_at' => now()]),
            DB::table('facilities')->insertGetId(['name' => 'Dokumentasi & Fotografer', 'slug' => 'dokumentasi', 'created_at' => now()]),
        ];

        // 3. Looping trip berdasarkan destinasi nyata (status tersebar: lampau / berlangsung / akan datang)
        foreach ($this->destinations() as $i => $dest) {
            [$startDate, $endDate] = $this->datesFor($dest['phase'], $faker);
            $status = Trip::statusFromDates($startDate, $endDate);

            $price      = $faker->randomElement([1500000, 2500000, 3800000]);
            $customerId = $faker->randomElement($customerIds);
            $guiderId   = $faker->randomElement($guiderIds);

            if ($adminId && in_array($i, $adminTripIndexes, true)) {
                $guiderId = $adminId;
            }

            // Gambar per destinasi: kartu (-1) & aktivitas (-1..-3)
            $cardImage = "/assets/trips/{$dest['slug']}-1.jpg";
            $actImages = [
                "/assets/trips/{$dest['slug']}-1.jpg",
                "/assets/trips/{$dest['slug']}-2.jpg",
                "/assets/trips/{$dest['slug']}-3.jpg",
            ];

            $tripId = DB::table('trips')->insertGetId([
                'guider_id'    => $guiderId,
                'name'         => 'Trip ' . $dest['name'],
                'description'  => "Jelajahi keindahan {$dest['name']} di {$dest['location']} bersama pemandu berpengalaman. "
                    . 'Itinerary tersusun rapi, mengunjungi spot ikonik & hidden gems, menikmati kuliner lokal, '
                    . 'dan berbagi cerita bersama teman seperjalanan baru.',
                'people_amount' => $faker->numberBetween(15, 20),
                'start_date'   => $startDate,
                'end_date'     => $endDate,
                'rating'       => $faker->randomFloat(2, 4.0, 5.0),
                'price'        => $price,
                'image'        => $cardImage,
                'location'     => $dest['location'],
                'status'       => $status,
                'created_at'   => now()->subDays($faker->numberBetween(1, 30)),
                'updated_at'   => now(),
            ]);

            // B. Pivot Trip_Facilities (2 sampai 4 fasilitas acak)
            $randomFacilities = $faker->randomElements($facilityIds, $faker->numberBetween(2, 4));
            foreach ($randomFacilities as $facId) {
                DB::table('trip_facilities')->insert([
                    'trip_id' => $tripId,
                    'facility_id' => $facId,
                    'created_at' => now(),
                ]);
            }

            // C. Trip Activities (3 sampai 8) — gambar relevan dengan destinasi
            $totalActivities = $faker->numberBetween(3, 8);
            for ($act = 1; $act <= $totalActivities; $act++) {
                if ($act === 1) {
                    $actName = 'Penjemputan & Briefing';
                    $actDesc = 'Tim menjemput peserta di meeting point. Briefing singkat sebelum perjalanan dan pengecekan kelengkapan peserta.';
                } elseif ($act === $totalActivities) {
                    $actName = 'Check-out & Perjalanan Pulang';
                    $actDesc = 'Kembali ke penginapan untuk check-out, singgah ke pusat oleh-oleh lokal, dan pengantaran pulang ke titik awal.';
                } else {
                    $actName = 'Eksplorasi ' . $dest['name'] . ': ' . $faker->streetName;
                    $actDesc = 'Mengunjungi spot wisata ikonik, berfoto bersama, menikmati pemandangan alam, dan aktivitas bebas di sekitar lokasi.';
                }

                $actStart = (clone $startDate)->addHours($act * 6);
                $actEnd = (clone $actStart)->addHours($faker->numberBetween(2, 4));

                $activityId = DB::table('trip_activities')->insertGetId([
                    'trip_id' => $tripId,
                    'activity_order' => $act,
                    'activity_name' => $actName,
                    'activity_start_datetime' => $actStart,
                    'activity_end_datetime' => $actEnd,
                    'activity_description' => $actDesc,
                    'created_at' => now(),
                ]);

                // Dua gambar per aktivitas dari kolam gambar destinasi
                DB::table('image_activities')->insert([
                    ['trip_activity_id' => $activityId, 'activity_img_name' => $actImages[($act) % 3]],
                    ['trip_activity_id' => $activityId, 'activity_img_name' => $actImages[($act + 1) % 3]],
                ]);
            }

            // D. Ulasan pemandu (hanya trip yang sudah selesai yang wajar diulas)
            //    2-4 ulasan dari customer berbeda agar rata-rata terasa nyata.
            if ($status === Trip::STATUS_DONE) {
                // Admin diberi ulasan lebih banyak agar rating guider di kartu
                // detail trip berdiri di atas sampel yang layak, bukan 1-2 suara.
                $raterCount = (int) $guiderId === (int) $adminId
                    ? $faker->numberBetween(5, 8)
                    : $faker->numberBetween(2, 4);
                $raters = $faker->randomElements($customerIds, $raterCount);
                foreach ($raters as $raterId) {
                    DB::table('user_ratings')->insert([
                        'user_id' => $raterId,
                        'rated_user_id' => $guiderId,
                        'type' => 'trip_bareng',
                        'rating_amount' => $faker->randomFloat(2, 4.0, 5.0),
                        'comment' => $faker->randomElement(['Guide sangat ramah dan seru!', 'Perjalanan aman dan menyenangkan.', 'Sangat direkomendasikan untuk trip bareng.', 'Itinerary jelas dan on-time.']),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    /** Rentang tanggal [start, end] sesuai fase status yang diinginkan. */
    private function datesFor(string $phase, $faker): array
    {
        if ($phase === 'past') {
            $start = Carbon::now()->subDays($faker->numberBetween(20, 60));
            $end   = (clone $start)->addDays($faker->numberBetween(2, 4));
        } elseif ($phase === 'ongoing') {
            $start = Carbon::now()->subDays($faker->numberBetween(1, 2));
            $end   = Carbon::now()->addDays($faker->numberBetween(1, 3));
        } else { // future
            $start = Carbon::now()->addDays($faker->numberBetween(10, 75));
            $end   = (clone $start)->addDays($faker->numberBetween(2, 4));
        }

        return [$start, $end];
    }
}
