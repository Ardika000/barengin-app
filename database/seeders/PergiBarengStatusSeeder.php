<?php

namespace Database\Seeders;

use App\Models\PergiBareng;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Satu pergi bareng untuk tiap status, semuanya diselenggarakan akun admin supaya
// halaman Managemen Pergi Bareng menampilkan seluruh status sekaligus.
//
// Status (PergiBareng::status()): will_start -> ongoing -> finish. Jalan ke finish
// hanya lewat finished_at, jadi yang selesai diisi kolom itu, bukan sekadar tanggal
// yang sudah lewat.
//
// Yang berstatus ongoing diberi grup chat tanpa track_shared_at supaya kartu
// "pantau perjalanan" terkirim sendiri saat grupnya dibuka.
class PergiBarengStatusSeeder extends Seeder
{
    public function run(): void
    {
        $initiator = User::where('email', 'admin@barengin.com')->first() ?? User::orderBy('id')->first();

        if (! $initiator) {
            $this->command?->warn('PergiBarengStatusSeeder: tidak ada user, dilewati. Jalankan UsersSeeder dulu.');
            return;
        }

        $participantIds = User::where('id', '!=', $initiator->id)->orderBy('id')->limit(3)->pluck('id')->all();
        $now = Carbon::now();

        $rows = [
            [
                'status' => 'will_start',
                'name' => 'Jakarta ke Bandung - Akan Berangkat',
                'description' => 'Contoh pergi bareng berstatus akan mulai. Berangkat pagi dari Jakarta, mampir sarapan di rest area, lanjut ke Bandung.',
                'departure_loc' => 'Stasiun Gambir, Jakarta Pusat',
                'destination_loc' => 'Alun-Alun Bandung',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 5,
                'img_name' => '/assets/trips/bandung-1.jpg',
                'time_appointment' => $now->copy()->addDays(4)->setTime(7, 0),
                'finished_at' => null,
            ],
            [
                'status' => 'ongoing',
                'name' => 'Bogor ke Puncak - Sedang Berlangsung',
                'description' => 'Contoh pergi bareng berstatus berlangsung. Rombongan sudah jalan, peta pantau perjalanan aktif di grup chat.',
                'departure_loc' => 'Stasiun Bogor',
                'destination_loc' => 'Puncak, Bogor',
                'transportation' => 'Mobil Pribadi',
                'people_amount' => 4,
                'img_name' => '/assets/trips/bandung-2.jpg',
                'time_appointment' => $now->copy()->subHours(2),
                'finished_at' => null,
            ],
            [
                'status' => 'finish',
                'name' => 'Depok ke Anyer - Sudah Selesai',
                'description' => 'Contoh pergi bareng berstatus selesai. Perjalanan sudah ditutup penyelenggara dan siap dibagi tagihannya.',
                'departure_loc' => 'Margo City, Depok',
                'destination_loc' => 'Pantai Anyer, Banten',
                'transportation' => 'Sewa Mobil',
                'people_amount' => 6,
                'img_name' => '/assets/trips/bali-1.jpg',
                'time_appointment' => $now->copy()->subDays(6)->setTime(6, 30),
                'finished_at' => $now->copy()->subDays(5),
            ],
        ];

        // Bikin seeder aman dijalankan ulang tanpa menumpuk data kembar.
        PergiBareng::whereIn('name', array_column($rows, 'name'))->delete();

        foreach ($rows as $row) {
            $status = $row['status'];
            unset($row['status']);

            $trip = PergiBareng::create($row + ['initiator_id' => $initiator->id]);

            foreach ($participantIds as $uid) {
                DB::table('pergi_bareng_participants')->insert([
                    'pergi_bareng_id' => $trip->id,
                    'user_id'         => $uid,
                    'quantity'        => 1,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }

            if ($status === 'ongoing' && ! empty($participantIds)) {
                $conversationId = DB::table('conversations')->insertGetId([
                    'trip_id' => null, 'pergi_bareng_id' => $trip->id,
                    'jastip_item_id' => null, 'is_group' => true,
                    'created_at' => $now, 'updated_at' => $now,
                ]);

                foreach (array_merge([$initiator->id], $participantIds) as $uid) {
                    DB::table('conversation_participants')->insert([
                        'conversation_id' => $conversationId, 'user_id' => $uid,
                        'last_read_at' => $now, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }

            // Perjalanan yang selesai wajar sudah diulas pesertanya.
            if ($status === 'finish') {
                foreach ($participantIds as $uid) {
                    DB::table('user_ratings')->insert([
                        'user_id'       => $uid,
                        'rated_user_id' => $initiator->id,
                        'type'          => 'pergi_bareng',
                        'rating_amount' => 5,
                        'comment'       => 'Perjalanan aman dan tepat waktu, seru!',
                        'created_at'    => $now->copy()->subDays(4),
                        'updated_at'    => $now,
                    ]);
                }
            }
        }

        $this->command?->info('PergiBarengStatusSeeder: 3 pergi bareng contoh (akan mulai, berlangsung, selesai) dibuat untuk ' . $initiator->email . '.');
    }
}
