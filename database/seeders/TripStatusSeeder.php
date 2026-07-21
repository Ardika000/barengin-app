<?php

namespace Database\Seeders;

use App\Models\Trip;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Trip bareng contoh milik akun admin untuk status yang belum terwakili seeder
// utama, supaya halaman Managemen Trip menampilkan tiap status.
//
// Status (Trip::STATUS_*): draft -> created (terjadwal) -> ongoing -> done.
// STATUS_CREATED sengaja tidak dibuat di sini: TripSeeder sudah menghasilkan
// beberapa trip berjadwal (fase 'future'), jadi menambah satu lagi cuma bikin
// etalase trip terlihat kembar.
//
// Tanggalnya sengaja dibuat konsisten dengan statusnya supaya Trip::refreshStatuses()
// tidak menariknya balik ke status lain.
class TripStatusSeeder extends Seeder
{
    public function run(): void
    {
        $guider = User::where('email', 'admin@barengin.com')->first() ?? User::orderBy('id')->first();

        if (! $guider) {
            $this->command?->warn('TripStatusSeeder: tidak ada user, dilewati. Jalankan UsersSeeder dulu.');
            return;
        }

        $now = Carbon::now();

        $rows = [
            [
                'status' => Trip::STATUS_DRAFT,
                'name' => 'Trip Raja Ampat - Draft Belum Terbit',
                'slug' => 'raja-ampat',
                'location' => 'Papua Barat Daya',
                'start' => $now->copy()->addDays(45),
                'end' => $now->copy()->addDays(50),
                'price' => 8500000,
            ],
            [
                'status' => Trip::STATUS_ONGOING,
                'name' => 'Trip Yogyakarta - Sedang Berlangsung',
                'slug' => 'yogyakarta',
                'location' => 'DI Yogyakarta',
                'start' => $now->copy()->subDays(1),
                'end' => $now->copy()->addDays(2),
                'price' => 2500000,
            ],
            [
                'status' => Trip::STATUS_DONE,
                'name' => 'Trip Gunung Bromo - Sudah Selesai',
                'slug' => 'bromo',
                'location' => 'Jawa Timur',
                'start' => $now->copy()->subDays(25),
                'end' => $now->copy()->subDays(22),
                'price' => 2100000,
            ],
        ];

        // Bikin seeder aman dijalankan ulang tanpa menumpuk data kembar.
        Trip::whereIn('name', array_column($rows, 'name'))->delete();

        foreach ($rows as $row) {
            $tripId = DB::table('trips')->insertGetId([
                'guider_id'     => $guider->id,
                'name'          => $row['name'],
                'description'   => 'Contoh trip bareng berstatus "' . $row['status'] . '". '
                    . 'Itinerary tersusun rapi bersama pemandu, mengunjungi spot ikonik '
                    . $row['location'] . ' dan menikmati kuliner lokal.',
                'people_amount' => 15,
                'start_date'    => $row['start']->toDateString(),
                'end_date'      => $row['end']->toDateString(),
                'rating'        => 4.8,
                'price'         => $row['price'],
                'image'         => "/assets/trips/{$row['slug']}-1.jpg",
                'location'      => $row['location'],
                'status'        => $row['status'],
                // Dipakai halaman "sedang berlangsung" untuk menghitung durasi jalan.
                'current_run_started_at' => $row['status'] === Trip::STATUS_ONGOING ? $row['start'] : null,
                'finished_at'   => $row['status'] === Trip::STATUS_DONE ? $row['end'] : null,
                'created_at'    => $now->copy()->subDays(30),
                'updated_at'    => $now,
            ]);

            $activities = [
                ['Penjemputan & Briefing', 'Tim menjemput peserta di meeting point. Briefing singkat sebelum perjalanan dan pengecekan kelengkapan peserta.'],
                ['Eksplorasi ' . $row['location'], 'Mengunjungi spot wisata ikonik, berfoto bersama, dan aktivitas bebas di sekitar lokasi.'],
                ['Check-out & Perjalanan Pulang', 'Kembali ke penginapan untuk check-out, singgah ke pusat oleh-oleh lokal, dan pengantaran pulang ke titik awal.'],
            ];

            foreach ($activities as $order => [$actName, $actDesc]) {
                $actStart = $row['start']->copy()->addDays($order)->setTime(8, 0);

                $activityId = DB::table('trip_activities')->insertGetId([
                    'trip_id' => $tripId,
                    'activity_order' => $order + 1,
                    'activity_name' => $actName,
                    'activity_start_datetime' => $actStart,
                    'activity_end_datetime' => $actStart->copy()->addHours(4),
                    'activity_description' => $actDesc,
                    'created_at' => $now,
                ]);

                DB::table('image_activities')->insert([
                    'trip_activity_id' => $activityId,
                    'activity_img_name' => "/assets/trips/{$row['slug']}-" . ($order % 3 + 1) . '.jpg',
                ]);
            }

            // Trip yang sudah selesai wajar sudah punya ulasan pemandunya.
            if ($row['status'] === Trip::STATUS_DONE) {
                foreach (User::where('id', '!=', $guider->id)->orderBy('id')->limit(3)->pluck('id') as $uid) {
                    DB::table('user_ratings')->insert([
                        'user_id'       => $uid,
                        'rated_user_id' => $guider->id,
                        'type'          => 'trip_bareng',
                        'rating_amount' => 5,
                        'comment'       => 'Guide ramah, itinerary jelas dan on-time.',
                        'created_at'    => $row['end'],
                        'updated_at'    => $now,
                    ]);
                }
            }
        }

        $this->command?->info('TripStatusSeeder: 3 trip bareng contoh (draft, berlangsung, selesai) dibuat untuk ' . $guider->email . '.');
    }
}
