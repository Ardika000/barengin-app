<?php

namespace Database\Seeders;

use App\Models\JastipCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Satu jastip untuk tiap status siklus hidup, semuanya milik akun admin supaya
// halaman Managemen Jastip menampilkan seluruh status sekaligus.
//
// Status jastiper: draft -> published -> buy_time -> pickup_time -> finished.
// Sisi pembeli ikut lengkap karena keduanya dihitung dari tanggal yang sama:
// upcoming -> in_order -> in_process -> pickup -> finish.
//
// Jastip berstatus pickup_time sengaja diberi grup chat berisi pembelinya, tapi
// track_shared_at dibiarkan kosong: kartu "ambil barang" akan terkirim sendiri
// begitu grupnya dibuka - persis alur aslinya.
class JastipStatusSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('email', 'admin@barengin.com')->first() ?? User::orderBy('id')->first();

        if (! $owner) {
            $this->command?->warn('JastipStatusSeeder: tidak ada user, dilewati. Jalankan UsersSeeder dulu.');
            return;
        }

        if (JastipCategory::count() === 0) {
            $this->call(JastipCategorySeeder::class);
        }

        $buyerIds = User::where('id', '!=', $owner->id)->orderBy('id')->limit(3)->pluck('id')->all();
        $catId = JastipCategory::pluck('id', 'name');
        $now = Carbon::now();

        // [phase, nama, kategori, harga, fee, gambar]
        $rows = [
            ['draft',       'Jastip Skincare Korea - Draft Belum Terbit',  'Skincare & Kecantikan', 320000,  40000, '/assets/jastip/products/p13.jpg'],
            ['upcoming',    'Jastip Parfum Dubai - Buka Pekan Depan',      'Parfum',                850000,  90000, '/assets/jastip/products/p11.jpg'],
            ['in_order',    'Jastip Sneakers Jepang - Pesanan Dibuka',     'Sepatu',               1450000, 150000, '/assets/jastip/products/p02.jpg'],
            ['in_process',  'Jastip Cokelat Swiss - Sedang Dibelanjakan',  'Makanan & Minuman',     180000,  30000, '/assets/jastip/products/p20.jpg'],
            ['pickup',      'Jastip Gadget Singapura - Siap Diambil',      'Gadget & Aksesoris',   2350000, 200000, '/assets/jastip/products/p29.jpg'],
            ['finish',      'Jastip Tas Paris - Sudah Selesai',            'Tas & Dompet',         3200000, 300000, '/assets/jastip/products/p07.jpg'],
        ];

        // Bikin seeder aman dijalankan ulang tanpa menumpuk data kembar.
        $names = array_column($rows, 1);
        DB::table('jastip_items')->whereIn('name', $names)->delete();

        $created = 0;

        foreach ($rows as $i => [$phase, $name, $catName, $base, $fee, $image]) {
            [$start, $end, $pickupStart, $pickupEnd] = $this->dates($phase, $now);

            $itemId = DB::table('jastip_items')->insertGetId([
                'user_id'            => $owner->id,
                'jastip_id'          => null,
                'jastip_category_id' => $catId[$catName] ?? $catId->first(),
                'name'               => $name,
                'description'        => 'Contoh data jastip untuk status "' . $phase . '". '
                    . 'Barang dibeli langsung oleh jastiper, lengkap dengan bukti pembelian, '
                    . 'dan diserahkan di titik ambil yang sudah disepakati.',
                'pickup_province'    => 'DKI Jakarta',
                'pickup_city'        => 'Jakarta Pusat',
                'pickup_address'     => 'Stasiun Gambir',
                'purchase_province'  => 'Singapura',
                'purchase_city'      => 'Singapore',
                'purchase_address'   => 'ION Orchard',
                'max_slot'           => 20,
                'base_price'         => $base,
                'jastip_fee'         => $fee,
                'min_buy'            => 1,
                'has_variants'       => false,
                'weight_gram'        => 800,
                'status'             => $phase === 'draft' ? 'draft' : 'published',
                'allow_requests'     => $phase === 'in_order',
                'start_date'         => $start->toDateString(),
                'end_date'           => $end->toDateString(),
                'pickup_start_date'  => $pickupStart->toDateString(),
                'pickup_end_date'    => $pickupEnd->toDateString(),
                'created_at'         => $now->copy()->subDays(60)->addMinutes($i),
                'updated_at'         => $now,
            ]);

            DB::table('jastip_item_images')->insert([
                'jastip_item_id' => $itemId, 'image_name' => $image,
            ]);

            $variantId = DB::table('jastip_item_variants')->insertGetId([
                'jastip_item_id'   => $itemId,
                'var_name'         => 'Varian',
                'var_value'        => 'Original',
                'additional_price' => 0,
                'stock'            => 20,
                'min_buy'          => 1,
                'image_name'       => null,
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);

            // Draft & yang belum dibuka belum mungkin punya pesanan.
            $hasOrders = ! in_array($phase, ['draft', 'upcoming'], true) && ! empty($buyerIds);

            if ($hasOrders) {
                foreach ($buyerIds as $buyerId) {
                    $this->paidOrder($buyerId, $itemId, $variantId, $base + $fee, $start->copy()->addDay());
                }
            }

            // Grup jastip untuk yang sudah masuk masa pengambilan: kartu "ambil
            // barang" menyusul otomatis saat grupnya dibuka.
            if ($phase === 'pickup' && $hasOrders) {
                $this->group($itemId, array_merge([$owner->id], $buyerIds), $now);
            }

            $created++;
        }

        $this->command?->info("JastipStatusSeeder: {$created} jastip contoh (satu per status) dibuat untuk {$owner->email}.");
    }

    // [start, end, pickupStart, pickupEnd] yang menghasilkan status yang diminta.
    private function dates(string $phase, Carbon $now): array
    {
        switch ($phase) {
            case 'draft': // tanggal apa pun; statusnya dikunci kolom status
            case 'upcoming': // masa pesan belum dibuka
                $start = $now->copy()->addDays(7);
                $end   = $now->copy()->addDays(27);
                $ps    = $now->copy()->addDays(32);
                $pe    = $now->copy()->addDays(42);
                break;
            case 'in_process': // masa pesan tutup, belum masuk pengambilan
                $start = $now->copy()->subDays(30);
                $end   = $now->copy()->subDays(5);
                $ps    = $now->copy()->addDays(5);
                $pe    = $now->copy()->addDays(15);
                break;
            case 'pickup': // sedang masa pengambilan
                $start = $now->copy()->subDays(40);
                $end   = $now->copy()->subDays(18);
                $ps    = $now->copy()->subDays(2);
                $pe    = $now->copy()->addDays(6);
                break;
            case 'finish': // masa pengambilan sudah lewat
                $start = $now->copy()->subDays(70);
                $end   = $now->copy()->subDays(45);
                $ps    = $now->copy()->subDays(25);
                $pe    = $now->copy()->subDays(8);
                break;
            default: // in_order - masa pemesanan sedang berjalan
                $start = $now->copy()->subDays(5);
                $end   = $now->copy()->addDays(14);
                $ps    = $now->copy()->addDays(19);
                $pe    = $now->copy()->addDays(29);
                break;
        }

        return [$start, $end, $ps, $pe];
    }

    private function paidOrder(int $buyerId, int $itemId, int $variantId, float $total, Carbon $at): void
    {
        $txId = (string) Str::uuid();

        DB::table('transactions')->insert([
            'id' => $txId, 'user_id' => $buyerId, 'total_amount' => $total,
            'type' => 'jastip', 'payment_method' => 'Midtrans',
            'expired_at' => $at->copy()->addDay(),
            'created_at' => $at, 'updated_at' => $at,
        ]);

        $orderId = DB::table('jastip_orders')->insertGetId([
            'transaction_id' => $txId, 'use_shipping' => false,
            'shipping_address' => '-', 'order_status' => 'paid',
            'created_at' => $at, 'updated_at' => $at,
        ]);

        DB::table('jastip_order_items')->insert([
            'jastip_order_id' => $orderId, 'jastip_item_id' => $itemId,
            'jastip_item_variant_id' => $variantId, 'quantity' => 1,
            'created_at' => $at, 'updated_at' => $at,
        ]);
    }

    private function group(int $itemId, array $memberIds, Carbon $now): void
    {
        $conversationId = DB::table('conversations')->insertGetId([
            'trip_id' => null, 'pergi_bareng_id' => null,
            'jastip_item_id' => $itemId, 'is_group' => true,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        foreach (array_unique($memberIds) as $uid) {
            DB::table('conversation_participants')->insert([
                'conversation_id' => $conversationId, 'user_id' => $uid,
                'last_read_at' => $now, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }
}
