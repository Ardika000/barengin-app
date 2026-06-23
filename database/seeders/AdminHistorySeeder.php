<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Data dummy "sudah selesai" untuk admin@barengin:
 * - ikut 1 Trip Bareng (sudah lewat tanggalnya, transaksi paid)
 * - ikut 1 Pergi Bareng (sudah lewat waktunya)
 * Sehingga muncul di tab "History Jalan Bareng" dan bisa diberi ulasan.
 */
class AdminHistorySeeder extends Seeder
{
    public function run(): void
    {
        $admin = DB::table('users')->where('email', 'admin@barengin.com')->first();
        if (! $admin) {
            $this->command?->warn('User admin@barengin.com tidak ditemukan. Lewati AdminHistorySeeder.');
            return;
        }

        // Penyelenggara (bukan admin)
        $hostId = DB::table('users')
            ->where('id', '!=', $admin->id)
            ->orderBy('id')
            ->value('id');

        if (! $hostId) {
            $this->command?->warn('Tidak ada user lain untuk jadi penyelenggara. Lewati AdminHistorySeeder.');
            return;
        }

        $image = $this->ensureSeedImage();

        $tripName = 'Trip Bromo Selesai (Admin)';
        $pbName   = 'Jakarta ke Bandung Selesai (Admin)';

        // Idempotent: jangan buat ulang jika sudah ada
        if (DB::table('trips')->where('name', $tripName)->exists()) {
            $this->command?->info('AdminHistorySeeder sudah pernah dijalankan. Lewati.');
            return;
        }

        // ===== Trip Bareng yang sudah selesai =====
        $tripId = DB::table('trips')->insertGetId([
            'guider_id'     => $hostId,
            'name'          => $tripName,
            'description'   => 'Trip contoh yang sudah selesai untuk pengujian fitur ulasan.',
            'people_amount' => 20,
            'start_date'    => now()->subDays(10)->toDateString(),
            'end_date'      => now()->subDays(8)->toDateString(),
            'rating'        => 4.8,
            'price'         => 2500000,
            'image'         => $image,
            'location'      => 'Jawa Timur',
            'created_at'    => now()->subDays(15),
            'updated_at'    => now(),
        ]);

        $transactionId = (string) Str::uuid();
        DB::table('transactions')->insert([
            'id'             => $transactionId,
            'user_id'        => $admin->id,
            'total_amount'   => 2510000,
            'type'           => 'trip',
            'payment_method' => 'Midtrans',
            'expired_at'     => now()->subDays(11),
            'created_at'     => now()->subDays(12),
            'updated_at'     => now()->subDays(12),
        ]);

        DB::table('trip_orders')->insert([
            'transaction_id' => $transactionId,
            'trip_id'        => $tripId,
            'user_id'        => $admin->id,
            'quantity'       => 1,
            'total'          => 2510000,
            'order_status'   => 'paid',
            'created_at'     => now()->subDays(12),
            'updated_at'     => now()->subDays(12),
        ]);

        // ===== Pergi Bareng yang sudah selesai =====
        $pbId = DB::table('pergi_barengs')->insertGetId([
            'initiator_id'     => $hostId,
            'name'             => $pbName,
            'description'      => 'Perjalanan bareng contoh yang sudah selesai untuk pengujian fitur ulasan.',
            'time_appointment' => now()->subDays(5)->setTime(8, 0),
            'transportation'   => 'Mobil Pribadi',
            'people_amount'    => 5,
            'departure_loc'    => 'Jakarta',
            'destination_loc'  => 'Bandung',
            'img_name'         => $image,
            'created_at'       => now()->subDays(15),
            'updated_at'       => now(),
        ]);

        DB::table('pergi_bareng_participants')->insert([
            'pergi_bareng_id' => $pbId,
            'user_id'         => $admin->id,
            'full_name'       => $admin->full_name ?? 'Admin Barengin',
            'phone_number'    => '+628123456789',
            'nik'             => '3174000000000001',
            'birth_date'      => '2000-01-01',
            'created_at'      => now()->subDays(6),
            'updated_at'      => now()->subDays(6),
        ]);

        $this->command?->info('AdminHistorySeeder: 1 trip & 1 pergi bareng selesai dibuat untuk admin@barengin.com.');
    }

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
