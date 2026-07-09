<?php

namespace Database\Seeders;

use App\Models\JastipCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Katalog jastip: ~100 produk dengan gambar produk asli & konsisten
 * (satu foto per produk), kategori dari tabel jastip_categories, serta
 * varian datar (satu tingkat) yang masing-masing punya stok sendiri.
 *
 * Produk tanpa varian tetap memiliki satu varian tersembunyi "Original"
 * (has_variants = false) agar order_item selalu punya variant_id.
 *
 * Jalankan otomatis lewat DatabaseSeeder, atau:
 *   php artisan db:seed --class=JastipCatalogSeeder
 */
class JastipCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('email', 'admin@barengin.com')->first() ?? User::first();
        if (! $owner) {
            $this->command?->warn('JastipCatalogSeeder: tidak ada user, dilewati.');
            return;
        }
        if (JastipCategory::count() === 0) {
            $this->call(JastipCategorySeeder::class);
        }

        $buyerIds = User::where('id', '!=', $owner->id)->pluck('id')->all() ?: [$owner->id];
        $catId    = JastipCategory::pluck('id', 'name');

        // Gambar hasil unduhan yang relevan judul (item-<i>.jpg). Bila unduhan gagal,
        // jatuh ke kolam gambar lama per kategori agar seeding tetap aman.
        $catalogImg = fn ($i) => file_exists(public_path("assets/jastip/catalog/item-{$i}.jpg"))
            ? "/assets/jastip/catalog/item-{$i}.jpg" : null;
        // Gambar per varian (hanya untuk warna/rasa/shade — bukan ukuran).
        $variantImg = fn ($i, $j) => file_exists(public_path("assets/jastip/catalog/item-{$i}-v{$j}.jpg"))
            ? "/assets/jastip/catalog/item-{$i}-v{$j}.jpg" : null;

        $img = fn ($n) => '/assets/jastip/products/p' . str_pad($n, 2, '0', STR_PAD_LEFT) . '.jpg';
        // Kolam gambar cadangan per kategori (indeks p01..p50)
        $pools = [
            'Sepatu'                => array_map($img, [2, 4, 9, 31, 33, 44]),
            'Olahraga'              => array_map($img, [2, 4, 9, 31, 33, 44]),
            'Jam Tangan'            => array_map($img, [3, 10, 38]),
            'Perhiasan'             => array_map($img, [3, 10, 38, 6]),
            'Tas & Dompet'          => array_map($img, [7, 8, 43]),
            'Fashion'               => array_map($img, [6, 25, 26, 27, 28, 35]),
            'Skincare & Kecantikan' => array_map($img, [13, 14, 15, 16, 17, 18, 34, 37, 39, 46, 48]),
            'Kesehatan'             => array_map($img, [13, 17, 34, 39, 48]),
            'Parfum'                => array_map($img, [11, 12, 40]),
            'Makanan & Minuman'     => array_map($img, [19, 20, 21, 22, 23, 24, 36, 42, 45, 47, 50]),
            'Elektronik'            => array_map($img, [1, 5, 30, 32, 41, 49]),
            'Gadget & Aksesoris'    => array_map($img, [29, 1, 5, 32, 41, 49]),
            'Hobi & Koleksi'        => array_map($img, [5, 30, 41, 49]),
            'Mainan & Games'        => array_map($img, [30, 41, 49, 1]),
            'Ibu & Bayi'            => array_map($img, [34, 17, 13]),
        ];

        // Lokasi pembelian (asal barang) — [wilayah/negara, kota, alamat]
        $purchaseLocs = [
            ['Malaysia', 'Kuala Lumpur', 'Suria KLCC'], ['Malaysia', 'Johor Bahru', 'Johor Premium Outlets'],
            ['Singapura', 'Singapore', 'ION Orchard'], ['Singapura', 'Singapore', 'Changi Airport DFS'],
            ['Thailand', 'Bangkok', 'Siam Paragon'], ['Thailand', 'Bangkok', 'Chatuchak Weekend Market'],
            ['Jepang', 'Tokyo', 'Yodobashi Akihabara'], ['Jepang', 'Osaka', 'Shinsaibashi'],
            ['Korea Selatan', 'Seoul', 'Olive Young Myeongdong'], ['Korea Selatan', 'Busan', 'Shinsegae Centum City'],
            ['Uni Emirat Arab', 'Dubai', 'Dubai Mall'], ['Amerika Serikat', 'Los Angeles', 'The Grove'],
            ['Inggris', 'London', 'Selfridges'], ['Prancis', 'Paris', 'Galeries Lafayette'],
            ['Australia', 'Sydney', 'Queen Victoria Building'],
        ];
        // Lokasi pembelian khusus produk lokal (agar makanan Indonesia masuk akal)
        $localLocs = [
            ['Bali', 'Denpasar', 'Pasar Sukawati'], ['DI Yogyakarta', 'Yogyakarta', 'Jl. Malioboro'],
            ['Kalimantan Barat', 'Pontianak', 'Jl. Gajah Mada'], ['Sumatera Barat', 'Padang', 'Pasar Raya Padang'],
            ['Jawa Tengah', 'Pekalongan', 'Kampung Batik Kauman'], ['Jawa Timur', 'Surabaya', 'Pasar Atom'],
        ];
        // Lokasi ambil (domestik) — [provinsi, kota, alamat]
        $pickupLocs = [
            ['DKI Jakarta', 'Jakarta Pusat', 'Stasiun Gambir'], ['DKI Jakarta', 'Jakarta Selatan', 'Stasiun MRT Blok M'],
            ['DKI Jakarta', 'Jakarta Barat', 'Bandara Soekarno Hatta Terminal 2'], ['DKI Jakarta', 'Jakarta Timur', 'Terminal Kampung Rambutan'],
            ['Jawa Barat', 'Bandung', 'Stasiun Bandung'], ['Jawa Barat', 'Bogor', 'Stasiun Bogor'],
            ['Jawa Barat', 'Bekasi', 'Summarecon Mall Bekasi'], ['Jawa Barat', 'Depok', 'Margo City'],
            ['Jawa Timur', 'Surabaya', 'Bandara Juanda Terminal 1'], ['Jawa Timur', 'Malang', 'Stasiun Malang'],
            ['Jawa Tengah', 'Semarang', 'Paragon Mall Semarang'], ['DI Yogyakarta', 'Yogyakarta', 'Stasiun Tugu'],
            ['Bali', 'Denpasar', 'Bandara Ngurah Rai'], ['Sumatera Utara', 'Medan', 'Sun Plaza Medan'],
            ['Kepulauan Riau', 'Batam', 'Ferry Terminal Batam Center'], ['Banten', 'Tangerang Selatan', 'AEON Mall BSD'],
        ];

        // Template varian: value + tambahan harga (stok diisi acak per varian)
        $variantSets = [
            'shoe'    => ['Ukuran', [['39', 0], ['40', 0], ['41', 0], ['42', 0], ['43', 0]]],
            'cloth'   => ['Ukuran', [['S', 0], ['M', 0], ['L', 0], ['XL', 20000]]],
            'color'   => ['Warna', [['Hitam', 0], ['Putih', 10000], ['Navy', 0]]],
            'perfume' => ['Ukuran', [['30ml', 0], ['50ml', 400000], ['100ml', 900000]]],
            'shade'   => ['Shade', [['01 Fair', 0], ['02 Natural', 0], ['03 Sand', 0]]],
            'flavor'  => ['Rasa', [['Original', 0], ['Cokelat', 5000], ['Matcha', 12000]]],
            'pack'    => ['Isi', [['Isi 5', 0], ['Isi 10', 60000], ['Isi 20', 130000]]],
            'single'  => null, // tanpa varian -> "Original"
        ];

        $catalog = $this->catalog();
        $now = Carbon::now();
        $i = 0;
        $created = 0;

        foreach ($catalog as [$name, $catName, $base, $fee, $vKey]) {
            $isLocalFood = $catName === 'Makanan & Minuman' && $this->looksLocal($name);
            $purchase = $isLocalFood
                ? $localLocs[$i % count($localLocs)]
                : $purchaseLocs[$i % count($purchaseLocs)];
            $pickup   = $pickupLocs[($i * 5 + 2) % count($pickupLocs)];

            $pool  = $pools[$catName] ?? $pools['Fashion'];
            $image = $catalogImg($i) ?? $pool[$i % count($pool)];

            $upcoming  = ($i % 11 === 0);
            // Semua produk dibuat tetap terlihat di etalase: 'upcoming' (mulai di masa
            // depan) atau 'ongoing' (berakhir di masa depan) — tidak ada yang sudah lewat.
            if ($upcoming) {
                $startDate = $now->copy()->addDays(rand(4, 20));
                $endDate   = $startDate->copy()->addDays(rand(25, 70));
            } else {
                $startDate = $now->copy()->subDays(rand(3, 40));
                $endDate   = $now->copy()->addDays(rand(10, 60));
            }
            // Jendela pengambilan barang setelah pemesanan ditutup
            $pickupStart = $endDate->copy()->addDays(rand(2, 7));
            $pickupEnd   = $pickupStart->copy()->addDays(rand(7, 21));

            $hasVariants = $vKey !== 'single';
            // Hanya varian warna/rasa/shade yang punya gambar (bukan ukuran sepatu/baju/ml).
            $variantHasImage = in_array($vKey, ['color', 'flavor', 'shade'], true);

            // Bangun daftar varian + stok
            if ($hasVariants) {
                [$vName, $vOptions] = $variantSets[$vKey];
                $variants = [];
                foreach ($vOptions as $j => [$vValue, $vPrice]) {
                    $variants[] = [
                        'var_name' => $vName, 'var_value' => $vValue,
                        'additional_price' => $vPrice, 'stock' => rand(3, 15), 'min_buy' => 1,
                        'image_name' => $variantHasImage ? $variantImg($i, $j) : null,
                    ];
                }
            } else {
                $variants = [[
                    'var_name' => 'Varian', 'var_value' => 'Original',
                    'additional_price' => 0, 'stock' => rand(8, 40), 'min_buy' => 1,
                    'image_name' => null,
                ]];
            }
            $totalStock = array_sum(array_column($variants, 'stock'));

            $itemId = DB::table('jastip_items')->insertGetId([
                'user_id'            => $owner->id,
                'jastip_id'          => null,
                'jastip_category_id' => $catId[$catName] ?? null,
                'name'               => $name,
                'description'        => "{$name} — dibeli langsung di {$purchase[1]} ({$purchase[0]}) oleh jastiper terpercaya. "
                    . "Barang 100% original beserta bukti pembelian. Titik ambil di {$pickup[2]}, {$pickup[1]}.",
                'pickup_province'    => $pickup[0],
                'pickup_city'        => $pickup[1],
                'pickup_address'     => $pickup[2],
                'purchase_province'  => $purchase[0],
                'purchase_city'      => $purchase[1],
                'purchase_address'   => $purchase[2],
                'max_slot'           => $totalStock,
                'base_price'         => $base,
                'jastip_fee'         => $fee,
                'min_buy'            => 1,
                'has_variants'       => $hasVariants,
                'weight_gram'        => rand(120, 2500),
                'status'             => 'published',
                'start_date'         => $startDate->toDateString(),
                'end_date'           => $endDate->toDateString(),
                'pickup_start_date'  => $pickupStart->toDateString(),
                'pickup_end_date'    => $pickupEnd->toDateString(),
                'created_at'         => $now->copy()->subDays(rand(0, 60))->subMinutes($i),
                'updated_at'         => $now,
            ]);

            // Satu gambar konsisten per produk
            DB::table('jastip_item_images')->insert([
                'jastip_item_id' => $itemId, 'image_name' => $image,
            ]);

            // Simpan varian (image_name null di seed — jastiper bisa unggah via form)
            $variantMeta = [];
            foreach ($variants as $v) {
                $vid = DB::table('jastip_item_variants')->insertGetId([
                    'jastip_item_id'   => $itemId,
                    'var_name'         => $v['var_name'],
                    'var_value'        => $v['var_value'],
                    'additional_price' => $v['additional_price'],
                    'stock'            => $v['stock'],
                    'min_buy'          => $v['min_buy'],
                    'image_name'       => $v['image_name'] ?? null,
                    'created_at'       => $now,
                    'updated_at'       => $now,
                ]);
                $variantMeta[] = ['id' => $vid, 'stock' => $v['stock'], 'add' => $v['additional_price']];
            }

            // Pesanan berbayar per varian (tidak melebihi stok varian)
            if (! $upcoming) {
                foreach ($variantMeta as $vm) {
                    $soldTarget = rand(0, min(8, $vm['stock']));
                    $remaining = $soldTarget;
                    while ($remaining > 0) {
                        $qty = min($remaining, rand(1, 3));
                        $remaining -= $qty;

                        $buyer     = $buyerIds[array_rand($buyerIds)];
                        $orderDate = $now->copy()->subMonths(rand(0, 5))->subDays(rand(0, 25));
                        $total     = ($base + $fee + $vm['add']) * $qty;

                        $txId = (string) Str::uuid();
                        DB::table('transactions')->insert([
                            'id' => $txId, 'user_id' => $buyer, 'total_amount' => $total,
                            'type' => 'jastip', 'payment_method' => 'Midtrans',
                            'expired_at' => $orderDate->copy()->addDay(),
                            'created_at' => $orderDate, 'updated_at' => $orderDate,
                        ]);
                        $orderId = DB::table('jastip_orders')->insertGetId([
                            'transaction_id' => $txId, 'use_shipping' => false,
                            'shipping_address' => '-', 'order_status' => 'paid',
                            'created_at' => $orderDate, 'updated_at' => $orderDate,
                        ]);
                        DB::table('jastip_order_items')->insert([
                            'jastip_order_id' => $orderId, 'jastip_item_id' => $itemId,
                            'jastip_item_variant_id' => $vm['id'], 'quantity' => $qty,
                            'created_at' => $orderDate, 'updated_at' => $orderDate,
                        ]);
                    }
                }
            }

            $created++;
            $i++;
        }

        // Rating jastiper
        $comments = [
            'Jastipnya amanah, barang sesuai & cepat!',
            'Ori dan packing rapi, recommended seller.',
            'Komunikatif, update terus progress belanjaannya.',
            'Barang sampai lebih cepat dari perkiraan. Mantap!',
            'Sesuai deskripsi, harga bersaing. Puas!',
        ];
        foreach (range(1, 24) as $n) {
            DB::table('user_ratings')->insert([
                'user_id'       => $buyerIds[array_rand($buyerIds)],
                'rated_user_id' => $owner->id,
                'type'          => 'jastiper',
                'rating_amount' => rand(42, 50) / 10,
                'comment'       => $comments[array_rand($comments)],
                'created_at'    => $now->copy()->subDays(rand(1, 90)),
                'updated_at'    => $now,
            ]);
        }

        $this->command?->info("JastipCatalogSeeder: {$created} produk jastip dibuat untuk {$owner->email}.");
    }

    private function looksLocal(string $name): bool
    {
        $localKw = ['Pie Susu', 'Bakpia', 'Lapis Legit', 'Bolu', 'Keripik', 'Rendang', 'Amplang', 'Dodol', 'Wingko', 'Sambal', 'Kopi', 'Teh Tarik', 'Lapis Surabaya', 'Madu'];
        foreach ($localKw as $kw) {
            if (Str::contains($name, $kw)) {
                return true;
            }
        }
        return false;
    }

    /** ~100 produk: [name, categoryName, base, fee, variantType]. */
    private function catalog(): array
    {
        return [
            // Sepatu
            ['Sepatu Nike Air Jordan 1 Low', 'Sepatu', 1650000, 150000, 'shoe'],
            ['Sneakers Adidas Stan Smith', 'Sepatu', 1100000, 100000, 'shoe'],
            ['Sepatu New Balance 530', 'Sepatu', 1350000, 120000, 'shoe'],
            ['Sepatu Converse Chuck 70 Hi', 'Sepatu', 950000, 90000, 'shoe'],
            ['Sepatu Vans Old Skool Classic', 'Sepatu', 850000, 85000, 'shoe'],
            ['Sepatu On Cloud 5 Running', 'Sepatu', 1900000, 170000, 'shoe'],
            ['Sepatu Asics Gel-Kayano 30', 'Sepatu', 2200000, 180000, 'shoe'],
            ['Sepatu Dr. Martens 1460 Boots', 'Sepatu', 2600000, 200000, 'shoe'],
            ['Sandal Birkenstock Arizona', 'Sepatu', 1400000, 120000, 'shoe'],
            ['Sepatu Salomon XT-6 Trail', 'Sepatu', 2800000, 220000, 'shoe'],

            // Olahraga
            ['Sepatu Lari Hoka Clifton 9', 'Olahraga', 2100000, 180000, 'shoe'],
            ['Jersey Bola Manchester United', 'Olahraga', 1300000, 110000, 'cloth'],
            ['Raket Badminton Yonex Astrox', 'Olahraga', 1800000, 150000, 'single'],
            ['Matras Yoga Manduka PRO', 'Olahraga', 1500000, 130000, 'color'],
            ['Dumbbell Set Adjustable 20kg', 'Olahraga', 1900000, 160000, 'single'],

            // Jam Tangan
            ['Jam Tangan Daniel Wellington Classic', 'Jam Tangan', 1200000, 100000, 'color'],
            ['Jam Tangan Seiko 5 Automatic', 'Jam Tangan', 2400000, 200000, 'single'],
            ['Jam Tangan Casio G-Shock GA-2100', 'Jam Tangan', 1450000, 130000, 'color'],
            ['Jam Tangan Fossil Neutra Chrono', 'Jam Tangan', 2200000, 180000, 'color'],
            ['Jam Tangan Tissot PRX Powermatic', 'Jam Tangan', 8500000, 400000, 'single'],

            // Perhiasan
            ['Kalung Emas Frank & Co 17K', 'Perhiasan', 4200000, 250000, 'single'],
            ['Gelang Pandora Moments', 'Perhiasan', 1600000, 140000, 'single'],
            ['Cincin Tunangan Berlian Mini', 'Perhiasan', 6500000, 350000, 'single'],
            ['Anting Tiffany Return to Heart', 'Perhiasan', 5200000, 300000, 'single'],

            // Tas & Dompet
            ['Tas Ransel Anello Oshi', 'Tas & Dompet', 650000, 60000, 'color'],
            ['Tas Selempang Longchamp Le Pliage', 'Tas & Dompet', 1750000, 175000, 'single'],
            ['Tas Tote Coach Field', 'Tas & Dompet', 3200000, 250000, 'color'],
            ['Dompet Kulit Fossil Derrick', 'Tas & Dompet', 950000, 90000, 'color'],
            ['Tas Michael Kors Jet Set', 'Tas & Dompet', 3800000, 280000, 'color'],
            ['Backpack Herschel Little America', 'Tas & Dompet', 1200000, 100000, 'color'],

            // Fashion
            ['Kaos Uniqlo UT Graphic Tee', 'Fashion', 250000, 35000, 'cloth'],
            ['Kemeja Flanel Uniqlo', 'Fashion', 400000, 45000, 'cloth'],
            ['Hoodie Champion Reverse Weave', 'Fashion', 850000, 80000, 'cloth'],
            ['Jaket Uniqlo Ultra Light Down', 'Fashion', 900000, 85000, 'cloth'],
            ['Dress Zara Summer Collection', 'Fashion', 750000, 80000, 'cloth'],
            ['Celana Chino Uniqlo Slim Fit', 'Fashion', 500000, 55000, 'cloth'],
            ['Kaos H&M Oversized Basic', 'Fashion', 200000, 30000, 'cloth'],
            ['Batik Tulis Premium Pekalongan', 'Fashion', 480000, 50000, 'cloth'],
            ['Kacamata Ray-Ban Wayfarer', 'Fashion', 1900000, 150000, 'single'],
            ['Topi New Era 9FORTY Yankees', 'Fashion', 550000, 55000, 'single'],
            ['Jaket Denim Levi\'s Trucker', 'Fashion', 1200000, 100000, 'cloth'],
            ['Scarf Sutra Motif Batik', 'Fashion', 320000, 40000, 'single'],

            // Skincare & Kecantikan
            ['Serum Laneige Water Bank', 'Skincare & Kecantikan', 520000, 55000, 'single'],
            ['Toner Anua Heartleaf 77%', 'Skincare & Kecantikan', 280000, 35000, 'single'],
            ['Cleanser COSRX Low pH Gel', 'Skincare & Kecantikan', 195000, 28000, 'single'],
            ['Essence SK-II Facial Treatment', 'Skincare & Kecantikan', 2800000, 220000, 'perfume'],
            ['Moisturizer Belif Aqua Bomb', 'Skincare & Kecantikan', 620000, 60000, 'single'],
            ['Lipstik MAC Ruby Woo', 'Skincare & Kecantikan', 420000, 45000, 'shade'],
            ['Cushion Laneige Neo Cushion', 'Skincare & Kecantikan', 550000, 55000, 'shade'],
            ['Eyeshadow Palette Huda Beauty', 'Skincare & Kecantikan', 950000, 95000, 'single'],
            ['Foundation Estée Lauder Double Wear', 'Skincare & Kecantikan', 850000, 80000, 'shade'],
            ['Serum The Ordinary Niacinamide', 'Skincare & Kecantikan', 180000, 25000, 'single'],
            ['Blush On Nars Orgasm', 'Skincare & Kecantikan', 620000, 60000, 'shade'],
            ['Retinol Paula\'s Choice 1%', 'Skincare & Kecantikan', 680000, 65000, 'single'],
            ['Lip Tint Rom&nd Juicy Lasting', 'Skincare & Kecantikan', 150000, 22000, 'shade'],

            // Parfum
            ['Parfum Jo Malone Lime Basil', 'Parfum', 1600000, 150000, 'perfume'],
            ['Parfum Chanel Chance Eau Tendre', 'Parfum', 2900000, 250000, 'perfume'],
            ['Parfum Dior Sauvage EDT', 'Parfum', 2400000, 200000, 'perfume'],
            ['Parfum YSL Black Opium', 'Parfum', 2600000, 210000, 'perfume'],
            ['Parfum Le Labo Santal 33', 'Parfum', 3200000, 260000, 'perfume'],

            // Makanan & Minuman
            ['Cokelat Royce Nama Chocolate', 'Makanan & Minuman', 320000, 45000, 'flavor'],
            ['Cokelat KitKat Jepang Matcha', 'Makanan & Minuman', 180000, 25000, 'flavor'],
            ['Milo Cube Malaysia 100pcs', 'Makanan & Minuman', 150000, 22000, 'single'],
            ['Kopi Bubuk Legend Aming', 'Makanan & Minuman', 95000, 15000, 'single'],
            ['Teh Tarik Aik Cheong 3in1', 'Makanan & Minuman', 85000, 14000, 'single'],
            ['Pie Susu Asli Bali Teuku Umar', 'Makanan & Minuman', 95000, 15000, 'pack'],
            ['Bakpia Kukus Tugu Jogja', 'Makanan & Minuman', 65000, 12000, 'flavor'],
            ['Lapis Legit Premium Pontianak', 'Makanan & Minuman', 350000, 40000, 'flavor'],
            ['Keripik Balado Christine Hakim', 'Makanan & Minuman', 75000, 12000, 'single'],
            ['Rendang Kering Uni Padang', 'Makanan & Minuman', 180000, 25000, 'pack'],
            ['Cokelat Cadbury Dairy Milk UK', 'Makanan & Minuman', 160000, 22000, 'flavor'],
            ['Snack Box Pocky Jepang 10pcs', 'Makanan & Minuman', 200000, 28000, 'pack'],
            ['Kurma Ajwa Premium Madinah', 'Makanan & Minuman', 320000, 40000, 'pack'],
            ['Cokelat Beryl\'s Malaysia', 'Makanan & Minuman', 175000, 24000, 'flavor'],
            ['Madu Sialang Hutan Riau', 'Makanan & Minuman', 140000, 20000, 'single'],

            // Elektronik
            ['Headphone Sony WH-CH520 Wireless', 'Elektronik', 550000, 50000, 'color'],
            ['Speaker JBL Flip 6 Portable', 'Elektronik', 1600000, 140000, 'color'],
            ['Kamera Fujifilm Instax Mini 12', 'Elektronik', 1250000, 100000, 'color'],
            ['Power Bank Anker 20000mAh', 'Elektronik', 650000, 60000, 'color'],
            ['SSD Samsung T7 1TB Portable', 'Elektronik', 1450000, 120000, 'single'],
            ['Action Cam GoPro Hero 12', 'Elektronik', 5500000, 350000, 'single'],
            ['Rice Cooker Zojirushi Import', 'Elektronik', 2200000, 180000, 'single'],

            // Gadget & Aksesoris
            ['Headset Apple AirPods Pro 2', 'Gadget & Aksesoris', 3500000, 250000, 'single'],
            ['Earbuds Samsung Galaxy Buds2 Pro', 'Gadget & Aksesoris', 2200000, 180000, 'color'],
            ['Keyboard Logitech MX Keys Mini', 'Gadget & Aksesoris', 1350000, 100000, 'color'],
            ['Mouse Logitech MX Master 3S', 'Gadget & Aksesoris', 1450000, 120000, 'color'],
            ['Smartwatch Apple Watch SE 2', 'Gadget & Aksesoris', 4200000, 300000, 'single'],
            ['Mechanical Keyboard Keychron K2', 'Gadget & Aksesoris', 1250000, 110000, 'color'],
            ['Tripod Manfrotto Compact', 'Gadget & Aksesoris', 850000, 80000, 'single'],

            // Hobi & Koleksi
            ['Figure Nendoroid Anime Import', 'Hobi & Koleksi', 750000, 70000, 'single'],
            ['Lego Icons Bonsai Tree', 'Hobi & Koleksi', 850000, 80000, 'single'],
            ['Vinyl Record The Beatles Abbey Road', 'Hobi & Koleksi', 650000, 60000, 'single'],
            ['Kartu Pokemon Booster Box JP', 'Hobi & Koleksi', 1400000, 120000, 'single'],
            ['Funko Pop Marvel Exclusive', 'Hobi & Koleksi', 420000, 45000, 'single'],

            // Mainan & Games
            ['Nintendo Switch OLED Model', 'Mainan & Games', 4300000, 300000, 'color'],
            ['Kaset Game PS5 Spider-Man 2', 'Mainan & Games', 950000, 90000, 'single'],
            ['Rubik GAN 356 Magnetic', 'Mainan & Games', 480000, 48000, 'single'],
            ['Hot Wheels Premium Set Import', 'Mainan & Games', 550000, 55000, 'single'],

            // Kesehatan
            ['Vitamin Blackmores Fish Oil 1000', 'Kesehatan', 380000, 42000, 'single'],
            ['Suplemen Nature Made Multivitamin', 'Kesehatan', 320000, 38000, 'single'],
            ['Thermometer Digital Omron', 'Kesehatan', 250000, 30000, 'single'],

            // Ibu & Bayi
            ['Stroller Bayi Cocolatte iSport', 'Ibu & Bayi', 2600000, 200000, 'color'],
            ['Botol Susu Pigeon SofTouch 3pcs', 'Ibu & Bayi', 320000, 38000, 'pack'],
            ['Diapers Merries Import Japan', 'Ibu & Bayi', 280000, 32000, 'single'],
        ];
    }
}
