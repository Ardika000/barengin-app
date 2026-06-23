<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Menambahkan peserta (user yang sudah membayar) ke tiap trip agar
 * daftar peserta + sisa kursi tampil di halaman detail trip.
 */
class TripParticipantSeeder extends Seeder
{
    public function run(): void
    {
        $userIds = DB::table('users')->where('is_guider', false)->pluck('id')->all();
        if (empty($userIds)) {
            $userIds = DB::table('users')->pluck('id')->all();
        }
        if (empty($userIds)) {
            return;
        }

        $trips = DB::table('trips')->get();

        foreach ($trips as $trip) {
            // Idempotent: lewati trip yang sudah punya peserta berbayar
            $alreadyPaid = DB::table('trip_orders')
                ->where('trip_id', $trip->id)
                ->where('order_status', 'paid')
                ->exists();
            if ($alreadyPaid) {
                continue;
            }

            $candidates = array_values(array_filter(
                $userIds,
                fn ($id) => $id !== $trip->guider_id,
            ));
            if (empty($candidates)) {
                continue;
            }

            shuffle($candidates);

            // Sisakan beberapa kursi kosong
            $max   = max(2, min(8, (int) $trip->people_amount - 2));
            $count = min(count($candidates), random_int(2, $max));
            $chosen = array_slice($candidates, 0, $count);

            foreach ($chosen as $uid) {
                $total = (float) $trip->price + 10000;
                $txId  = (string) Str::uuid();

                DB::table('transactions')->insert([
                    'id'             => $txId,
                    'user_id'        => $uid,
                    'total_amount'   => $total,
                    'type'           => 'trip',
                    'payment_method' => 'Midtrans',
                    'expired_at'     => now()->addDay(),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                DB::table('trip_orders')->insert([
                    'transaction_id' => $txId,
                    'trip_id'        => $trip->id,
                    'user_id'        => $uid,
                    'quantity'       => 1,
                    'total'          => $total,
                    'order_status'   => 'paid',
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }
        }

        $this->command?->info('TripParticipantSeeder: peserta trip berhasil ditambahkan.');
    }
}
