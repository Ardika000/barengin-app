<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\JastipCategory;
use App\Models\JastipItem;
use App\Models\JastipItemImage;
use App\Models\JastipItemVariant;
use App\Support\FuzzySearch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminJastipController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id();

        $search       = trim((string) $request->query('search', ''));
        $sort         = (string) $request->query('sort', 'latest');
        $status       = (string) $request->query('status', 'all');
        $ordersSearch = trim((string) $request->query('orders_search', ''));

        $itemsQuery = JastipItem::query()
            ->where('user_id', $userId)
            ->with(['jastip_item_images', 'category'])
            ->leftJoinSub($this->soldSubquery(), 'sold', 'sold.jastip_item_id', '=', 'jastip_items.id')
            ->select('jastip_items.*', DB::raw('COALESCE(sold.sold, 0) as sold_count'));

        if ($status !== 'all') {
            $itemsQuery->jastiperStatus($status);
        }

        if ($search !== '') {
            // Nama fuzzy, kategori tetap substring biasa.
            $nameIds = FuzzySearch::ids($itemsQuery, $search, ['jastip_items.name'], 'jastip_items.id');
            $itemsQuery->where(function ($w) use ($nameIds, $search) {
                $w->whereIn('jastip_items.id', $nameIds)
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        match ($sort) {
            'best'  => $itemsQuery->orderByDesc('sold_count'),
            'stock' => $itemsQuery->orderByRaw('(jastip_items.max_slot - COALESCE(sold.sold, 0)) desc'),
            default => $itemsQuery->latest('jastip_items.created_at'),
        };

        $items = $itemsQuery->paginate(12, ['*'], 'page')
            ->withQueryString()
            ->through(fn ($item) => $this->formatCard($item));

        $ordersQuery = DB::table('jastip_order_items')
            ->join('jastip_items', 'jastip_order_items.jastip_item_id', '=', 'jastip_items.id')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->join('transactions', 'jastip_orders.transaction_id', '=', 'transactions.id')
            ->join('users', 'transactions.user_id', '=', 'users.id')
            ->leftJoin('jastip_item_variants', 'jastip_order_items.jastip_item_variant_id', '=', 'jastip_item_variants.id')
            ->where('jastip_items.user_id', $userId);

        if ($ordersSearch !== '') {
            FuzzySearch::apply(
                $ordersQuery,
                $ordersSearch,
                ['users.full_name', 'users.username', 'jastip_items.name'],
                'jastip_order_items.id',
            );
        }

        $orders = $ordersQuery
            ->orderByDesc('jastip_orders.created_at')
            ->select(
                'jastip_order_items.id',
                'jastip_orders.id as order_id',
                'jastip_orders.order_status',
                'jastip_orders.use_shipping',
                'jastip_items.name as item_name',
                'jastip_items.status as item_status',
                'jastip_items.end_date as item_end_date',
                'jastip_items.pickup_start_date as item_pickup_start_date',
                'jastip_items.pickup_end_date as item_pickup_end_date',
                'jastip_item_variants.var_value as variant',
                'jastip_order_items.quantity',
                'users.full_name as buyer_name',
                'users.username as buyer_username',
                'users.profile_image as buyer_image',
            )
            ->paginate(5, ['*'], 'orders_page')
            ->withQueryString()
            ->through(fn ($o) => [
                'id'       => $o->id,
                'code'     => 'ORD-' . str_pad($o->order_id, 6, '0', STR_PAD_LEFT),
                'buyer'    => $o->buyer_name,
                'username' => $o->buyer_username,
                'avatar'   => $this->resolveAvatarUrl($o->buyer_image),
                'item'     => $o->item_name . ($o->variant ? ' - ' . $o->variant : ''),
                'qty'      => (int) $o->quantity,
                'shipping' => (bool) $o->use_shipping,
                'status'   => $o->order_status,
                'jastiper_status' => JastipItem::jastiperStatusOf(
                    $o->item_status,
                    $o->item_end_date,
                    $o->item_pickup_start_date,
                    $o->item_pickup_end_date,
                ),
            ]);

        return Inertia::render('Admin/Jastip/Index', [
            'items'  => $items,
            'orders' => $orders,
            'filters' => [
                'search'        => $search,
                'sort'          => $sort,
                'status'        => $status,
                'orders_search' => $ordersSearch,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Jastip/Create', [
            'categories' => $this->categoriesPayload(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateItem($request, true);
        $item = $this->persistItem(new JastipItem(['user_id' => Auth::id()]), $request, $data);

        ActivityLog::record('Membuat jastip: ' . $item->name);

        (new \App\Services\Chat\GroupConversationService())->ensureJastipGroup($item->id, $item->user_id);

        return redirect()->route('admin.jastip.index')->with('flash', [
            'type' => 'success',
            'message' => $item->isDraft() ? 'Jastip disimpan sebagai draft.' : 'Jastip berhasil dipublish.',
        ]);
    }

    public function edit($id)
    {
        $item = JastipItem::where('user_id', Auth::id())
            ->with(['jastip_item_variants', 'jastip_item_images'])
            ->findOrFail($id);

        if (! $item->isDraft()) {
            return redirect()->route('admin.jastip.index')->with('flash', [
                'type' => 'info',
                'message' => 'Jastip yang sudah dipublish tidak dapat diedit lagi.',
            ]);
        }

        $variants = $item->jastip_item_variants->map(fn ($v) => [
            'value'      => $v->var_value,
            'price'      => (float) $v->additional_price,
            'stock'      => (int) $v->stock,
            'min_buy'    => (int) $v->min_buy,
            'image_name' => $v->image_name,
            'image_url'  => $v->image_name ? $this->resolveImageUrl($v->image_name) : null,
        ])->values();

        // Mode tanpa varian: stok/min diambil dari varian "Original".
        $original = $item->jastip_item_variants->first();

        return Inertia::render('Admin/Jastip/Edit', [
            'categories' => $this->categoriesPayload(),
            'item' => [
                'id'                 => $item->id,
                'name'               => $item->name,
                'jastip_category_id' => $item->jastip_category_id,
                'description'        => $item->description,
                'pickup_province'    => $item->pickup_province,
                'pickup_city'        => $item->pickup_city,
                'pickup_address'     => $item->pickup_address,
                'purchase_province'  => $item->purchase_province,
                'purchase_city'      => $item->purchase_city,
                'purchase_address'   => $item->purchase_address,
                'base_price'         => (float) $item->base_price,
                'jastip_fee'         => (float) $item->jastip_fee,
                'has_variants'       => (bool) $item->has_variants,
                'max_slot'           => (int) ($original->stock ?? $item->max_slot),
                'min_buy'            => (int) ($original->min_buy ?? $item->min_buy),
                'start_date'         => optional($item->start_date)->format('Y-m-d'),
                'end_date'           => optional($item->end_date)->format('Y-m-d'),
                'pickup_start_date'  => optional($item->pickup_start_date)->format('Y-m-d'),
                'pickup_end_date'    => optional($item->pickup_end_date)->format('Y-m-d'),
                'status'             => $item->status,
                'variants'           => $variants,
                'existing_images'    => $item->jastip_item_images->map(fn ($img) => [
                    'id' => $img->id,
                    'url' => $this->resolveImageUrl($img->image_name),
                ])->values(),
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $item = JastipItem::where('user_id', Auth::id())->findOrFail($id);

        if (! $item->isDraft()) {
            return redirect()->route('admin.jastip.index')->with('flash', [
                'type' => 'info',
                'message' => 'Jastip yang sudah dipublish tidak dapat diedit lagi.',
            ]);
        }

        $data = $this->validateItem($request);
        $this->persistItem($item, $request, $data);

        ActivityLog::record('Memperbarui jastip: ' . $item->name);

        return redirect()->route('admin.jastip.index')->with('flash', [
            'type' => 'success',
            'message' => 'Jastip berhasil diperbarui.',
        ]);
    }

    public function destroy($id)
    {
        $item = JastipItem::where('user_id', Auth::id())->findOrFail($id);
        $name = $item->name;

        // Draft tak pernah tampil di etalase, jadi mustahil punya pesanan/dana pembeli.
        if (! $item->canBeDeleted()) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Jastip yang sudah dipublish tidak dapat dihapus.',
            ]);
        }

        // Soft delete biar referensi lama tidak putus; file gambar sengaja disisakan.
        $item->delete();

        ActivityLog::record('Menghapus draft jastip: ' . $name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Draft jastip berhasil dihapus.']);
    }

    public function publish($id)
    {
        $item = JastipItem::where('user_id', Auth::id())->findOrFail($id);
        $item->update(['status' => JastipItem::STATUS_PUBLISHED]);

        ActivityLog::record('Mempublikasikan jastip: ' . $item->name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Jastip berhasil dipublish.']);
    }

    // Bagikan kartu "ambil barang" ke grup jastip lalu buka petanya.
    public function shareTrack($id)
    {
        $item = JastipItem::where('user_id', Auth::id())->findOrFail($id);

        if ($item->jastiperStatus() !== 'pickup_time') {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Pantau pengambilan hanya tersedia saat masa pengambilan barang.',
            ]);
        }

        \App\Services\Chat\JastipTrackShare::share($item);

        ActivityLog::record('Membagikan pantau pengambilan jastip: ' . $item->name);

        return redirect()->route('jastip.track', $item->id);
    }

    // Sengaja tidak ikut kunci "published tak bisa diedit"; flag ini boleh diubah kapan pun.
    public function toggleRequests($id)
    {
        $item = JastipItem::where('user_id', Auth::id())->findOrFail($id);
        $item->update(['allow_requests' => ! $item->allow_requests]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => $item->allow_requests
                ? 'Jastip ini kini menerima request titipan.'
                : 'Jastip ini berhenti menerima request titipan.',
        ]);
    }

    // Duplikat jastip selesai jadi draft baru tanpa tanggal, lalu arahkan ke form edit.
    public function reopen($id)
    {
        $source = JastipItem::where('user_id', Auth::id())
            ->with(['jastip_item_variants', 'jastip_item_images'])
            ->findOrFail($id);

        if ($source->jastiperStatus() !== 'finished') {
            return redirect()->route('admin.jastip.index')->with('flash', [
                'type' => 'info',
                'message' => 'Hanya jastip yang sudah selesai yang dapat dibuka ulang.',
            ]);
        }

        $new = DB::transaction(function () use ($source) {
            $new = JastipItem::create([
                'user_id'            => Auth::id(),
                'jastip_category_id' => $source->jastip_category_id,
                'name'               => $source->name,
                'description'        => $source->description,
                'pickup_province'    => $source->pickup_province,
                'pickup_city'        => $source->pickup_city,
                'pickup_address'     => $source->pickup_address,
                'purchase_province'  => $source->purchase_province,
                'purchase_city'      => $source->purchase_city,
                'purchase_address'   => $source->purchase_address,
                'base_price'         => $source->base_price,
                'jastip_fee'         => $source->jastip_fee,
                'has_variants'       => $source->has_variants,
                'max_slot'           => $source->max_slot,
                'min_buy'            => $source->min_buy,
                'weight_gram'        => $source->weight_gram,
                'start_date'         => null,
                'end_date'           => null,
                'pickup_start_date'  => null,
                'pickup_end_date'    => null,
                'status'             => JastipItem::STATUS_DRAFT,
            ]);

            foreach ($source->jastip_item_variants as $v) {
                JastipItemVariant::create([
                    'jastip_item_id'   => $new->id,
                    'var_name'         => $v->var_name,
                    'var_value'        => $v->var_value,
                    'additional_price' => $v->additional_price,
                    'stock'            => $v->stock,
                    'min_buy'          => $v->min_buy,
                    'image_name'       => $this->duplicateStoredImage($v->image_name),
                ]);
            }
            foreach ($source->jastip_item_images as $img) {
                JastipItemImage::create([
                    'jastip_item_id' => $new->id,
                    'image_name'     => $this->duplicateStoredImage($img->image_name),
                ]);
            }

            return $new;
        });

        ActivityLog::record('Membuka ulang jastip: ' . $source->name);

        return redirect()->route('admin.jastip.edit', $new->id)->with('flash', [
            'type' => 'info',
            'message' => 'Jastip dibuka ulang sebagai draft. Atur tanggal baru lalu simpan.',
        ]);
    }

    // Draft hasil reopen harus punya file sendiri, jangan berbagi path dengan produk asal.
    private function duplicateStoredImage(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }
        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        if (! $disk->exists($path)) {
            return $path;
        }
        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $newPath = 'jastip-images/' . Str::uuid() . ($ext ? '.' . $ext : '');
        $disk->copy($path, $newPath);
        return $newPath;
    }

    public function analytics()
    {
        $userId = Auth::id();

        $paidItems = DB::table('jastip_order_items')
            ->join('jastip_items', 'jastip_order_items.jastip_item_id', '=', 'jastip_items.id')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->join('transactions', 'jastip_orders.transaction_id', '=', 'transactions.id')
            ->leftJoin('jastip_item_variants', 'jastip_order_items.jastip_item_variant_id', '=', 'jastip_item_variants.id')
            ->where('jastip_items.user_id', $userId)
            ->where('jastip_orders.order_status', 'paid');

        $rows = (clone $paidItems)->get([
            'jastip_order_items.quantity',
            'jastip_items.base_price',
            'jastip_items.jastip_fee',
            'jastip_item_variants.additional_price',
            'jastip_orders.created_at',
            'transactions.user_id as buyer_id',
        ]);

        $revenue = $rows->sum(fn ($r) => ((float) $r->base_price + (float) $r->jastip_fee + (float) $r->additional_price) * (int) $r->quantity);
        $productsSold = (int) $rows->sum('quantity');
        $customers = $rows->pluck('buyer_id')->unique()->count();

        $rating = $this->accountRating($userId, 'jastiper');

        $monthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->startOfMonth()->subMonths($i);
            $qty = $rows
                ->filter(fn ($r) => Carbon::parse($r->created_at)->isSameMonth($month))
                ->sum('quantity');
            $monthly[] = ['label' => $month->translatedFormat('M'), 'value' => (int) $qty];
        }

        $best = JastipItem::where('user_id', $userId)
            ->with(['jastip_item_images', 'category'])
            ->leftJoinSub($this->soldSubquery(), 'sold', 'sold.jastip_item_id', '=', 'jastip_items.id')
            ->select('jastip_items.*', DB::raw('COALESCE(sold.sold, 0) as sold_count'))
            ->orderByDesc('sold_count')
            ->first();

        return Inertia::render('Admin/Jastip/Analytics', [
            'stats' => [
                'products_sold' => $productsSold,
                'revenue'       => $revenue,
                'customers'     => $customers,
                'rating'        => $rating['average'],
            ],
            'monthly'    => $monthly,
            'bestSeller' => $best ? $this->formatCard($best) : null,
            'rating'     => $rating,
        ]);
    }

    private function categoriesPayload()
    {
        return JastipCategory::orderBy('name')->get(['id', 'name', 'slug']);
    }

    private function soldSubquery()
    {
        return DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->where('jastip_orders.order_status', 'paid')
            ->groupBy('jastip_item_id')
            ->select('jastip_item_id', DB::raw('SUM(quantity) as sold'));
    }

    private function formatCard(JastipItem $item): array
    {
        $sold = (int) ($item->sold_count ?? 0);
        $isSoldOut = $item->max_slot > 0 && $sold >= $item->max_slot;

        return [
            'id'          => $item->id,
            'name'        => $item->name,
            'category'    => $item->category?->name,
            'base_price'  => (float) $item->base_price,
            'jastip_fee'  => (float) $item->jastip_fee,
            'total_price' => $item->totalPrice(),
            'max_slot'    => (int) $item->max_slot,
            'sold'        => $sold,
            'status'      => $isSoldOut ? 'sold_out' : $item->status,
            'jastiper_status' => $item->jastiperStatus(),
            'is_draft'    => $item->isDraft(),
            'can_delete'  => $item->canBeDeleted(),
            'allow_requests' => (bool) $item->allow_requests,
            'image'       => $item->relationLoaded('jastip_item_images') && $item->jastip_item_images->isNotEmpty()
                ? $this->resolveImageUrl($item->jastip_item_images->first()->image_name)
                : '/assets/default-image.png',
        ];
    }

    private function validateItem(Request $request, bool $isCreate = false): array
    {
        // Saat edit gambar lama dipertahankan, jadi tidak wajib unggah ulang.
        $imagesRule = $isCreate ? ['required', 'array', 'min:1'] : ['nullable', 'array'];

        return $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'jastip_category_id' => ['required', 'integer', 'exists:jastip_categories,id'],
            'description'        => ['nullable', 'string'],
            'pickup_province'    => ['required', 'string', 'max:100'],
            'pickup_city'        => ['nullable', 'string', 'max:100'],
            'pickup_address'     => ['required', 'string', 'max:500'],
            'purchase_province'  => ['required', 'string', 'max:100'],
            'purchase_city'      => ['nullable', 'string', 'max:100'],
            'purchase_address'   => ['nullable', 'string', 'max:500'],
            'base_price'         => ['required', 'numeric', 'min:0'],
            'jastip_fee'         => ['nullable', 'numeric', 'min:0'],
            'has_variants'       => ['required', 'boolean'],
            'allow_requests'     => ['sometimes', 'boolean'],
            'max_slot'           => ['required_if:has_variants,0,false', 'nullable', 'integer', 'min:1'],
            'min_buy'            => ['required_if:has_variants,0,false', 'nullable', 'integer', 'min:1'],
            'variants'                 => ['required_if:has_variants,1,true', 'array'],
            'variants.*.value'         => ['required_with:variants', 'string', 'max:100'],
            'variants.*.stock'         => ['required_with:variants', 'integer', 'min:0'],
            'variants.*.price'         => ['nullable', 'numeric', 'min:0'],
            'variants.*.min_buy'       => ['nullable', 'integer', 'min:1'],
            'variants.*.image'         => ['nullable', 'image', 'max:5120'],
            'variants.*.image_name'    => ['nullable', 'string'],
            'start_date'  => ['required', 'date'],
            'end_date'    => ['required', 'date', 'after_or_equal:start_date'],
            'pickup_start_date' => ['required', 'date', 'after_or_equal:end_date'],
            'pickup_end_date'   => ['required', 'date', 'after_or_equal:pickup_start_date'],
            'publish'     => ['sometimes', 'boolean'],
            'images'      => $imagesRule,
            'images.*'    => ['image', 'max:5120'],
            'removed_images' => ['nullable', 'array'],
        ], [
            'images.required'          => 'Unggah minimal satu gambar barang.',
            'images.min'               => 'Unggah minimal satu gambar barang.',
            'images.*.max'             => 'Ukuran gambar maksimal 5MB.',
            'variants.*.image.max'     => 'Ukuran gambar varian maksimal 5MB.',
            'pickup_province.required' => 'Provinsi lokasi ambil wajib dipilih.',
            'pickup_address.required'  => 'Alamat ambil jastip wajib diisi.',
            'purchase_province.required' => 'Negara/provinsi pembelian wajib dipilih.',
            'start_date.required'      => 'Tanggal mulai pesan wajib diisi.',
            'end_date.required'        => 'Tanggal akhir pesan wajib diisi.',
            'pickup_start_date.required' => 'Tanggal mulai pengambilan wajib diisi.',
            'pickup_end_date.required'   => 'Tanggal akhir pengambilan wajib diisi.',
        ]);
    }

    private function persistItem(JastipItem $item, Request $request, array $data): JastipItem
    {
        $hasVariants = filter_var($data['has_variants'] ?? false, FILTER_VALIDATE_BOOLEAN);

        DB::transaction(function () use ($item, $request, $data, $hasVariants) {
            if ($hasVariants) {
                $variantInputs = array_values($data['variants'] ?? []);
            } else {
                // Mode tanpa varian tetap disimpan sebagai satu varian "Original".
                $variantInputs = [[
                    'value'      => 'Original',
                    'price'      => 0,
                    'stock'      => (int) ($data['max_slot'] ?? 0),
                    'min_buy'    => (int) ($data['min_buy'] ?? 1),
                    'image_name' => null,
                ]];
            }

            $totalStock = array_sum(array_map(fn ($v) => (int) ($v['stock'] ?? 0), $variantInputs));
            $minBuy     = min(array_map(fn ($v) => max(1, (int) ($v['min_buy'] ?? 1)), $variantInputs) ?: [1]);

            $item->fill([
                'name'               => $data['name'],
                'jastip_category_id' => $data['jastip_category_id'],
                'description'        => $data['description'] ?? null,
                'pickup_province'    => $data['pickup_province'] ?? null,
                'pickup_city'        => $data['pickup_city'] ?? null,
                'pickup_address'     => $data['pickup_address'] ?? null,
                'purchase_province'  => $data['purchase_province'] ?? null,
                'purchase_city'      => $data['purchase_city'] ?? null,
                'purchase_address'   => $data['purchase_address'] ?? null,
                'base_price'         => $data['base_price'],
                'jastip_fee'         => $data['jastip_fee'] ?? 0,
                'has_variants'       => $hasVariants,
                'allow_requests'     => filter_var($data['allow_requests'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'max_slot'           => $totalStock,
                'min_buy'            => $minBuy,
                'start_date'         => $data['start_date'] ?? null,
                'end_date'           => $data['end_date'] ?? null,
                'pickup_start_date'  => $data['pickup_start_date'] ?? null,
                'pickup_end_date'    => $data['pickup_end_date'] ?? null,
                'status'             => ! empty($data['publish']) ? JastipItem::STATUS_PUBLISHED : JastipItem::STATUS_DRAFT,
            ]);
            $item->save();

            // Varian diganti total; path lama disimpan buat bersihkan orphan.
            $oldImages = $item->jastip_item_variants()->pluck('image_name')->filter()->all();
            $item->jastip_item_variants()->delete();

            $keptImages = [];
            foreach ($variantInputs as $idx => $v) {
                if (trim((string) ($v['value'] ?? '')) === '') {
                    continue;
                }
                $imgPath = $v['image_name'] ?? null;
                $file = $request->file("variants.$idx.image");
                if ($file) {
                    $imgPath = $file->store('jastip-images', 'public');
                }
                if ($imgPath) {
                    $keptImages[] = $imgPath;
                }

                JastipItemVariant::create([
                    'jastip_item_id'   => $item->id,
                    'var_name'         => 'Varian',
                    'var_value'        => $v['value'],
                    'additional_price' => $v['price'] ?? 0,
                    'stock'            => (int) ($v['stock'] ?? 0),
                    'min_buy'          => max(1, (int) ($v['min_buy'] ?? 1)),
                    'image_name'       => $imgPath,
                ]);
            }

            foreach (array_diff($oldImages, $keptImages) as $orphan) {
                $this->deleteStoredImage($orphan);
            }

            foreach ((array) $request->input('removed_images', []) as $imgId) {
                $img = $item->jastip_item_images()->find($imgId);
                if ($img) {
                    $this->deleteStoredImage($img->image_name);
                    $img->delete();
                }
            }
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $path = $file->store('jastip-images', 'public');
                    JastipItemImage::create([
                        'jastip_item_id' => $item->id,
                        'image_name'     => $path,
                    ]);
                }
            }
        });

        return $item;
    }

    private function resolveImageUrl(?string $path): string
    {
        if (! $path) {
            return '/assets/default-image.png';
        }
        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }
        return asset('storage/' . $path);
    }

    private function deleteStoredImage(?string $path): void
    {
        if ($path && ! Str::startsWith($path, ['http://', 'https://', '/'])) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($path);
        }
    }
}
