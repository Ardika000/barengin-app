<?php

namespace App\Http\Controllers;

use App\Models\JastipCategory;
use App\Models\JastipItem;
use App\Support\FuzzySearch;
use App\Support\LocationFilter;
use App\Support\RegionResolver;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class JastipController extends Controller
{
    private const SERVICE_FEE = 5000; // biaya layanan flat per pesanan
    private const CART_KEY = 'jastip_cart';

    // ── Daftar produk (etalase pembeli) ──────────────────────────────────
    //
    // Sistem pencarian:
    //  - search : substring nama/brand produk. Jika 0 hasil, sarankan nama
    //             terdekat (toleransi typo, levenshtein + similar_text).
    //  - from_q : lokasi pembelian ("Dari") — substring di purchase_province/city/address.
    //  - to_q   : lokasi ambil ("Ke") — substring di pickup_province/city/address.
    //  - province/city, kategori & rentang harga sebagai filter sidebar.
    public function index(Request $request)
    {
        $search     = trim((string) $request->query('search', ''));
        $fromQ      = trim((string) $request->query('from_q', ''));
        $toQ        = trim((string) $request->query('to_q', ''));
        $categories = array_values(array_filter((array) $request->query('categories', [])));
        $province   = trim((string) $request->query('province', ''));   // lokasi ambil: provinsi (exact)
        $priceMin   = $request->query('price_min');
        $priceMax   = $request->query('price_max');
        $schedule   = trim((string) $request->query('schedule', ''));   // '', 'ongoing', atau 'upcoming'

        // Lokasi pengambilan hanya dilayani di Indonesia (lokasi pembelian bebas).
        // Hanya menolak bila lokasi TERBUKTI asing — teks yang gagal di-geocode
        // tetap diproses agar pencarian tak ikut mati saat Nominatim bermasalah.
        $foreignPickup = $toQ !== '' && (new RegionResolver())->isForeign($toQ);

        $indexQuery = $this->buildIndexQuery($search, $fromQ, $toQ, $categories, $province, $priceMin, $priceMax, $schedule);
        if ($foreignPickup) {
            $indexQuery->whereRaw('1 = 0');
        }

        $paginated = $indexQuery
            ->paginate(9)
            ->withQueryString();

        // Toleransi typo: bila kata kunci tidak menemukan apa pun, sarankan nama terdekat
        $suggestion = null;
        if ($search !== '' && $paginated->total() === 0) {
            $suggestion = $this->closestProductName($search);
        }

        // Rating penjual per pemilik produk di halaman ini (hindari N+1)
        $ownerIds = $paginated->getCollection()->pluck('user_id')->unique()->all();
        $ratings  = $this->ownerRatings($ownerIds);
        $owners   = DB::table('users')->whereIn('id', $ownerIds)->get(['id', 'full_name', 'profile_image'])->keyBy('id');
        $likedIds = $this->likedJastipIds($request);

        $paginated->getCollection()->transform(function (JastipItem $item) use ($ratings, $owners, $likedIds) {
            return $this->formatCard($item, $ratings, $owners, $likedIds);
        });

        return Inertia::render('Jastip/Index', [
            'products'   => $paginated,
            'suggestion' => $suggestion,
            // Ditampilkan sebagai peringatan di etalase saat user mengetik lokasi
            // pengambilan di luar negeri.
            'foreignPickup' => $foreignPickup,
            'filters'    => [
                'search'     => $search,
                'from_q'     => $fromQ,
                'to_q'       => $toQ,
                'categories' => $categories,
                'province'   => $province,
                'price_min'  => $priceMin,
                'price_max'  => $priceMax,
                'schedule'   => $schedule,
            ],
            'categories' => JastipCategory::orderBy('name')->get(['id', 'name', 'slug']),
            // Provinsi lokasi ambil yang benar-benar punya produk (untuk filter sidebar)
            'provinces'  => JastipItem::query()
                ->where('status', JastipItem::STATUS_PUBLISHED)
                ->whereNotNull('pickup_province')
                ->where('pickup_province', '!=', '')
                ->distinct()
                ->orderBy('pickup_province')
                ->pluck('pickup_province')
                ->values(),
        ]);
    }

    /** Query dasar etalase dengan seluruh filter pencarian. */
    private function buildIndexQuery(string $search, string $fromQ, string $toQ, array $categories, string $province, $priceMin, $priceMax, string $schedule = '')
    {
        $query = JastipItem::query()
            ->where('jastip_items.status', JastipItem::STATUS_PUBLISHED)
            // #1/#8: sembunyikan jastip yang sudah lewat (hanya sedang berlangsung / akan dibuka)
            ->activeWindow()
            ->leftJoinSub($this->soldSubquery(), 'sold', 'sold.jastip_item_id', '=', 'jastip_items.id')
            ->with(['jastip_item_images', 'category'])
            ->select('jastip_items.*', DB::raw('COALESCE(sold.sold, 0) as sold_count'))
            ->latest('jastip_items.created_at');

        // #9: filter jadwal — 'ongoing' (sedang berlangsung) atau 'upcoming' (akan dibuka)
        if (in_array($schedule, ['ongoing', 'upcoming'], true)) {
            $query->schedule($schedule);
        }

        if ($search !== '') {
            // Pencarian nama produk toleran salah-ketik → langsung tampilkan
            // hasil yang mirip (bukan sekadar saran "mungkin maksud Anda").
            FuzzySearch::apply($query, $search, ['jastip_items.name'], 'jastip_items.id');
        }
        // "Dari" — tempat barang dibeli. Boleh di luar negeri (mis. Kuala Lumpur).
        if ($fromQ !== '') {
            LocationFilter::structured(
                $query,
                $fromQ,
                'purchase_province',
                'purchase_city',
                "CONCAT_WS(' ', COALESCE(purchase_province,''), COALESCE(purchase_city,''), COALESCE(purchase_address,''))",
            );
        }
        // "Ke" — tempat pembeli mengambil barang (jastiper kembali). Wajib di
        // Indonesia; teks luar negeri ditolak agar tidak memberi hasil menyesatkan.
        if ($toQ !== '') {
            LocationFilter::structured(
                $query,
                $toQ,
                'pickup_province',
                'pickup_city',
                "CONCAT_WS(' ', COALESCE(pickup_province,''), COALESCE(pickup_city,''), COALESCE(pickup_address,''))",
            );
        }
        if (! empty($categories)) {
            $query->whereHas('category', fn ($q) => $q->whereIn('name', $categories));
        }
        if ($province !== '') {
            $query->where('jastip_items.pickup_province', $province);
        }
        if (is_numeric($priceMin)) {
            $query->whereRaw('(jastip_items.base_price + jastip_items.jastip_fee) >= ?', [(float) $priceMin]);
        }
        if (is_numeric($priceMax)) {
            $query->whereRaw('(jastip_items.base_price + jastip_items.jastip_fee) <= ?', [(float) $priceMax]);
        }

        return $query;
    }

    /** Nama produk terdekat dengan kata kunci (untuk saran "mungkin maksud Anda"). */
    private function closestProductName(string $search): ?string
    {
        $needle = mb_strtolower($search);
        $names  = JastipItem::where('status', JastipItem::STATUS_PUBLISHED)->pluck('name');

        $best = null;
        $bestScore = 0.0;
        foreach ($names as $name) {
            $hay = mb_strtolower($name);

            // Skor terbaik antara nama penuh dan tiap kata di dalamnya
            $candidates = array_merge([$hay], preg_split('/\s+/', $hay) ?: []);
            foreach ($candidates as $cand) {
                if ($cand === '') {
                    continue;
                }
                similar_text($needle, $cand, $pct);
                $lev = levenshtein($needle, $cand);
                // Cocok bila mirip >= 60% atau salah ketik kecil (jarak <= 1/3 panjang)
                $ok = $pct >= 60 || $lev <= max(1, (int) floor(mb_strlen($needle) / 3));
                if ($ok && $pct > $bestScore) {
                    $bestScore = $pct;
                    $best = $name;
                }
            }
        }

        return $best;
    }

    /** ID item jastip yang di-like user saat ini. */
    private function likedJastipIds(Request $request): array
    {
        if (! $request->user()) {
            return [];
        }

        return DB::table('favorites')
            ->where('user_id', $request->user()->id)
            ->where('favoritable_type', 'jastip')
            ->pluck('favoritable_id')
            ->flip()
            ->all();
    }

    // ── Detail produk ────────────────────────────────────────────────────
    public function show(Request $request, $id)
    {
        $item = JastipItem::query()
            ->where('jastip_items.id', $id)
            ->where('jastip_items.status', JastipItem::STATUS_PUBLISHED)
            ->with(['jastip_item_images', 'jastip_item_variants', 'category'])
            ->select('jastip_items.*')
            ->first();

        if (! $item) {
            abort(404);
        }

        $owner    = DB::table('users')->where('id', $item->user_id)->first(['id', 'username', 'full_name', 'profile_image']);
        $rating   = $this->accountRating((int) $item->user_id, 'jastiper');
        $likedIds = $this->likedJastipIds($request);

        // Terjual per varian (untuk sisa stok tiap varian)
        $soldByVariant = DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->where('jastip_orders.order_status', 'paid')
            ->whereIn('jastip_order_items.jastip_item_variant_id', $item->jastip_item_variants->pluck('id'))
            ->groupBy('jastip_item_variant_id')
            ->pluck(DB::raw('SUM(quantity)'), 'jastip_item_variant_id');

        // Varian datar (satu tingkat) — masing-masing punya stok, min beli, & gambar sendiri
        $variants = $item->jastip_item_variants->map(function ($v) use ($soldByVariant) {
            $sold = (int) ($soldByVariant[$v->id] ?? 0);
            return [
                'id'        => $v->id,
                'value'     => $v->var_value,
                'price'     => (float) $v->additional_price,
                'stock'     => (int) $v->stock,
                'remaining' => max(0, (int) $v->stock - $sold),
                'min_buy'   => max(1, (int) $v->min_buy),
                'image'     => $v->image_name ? $this->resolveImage($v->image_name) : null,
            ];
        })->values();

        $totalRemaining = $variants->sum('remaining');
        $soldOut = $totalRemaining <= 0;

        // Galeri: gambar produk (base) + gambar varian yang ada (tanpa duplikat)
        $baseImages    = $item->jastip_item_images->map(fn ($img) => $this->resolveImage($img->image_name))->values();
        $variantImages = $variants->pluck('image')->filter()->values();
        $gallery       = $baseImages->merge($variantImages)->unique()->values();

        // Produk lain dari jastiper yang sama
        $others = JastipItem::query()
            ->where('jastip_items.user_id', $item->user_id)
            ->where('jastip_items.id', '!=', $item->id)
            ->where('jastip_items.status', JastipItem::STATUS_PUBLISHED)
            ->activeWindow()
            ->leftJoinSub($this->soldSubquery(), 'sold', 'sold.jastip_item_id', '=', 'jastip_items.id')
            ->with(['jastip_item_images', 'category'])
            ->select('jastip_items.*', DB::raw('COALESCE(sold.sold, 0) as sold_count'))
            ->latest('jastip_items.created_at')
            ->limit(6)
            ->get()
            ->map(fn ($o) => $this->formatCard(
                $o,
                [(int) $item->user_id => $rating['average']],
                collect([$owner?->id => $owner]),
                $likedIds,
            ));

        return Inertia::render('Jastip/Show', [
            'product' => [
                'id'          => $item->id,
                'name'        => $item->name,
                'category'    => $item->category?->name,
                'description' => $item->description,
                'base_price'  => (float) $item->base_price,
                'jastip_fee'  => (float) $item->jastip_fee,
                'total_price' => $item->totalPrice(),
                'remaining'   => (int) $totalRemaining,
                'sold_out'    => $soldOut,
                'liked'       => isset($likedIds[$item->id]),
                'has_variants' => (bool) $item->has_variants,
                'min_buy'     => (int) $item->min_buy,
                'weight_gram' => $item->weight_gram ? (float) $item->weight_gram : null,
                'start_date'      => optional($item->start_date)->translatedFormat('d F Y'),
                'end_date'        => optional($item->end_date)->translatedFormat('d F Y'),
                // #4: 'upcoming' (akan dibuka) menonaktifkan pemesanan → tombol jadi "tambah favorit"
                'schedule_status' => $item->scheduleStatus(), // upcoming | ongoing | closed
                // Jendela pengambilan barang oleh pembeli
                'pickup_start_date' => optional($item->pickup_start_date)->translatedFormat('d F Y'),
                'pickup_end_date'   => optional($item->pickup_end_date)->translatedFormat('d F Y'),
                'images'      => $gallery,
                'variants'    => $variants,
                // Lokasi pembelian (dibeli di) & lokasi ambil (tiba di / titik temu)
                'origin'          => $item->purchase_city ?: $item->purchase_province,
                'origin_region'   => $item->purchase_province,
                'destination'     => $item->pickup_city ?: $item->pickup_province,
                'pickup_province' => $item->pickup_province,
                'pickup_city'     => $item->pickup_city,
                'pickup_address'  => $item->pickup_address,
                'owner'       => [
                    'id'       => $owner?->id ?? $item->user_id,
                    'username' => $owner?->username,
                    'name'     => $owner?->full_name ?? 'Jastiper',
                    'avatar'   => $this->resolveAvatarUrl($owner?->profile_image),
                    'rating'   => $rating['average'],
                ],
            ],
            'related' => $others,
        ]);
    }

    // ── Keranjang (session) ──────────────────────────────────────────────
    public function addToCart(Request $request)
    {
        $data = $request->validate([
            'item_id'    => ['required', 'integer'],
            'variant_id' => ['required', 'integer'],
            'quantity'   => ['required', 'integer', 'min:1'],
        ]);

        $item = JastipItem::where('status', JastipItem::STATUS_PUBLISHED)->find($data['item_id']);
        if (! $item) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Produk tidak ditemukan.']);
        }
        // #4: hanya jastip yang sedang berlangsung yang bisa dipesan
        if ($item->scheduleStatus() !== 'ongoing') {
            return back()->with('flash', [
                'type' => 'info',
                'message' => $item->scheduleStatus() === 'upcoming'
                    ? 'Jastip ini belum dibuka. Simpan ke favorit dulu, ya.'
                    : 'Masa pemesanan jastip ini sudah berakhir.',
            ]);
        }
        // Pastikan varian milik produk ini
        $variantValid = DB::table('jastip_item_variants')
            ->where('id', $data['variant_id'])
            ->where('jastip_item_id', $item->id)
            ->exists();
        if (! $variantValid) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Varian tidak valid.']);
        }

        $cart = $request->session()->get(self::CART_KEY, []);
        $key  = $data['item_id'] . '-' . $data['variant_id'];

        if (isset($cart[$key])) {
            $cart[$key]['quantity'] += $data['quantity'];
        } else {
            $cart[$key] = [
                'item_id'    => (int) $data['item_id'],
                'variant_id' => (int) $data['variant_id'],
                'quantity'   => (int) $data['quantity'],
            ];
        }

        $request->session()->put(self::CART_KEY, $cart);

        // Tetap di halaman produk — indikator keranjang melayang yang mengarahkan ke checkout
        return back()->with('flash', [
            'type'    => 'success',
            'message' => __('Barang ditambahkan ke keranjang.'),
        ]);
    }

    /** Sinkronkan isi keranjang dari halaman checkout (ubah qty / hapus baris). */
    public function updateCart(Request $request)
    {
        $data = $request->validate([
            'items'              => ['present', 'array'],
            'items.*.item_id'    => ['required', 'integer'],
            'items.*.variant_id' => ['required', 'integer'],
            'items.*.quantity'   => ['required', 'integer', 'min:1'],
        ]);

        $cart = [];
        foreach ($data['items'] as $line) {
            $cart[$line['item_id'] . '-' . $line['variant_id']] = [
                'item_id'    => (int) $line['item_id'],
                'variant_id' => (int) $line['variant_id'],
                'quantity'   => (int) $line['quantity'],
            ];
        }
        $request->session()->put(self::CART_KEY, $cart);

        return response()->json(['count' => collect($cart)->sum('quantity')]);
    }

    // ── Halaman checkout ─────────────────────────────────────────────────
    public function checkout(Request $request)
    {
        $lines = $this->resolveCartLines($request->session()->get(self::CART_KEY, []));

        if (empty($lines)) {
            return redirect()->route('jastip')->with('flash', [
                'type' => 'info', 'message' => 'Keranjang jastip Anda masih kosong.',
            ]);
        }

        $subtotal = array_sum(array_map(fn ($l) => $l['price'] * $l['quantity'], $lines));

        return Inertia::render('Jastip/Checkout', [
            'items' => array_values($lines),
            'summary' => [
                'subtotal'    => $subtotal,
                'service_fee' => self::SERVICE_FEE,
                'shipping'    => 0,
                'total'       => $subtotal + self::SERVICE_FEE,
            ],
            // Client key HARUS pasangan MIDTRANS_SERVER_KEY (merchant M334317500).
            // Token Snap dibuat dengan server key; popup snap.js hanya bisa
            // merender token dari merchant yang sama.
            'midtrans_client_key' => config('midtrans.client_key'),
        ]);
    }

    // ── Proses pembayaran (Midtrans Snap) ────────────────────────────────
    public function processPayment(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Silakan login terlebih dahulu.'], 401);
        }

        $data = $request->validate([
            'items'                => ['required', 'array', 'min:1'],
            'items.*.item_id'      => ['required', 'integer'],
            'items.*.variant_id'   => ['required', 'integer'],
            'items.*.quantity'     => ['required', 'integer', 'min:1'],
        ]);

        // Susun ulang harga dari DB (jangan percaya harga dari client)
        $lines = $this->resolveCartLines($data['items']);
        if (empty($lines)) {
            return response()->json(['error' => 'Keranjang tidak valid.'], 422);
        }

        // Validasi sisa stok tiap produk
        foreach ($lines as $line) {
            if ($line['remaining'] !== null && $line['quantity'] > $line['remaining']) {
                return response()->json([
                    'error' => "Stok \"{$line['name']}\" tidak cukup. Sisa: {$line['remaining']}.",
                ], 422);
            }
        }

        // Jumlahkan dari harga per-baris yang SUDAH dibulatkan agar gross_amount cocok
        // persis dengan sum(item_details) yang dikirim ke Midtrans (hindari selisih
        // pembulatan yang memicu error 400). (#12)
        $totalAmount = array_sum(array_map(
            fn ($l) => ((int) round($l['price'])) * (int) $l['quantity'],
            $lines,
        )) + self::SERVICE_FEE;

        $transactionId = (string) Str::uuid();

        try {
            DB::transaction(function () use ($transactionId, $user, $totalAmount, $lines) {
                DB::table('transactions')->insert([
                    'id'             => $transactionId,
                    'user_id'        => $user->id,
                    'total_amount'   => $totalAmount,
                    'type'           => 'jastip',
                    'payment_method' => 'Midtrans',
                    'expired_at'     => now()->addHours(24),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                $orderId = DB::table('jastip_orders')->insertGetId([
                    'transaction_id'   => $transactionId,
                    'use_shipping'     => false,
                    'shipping_address' => '-',
                    'order_status'     => 'pending',
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);

                foreach ($lines as $line) {
                    DB::table('jastip_order_items')->insert([
                        'jastip_order_id'        => $orderId,
                        'jastip_item_id'         => $line['item_id'],
                        'jastip_item_variant_id' => $line['variant_id'],
                        'quantity'               => $line['quantity'],
                        'created_at'             => now(),
                        'updated_at'             => now(),
                    ]);
                }

                DB::table('jastip_orders_fees')->insert([
                    'jastip_order_id' => $orderId,
                    'fee_name'        => 'Biaya Layanan',
                    'amount'          => self::SERVICE_FEE,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            });
        } catch (\Throwable $e) {
            \Log::error('[BARENGIN] Gagal insert transaksi jastip: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal menyimpan transaksi.'], 500);
        }

        // Keranjang bisa berisi banyak item: kirim nama item pertama + sisa
        // jumlahnya sebagai PARAMETER, biar kalimat "X + 2 lainnya" dirakit di
        // frontend sesuai bahasa aktif.
        $first = reset($lines);

        \App\Models\UserNotification::send(
            (int) $user->id,
            'order.created',
            [
                'name' => $first['name'] ?? null,
                'more' => max(0, count($lines) - 1),
                'kind' => 'jastip',
                'amount' => (float) $totalAmount,
            ],
            '/profile-history?tab=transactions',
            'order.created:trx:' . $transactionId,
        );

        // Konfigurasi Midtrans
        \Midtrans\Config::$serverKey    = config('midtrans.server_key');
        \Midtrans\Config::$isProduction = config('midtrans.is_production', false);
        \Midtrans\Config::$isSanitized  = true;
        \Midtrans\Config::$is3ds        = true;

        // array_values penting: $lines dikunci string "item-variant", tanpa ini
        // item_details ter-encode sebagai objek JSON (bukan array) sehingga Midtrans
        // menolak dengan "item_details ... is required / not a number". (#12)
        $itemDetails = array_map(fn ($l) => [
            'id'       => 'JITEM-' . $l['item_id'] . '-' . $l['variant_id'],
            'price'    => (int) round($l['price']),
            'quantity' => (int) $l['quantity'],
            'name'     => substr($l['name'], 0, 50),
        ], array_values($lines));
        $itemDetails[] = [
            'id'       => 'SERVICE-FEE',
            'price'    => self::SERVICE_FEE,
            'quantity' => 1,
            'name'     => 'Biaya Layanan',
        ];

        $params = [
            'transaction_details' => [
                'order_id'     => $transactionId,
                'gross_amount' => $totalAmount,
            ],
            'item_details'     => $itemDetails,
            'customer_details' => [
                'first_name' => $user->full_name ?? $user->name ?? 'Pengguna',
                'email'      => $user->email,
                'phone'      => $user->phone ?? '08000000000',
            ],
        ];

        try {
            $snapToken = \Midtrans\Snap::getSnapToken($params);

            DB::table('transactions')->where('id', $transactionId)->update([
                'snap_token' => $snapToken,
                'updated_at' => now(),
            ]);

            // Kosongkan keranjang setelah transaksi dibuat
            $request->session()->forget(self::CART_KEY);

            return response()->json([
                'snap_token'     => $snapToken,
                'transaction_id' => $transactionId,
            ]);
        } catch (\Throwable $e) {
            // Rollback bila Midtrans gagal
            DB::table('jastip_orders')->where('transaction_id', $transactionId)->delete();
            DB::table('transactions')->where('id', $transactionId)->delete();

            \Log::error('[BARENGIN] Gagal Snap Token jastip: ' . $e->getMessage());
            // #12: tampilkan pesan asli Midtrans saat debug agar mudah didiagnosa
            // (mis. mismatch server/client key, atau gross_amount tidak cocok).
            return response()->json([
                'error'  => 'Gagal menghubungi Midtrans.',
                'detail' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // ── Halaman sukses ───────────────────────────────────────────────────
    public function success(Request $request, string $transaction)
    {
        // Sinkronkan status pembayaran (localhost tanpa webhook publik)
        if ($request->user()) {
            MidtransController::syncPendingForUser($request->user()->id);
        }

        $tx = DB::table('transactions')
            ->where('id', $transaction)
            ->where('user_id', optional($request->user())->id)
            ->where('type', 'jastip')
            ->first();

        if (! $tx) {
            abort(404);
        }

        $order = DB::table('jastip_orders')->where('transaction_id', $tx->id)->first();
        if (! $order) {
            abort(404);
        }

        $items = DB::table('jastip_order_items')
            ->join('jastip_items', 'jastip_order_items.jastip_item_id', '=', 'jastip_items.id')
            ->leftJoin('jastip_item_variants', 'jastip_order_items.jastip_item_variant_id', '=', 'jastip_item_variants.id')
            ->where('jastip_order_items.jastip_order_id', $order->id)
            ->select(
                'jastip_items.id as item_id',
                'jastip_items.name',
                'jastip_items.base_price',
                'jastip_items.jastip_fee',
                'jastip_item_variants.var_value',
                'jastip_item_variants.additional_price',
                'jastip_item_variants.image_name as variant_image',
                'jastip_order_items.quantity',
            )
            ->get()
            ->map(function ($r) {
                $img = $r->variant_image
                    ?: optional(DB::table('jastip_item_images')->where('jastip_item_id', $r->item_id)->first())->image_name;
                return [
                    'name'     => $r->name,
                    'variant'  => $r->var_value,
                    'price'    => (float) $r->base_price + (float) $r->jastip_fee + (float) $r->additional_price,
                    'quantity' => (int) $r->quantity,
                    'image'    => $this->resolveImage($img),
                ];
            })
            ->values();

        return Inertia::render('Jastip/Success', [
            'order' => [
                'code'       => 'JSTP-' . str_pad($order->id, 6, '0', STR_PAD_LEFT),
                'status'     => $order->order_status,
                'total'      => (float) $tx->total_amount,
                'items'      => $items,
            ],
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    /** Ubah daftar baris keranjang (item_id, variant_id, quantity) menjadi baris lengkap dengan harga. */
    private function resolveCartLines(array $cart): array
    {
        $lines = [];
        foreach ($cart as $entry) {
            $itemId    = (int) ($entry['item_id'] ?? 0);
            $variantId = (int) ($entry['variant_id'] ?? 0);
            $quantity  = max(1, (int) ($entry['quantity'] ?? 1));
            if (! $itemId || ! $variantId) {
                continue;
            }

            $row = DB::table('jastip_items')
                ->join('jastip_item_variants', function ($join) use ($variantId) {
                    $join->on('jastip_item_variants.jastip_item_id', '=', 'jastip_items.id')
                        ->where('jastip_item_variants.id', '=', $variantId);
                })
                ->leftJoinSub($this->soldByVariantSubquery(), 'sv', 'sv.jastip_item_variant_id', '=', 'jastip_item_variants.id')
                ->where('jastip_items.id', $itemId)
                ->where('jastip_items.status', JastipItem::STATUS_PUBLISHED)
                ->whereNull('jastip_items.deleted_at') // item terhapus tidak bisa dibeli
                ->select(
                    'jastip_items.id',
                    'jastip_items.name',
                    'jastip_items.base_price',
                    'jastip_items.jastip_fee',
                    'jastip_item_variants.id as variant_id',
                    'jastip_item_variants.var_name',
                    'jastip_item_variants.var_value',
                    'jastip_item_variants.additional_price',
                    'jastip_item_variants.stock',
                    'jastip_item_variants.image_name as variant_image',
                    DB::raw('COALESCE(sv.vsold, 0) as vsold'),
                )
                ->first();

            if (! $row || ! $row->variant_id) {
                continue; // produk/varian tidak valid -> lewati
            }

            $price     = (float) $row->base_price + (float) $row->jastip_fee + (float) $row->additional_price;
            $remaining = max(0, (int) $row->stock - (int) $row->vsold);
            $image     = $row->variant_image
                ?: optional(DB::table('jastip_item_images')->where('jastip_item_id', $itemId)->first())->image_name;

            $lines[$itemId . '-' . $variantId] = [
                'item_id'      => $itemId,
                'variant_id'   => (int) $row->variant_id,
                'name'         => $row->name,
                'variant_name' => $row->var_name,
                'variant'      => $row->var_value,
                'price'        => $price,
                'quantity'     => $quantity,
                'remaining'    => $remaining,
                'image'        => $this->resolveImage($image),
            ];
        }

        return $lines;
    }

    /** Terjual per varian (jumlah quantity dari order berbayar, dikelompokkan per variant id). */
    private function soldByVariantSubquery()
    {
        return DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->where('jastip_orders.order_status', 'paid')
            ->groupBy('jastip_item_variant_id')
            ->select('jastip_item_variant_id', DB::raw('SUM(quantity) as vsold'));
    }

    private function soldSubquery()
    {
        return DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->where('jastip_orders.order_status', 'paid')
            ->groupBy('jastip_item_id')
            ->select('jastip_item_id', DB::raw('SUM(quantity) as sold'));
    }

    /** Rata-rata rating (type jastiper) per pemilik produk. */
    private function ownerRatings(array $ownerIds): array
    {
        if (empty($ownerIds)) {
            return [];
        }

        return DB::table('user_ratings')
            ->whereIn('rated_user_id', $ownerIds)
            ->where('type', 'jastiper')
            ->groupBy('rated_user_id')
            ->select('rated_user_id', DB::raw('AVG(rating_amount) as avg_rating'))
            ->pluck('avg_rating', 'rated_user_id')
            ->map(fn ($v) => round((float) $v, 1))
            ->all();
    }

    /** Bentuk data untuk komponen JastipCard (dipakai etalase & produk terkait). */
    private function formatCard(JastipItem $item, array $ratings, $owners, array $likedIds = []): array
    {
        $sold      = (int) ($item->sold_count ?? 0);
        $isSoldOut = $item->max_slot > 0 && $sold >= $item->max_slot;
        $owner     = $owners[$item->user_id] ?? null;

        // Tag status jadwal jastip (mulai/berakhir)
        $now = Carbon::now();
        if ($item->start_date && $now->lt(Carbon::parse($item->start_date))) {
            $tag = ['type' => 'upcoming', 'date' => Carbon::parse($item->start_date)->translatedFormat('d M Y')];
        } elseif ($item->end_date) {
            $tag = ['type' => 'ongoing', 'date' => Carbon::parse($item->end_date)->translatedFormat('d M Y')];
        } else {
            $tag = null;
        }

        return [
            'id'          => $item->id,
            'name'        => $item->name,
            'category'    => $item->category?->name,
            'price'       => $item->totalPrice(),
            'sold'        => $sold,
            'max_slot'    => (int) $item->max_slot,
            'sold_out'    => $isSoldOut,
            // from = tempat pembelian (dibeli di) · to = tempat ambil (tiba di)
            'from'        => $item->purchase_city ?: $item->purchase_province,
            'to'          => $item->pickup_city ?: $item->pickup_province,
            'tag'         => $tag,
            'href'        => '/jastip/' . $item->id,
            'liked'       => isset($likedIds[$item->id]),
            'image'       => $item->relationLoaded('jastip_item_images') && $item->jastip_item_images->isNotEmpty()
                ? $this->resolveImage($item->jastip_item_images->first()->image_name)
                : '/assets/default-image.png',
            'author'      => $owner->full_name ?? 'Jastiper',
            'avatar'      => $this->resolveAvatarUrl($owner->profile_image ?? null),
            'rating'      => number_format((float) ($ratings[$item->user_id] ?? 0), 1),
        ];
    }

    private function resolveImage(?string $path): string
    {
        if (! $path) {
            return '/assets/default-image.png';
        }
        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }
        return asset('storage/' . $path);
    }
}
