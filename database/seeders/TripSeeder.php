<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Faker\Factory as Faker;

class TripSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('id_ID');

        // Pastikan gambar contoh tersedia di storage (disajikan via storage link)
        $tripImage = $this->ensureSeedImage();

        // Data dummy deskripsi trip
        $tripDescriptions = [
            'Jelajahi keindahan alam memukau dengan itinerary yang sudah tersusun rapi. Kita akan mengunjungi spot-spot tersembunyi, menikmati kuliner lokal, dan berbagi cerita bersama teman-teman seperjalanan baru.',
            'Liburan singkat untuk melepas penat dari kesibukan kota. Menikmati sunrise, udara segar, dan pemandangan hijau yang menyejukkan mata. Perjalanan dijamin nyaman, seru, dan penuh kejutan menyenangkan.',
            'Petualangan tak terlupakan menanti! Siapkan dirimu untuk mengeksplorasi destinasi ikonik, berburu foto estetik, dan merasakan pengalaman liburan dengan gaya komunitas yang hangat.'
        ];

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

        // 3. Looping 10 Trip
        for ($i = 1; $i <= 10; $i++) {

            $startDate = Carbon::parse($faker->dateTimeBetween('+1 month', '+3 months'));
            $endDate = (clone $startDate)->addDays($faker->numberBetween(2, 4));
            $price = $faker->randomElement([1500000, 2500000, 3800000]);
            $customerId = $faker->randomElement($customerIds);
            $guiderId = $faker->randomElement($guiderIds);
            $cityName = $faker->city;

            $tripId = DB::table('trips')->insertGetId([
                'guider_id'    => $guiderId,
                'name'         => 'Trip ' . $cityName,
                'description'  => $faker->randomElement($tripDescriptions),
                'people_amount' => $faker->numberBetween(15, 20),
                'start_date'   => $startDate,
                'end_date'     => $endDate,
                'rating'       => $faker->randomFloat(2, 4.0, 5.0),
                'price'        => $price,
                'image'        => $tripImage,
                'location'     => $cityName, // ← nama kota asli, bukan "Indonesia"
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            // B. Pivot Trip_Facilities (2 sampai 4 fasilitas acak)
            $randomFacilities = $faker->randomElements($facilityIds, $faker->numberBetween(2, 4));
            foreach ($randomFacilities as $facId) {
                DB::table('trip_facilities')->insert([
                    'trip_id' => $tripId,
                    'facility_id' => $facId,
                    'created_at' => now()
                ]);
            }

            // ==========================================
            // C. Trip Activities (Bervariasi 3 sampai 8)
            // ==========================================
            $totalActivities = $faker->numberBetween(3, 8); // Angka acak dari 3 s.d 8

            for ($act = 1; $act <= $totalActivities; $act++) {

                // Menentukan nama & deskripsi berdasarkan urutan (Awal, Tengah, Akhir)
                if ($act === 1) {
                    $actName = 'Penjemputan & Briefing';
                    $actDesc = 'Tim menjemput peserta di meeting point. Briefing singkat sebelum perjalanan dan pengecekan kelengkapan peserta.';
                } elseif ($act === $totalActivities) {
                    $actName = 'Check-out & Perjalanan Pulang';
                    $actDesc = 'Kembali ke penginapan untuk check-out, singgah ke pusat oleh-oleh lokal, dan pengantaran pulang ke titik awal.';
                } else {
                    $actName = 'Eksplorasi Destinasi: ' . $faker->streetName;
                    $actDesc = 'Mengunjungi spot wisata ikonik, berfoto bersama, menikmati pemandangan alam, dan aktivitas bebas di sekitar lokasi.';
                }

                $actStart = (clone $startDate)->addHours($act * 6); // Jarak antar aktivitas 6 jam (hanya simulasi)
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

                // Insert 2 gambar untuk tiap aktivitas
                DB::table('image_activities')->insert([
                    ['trip_activity_id' => $activityId, 'activity_img_name' => '/assets/trips/bromo1.jpg'],
                    ['trip_activity_id' => $activityId, 'activity_img_name' => '/assets/trips/bromo2.jpg'],
                ]);
            }

            // D. Tabel user_ratings
            DB::table('user_ratings')->insert([
                'user_id' => $customerId,
                'rated_user_id' => $guiderId,
                'type' => 'jalan_bareng',
                'rating_amount' => $faker->randomFloat(2, 4.0, 5.0),
                'comment' => $faker->randomElement(['Guide sangat ramah dan seru!', 'Perjalanan aman dan menyenangkan.', 'Sangat direkomendasikan untuk trip bareng.', 'Itinerary jelas dan on-time.']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);


            // Transaksi Dummy
            // $transactionId = Str::uuid()->toString();
            // DB::table('transactions')->insert([
            //     'id' => $transactionId, 'user_id' => $customerId, 'total_amount' => $price, 'type' => 'trip', 'payment_method' => 'BCA Virtual Account', 'va_number' => '123456789', 'expired_at' => now()->addHours(24), 'created_at' => now()
            // ]);
            // DB::table('trip_orders')->insert([
            //     'transaction_id' => $transactionId, 'trip_id' => $tripId, 'user_id' => $customerId, 'quantity' => 1, 'total' => $price, 'order_status' => 'paid', 'created_at' => now()
            // ]);
        }
    }

    /**
     * Salin satu gambar contoh dari folder public ke storage/app/public
     * lalu kembalikan path relatifnya (disajikan lewat storage link).
     */
    private function ensureSeedImage(): string
    {
        $relative = 'seed/sample.jpg';
        $target   = storage_path('app/public/' . $relative);

        if (! File::exists($target)) {
            File::ensureDirectoryExists(dirname($target));
            $source = public_path('assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg');
            if (File::exists($source)) {
                File::copy($source, $target);
            }
        }

        return $relative;
    }
}
