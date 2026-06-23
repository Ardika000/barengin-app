<?php

namespace App\Http\Controllers;

use App\Models\Trip;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Midtrans\Config;
use Midtrans\Snap;

class TripsController extends Controller
{
    public function index(Request $request)
    {
        $tujuan    = trim((string) $request->query('tujuan', ''));
        $startDate = $request->query('start_date');
        $endDate   = $request->query('end_date');

        $query = DB::table('trips')
            ->join('users', 'trips.guider_id', '=', 'users.id')
            ->select('trips.*', 'users.id as host_id', 'users.full_name as guide_name', 'users.profile_image')
            ->whereDate('trips.end_date', '>=', now()); // sembunyikan trip yang sudah lewat

        if ($tujuan !== '') {
            $query->where(function ($q) use ($tujuan) {
                $q->where('trips.location', 'like', "%{$tujuan}%")
                    ->orWhere('trips.name', 'like', "%{$tujuan}%");
            });
        }
        if ($startDate) {
            $query->whereDate('trips.start_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('trips.end_date', '<=', $endDate);
        }

        $tripsPaginated = $query
            ->orderBy('trips.created_at', 'desc')
            ->paginate(9)
            ->withQueryString();

        $likedTripIds = $request->user()
            ? DB::table('favorites')
                ->where('user_id', $request->user()->id)
                ->where('favoritable_type', 'trip')
                ->pluck('favoritable_id')
                ->all()
            : [];
        $likedTripIds = array_flip($likedTripIds);

        $tripsPaginated->getCollection()->transform(function ($trip) use ($likedTripIds) {
            $startDate = Carbon::parse($trip->start_date);
            $endDate = Carbon::parse($trip->end_date);
            $duration = $startDate->diffInDays($endDate) . ' Days';

            // Peserta = user unik yang sudah membayar (trip_orders)
            $joined = DB::table('trip_orders')
                ->where('trip_id', $trip->id)
                ->where('order_status', 'paid')
                ->distinct()
                ->count('user_id');

            // Sisa kursi otomatis dihitung dari jumlah asli di tabel DB
            $remaining = $trip->people_amount - $joined;

            // Rating pemandu dari ulasan trip (type: jalan_bareng)
            $guiderRating = DB::table('user_ratings')
                ->where('rated_user_id', $trip->host_id)
                ->where('type', 'jalan_bareng')
                ->avg('rating_amount');

            $guiderReviews = DB::table('user_ratings')
                ->where('rated_user_id', $trip->host_id)
                ->where('type', 'jalan_bareng')
                ->count();

            return [
                'id' => $trip->id,
                'title' => $trip->name,
                'location' => 'Indonesia',
                'date' => $startDate->format('d M y') . ' - ' . $endDate->format('d M y') . ' (' . $duration . ')',
                'capacity' => $joined . '/' . $trip->people_amount . ' orang',
                'remaining_seats' => $remaining > 0 ? $remaining : 0,
                'rating' => (float) $trip->rating,
                'reviews' => rand(10, 150), // Ini review trip (bukan guide), bisa biarkan random dulu kalau belum ada tabelnya
                'price' => (float) $trip->price,
                'guide_id' => $trip->guider_id, 
                'guide' => $trip->guide_name,
                'guide_avatar' => $trip->profile_image ?? '/assets/default-profile.png',
                'guide_rating' => $guiderRating ? number_format($guiderRating, 1) : '0',
                'guide_reviews' => $guiderReviews,
                'guide_badge' => 'Expert Guide',
                'image' => $this->resolveTripImage($trip->image),
                'liked' => isset($likedTripIds[$trip->id]),
            ];
        });

        $all_trips = Trip::all();

        return Inertia::render('TripBareng/Index', [
            'trips' => $tripsPaginated,
            'all_trips' => $all_trips,
            'filters' => [
                'tujuan'     => $tujuan,
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        // 1. Ambil data spesifik trip
        $trip = DB::table('trips')
            ->join('users', 'trips.guider_id', '=', 'users.id')
            ->select('trips.*', 'users.id as host_id', 'users.full_name as guide_name', 'users.profile_image')
            ->where('trips.id', $id)
            ->first();

        if (!$trip) abort(404);

        // Peserta = user unik yang sudah membayar (trip_orders)
        $participants = DB::table('trip_orders')
            ->join('users', 'trip_orders.user_id', '=', 'users.id')
            ->where('trip_orders.trip_id', $trip->id)
            ->where('trip_orders.order_status', 'paid')
            ->select('users.id', 'users.full_name', 'users.profile_image')
            ->distinct()
            ->get()
            ->map(fn ($u) => [
                'id'     => $u->id,
                'name'   => $u->full_name,
                'avatar' => $this->resolveAvatar($u->profile_image),
            ])
            ->values();

        $joined = $participants->count();

        // 2. Ambil Rata-Rata Rating Guide (type: jalan_bareng)
        $guiderRating = DB::table('user_ratings')
            ->where('rated_user_id', $trip->host_id)
            ->where('type', 'jalan_bareng')
            ->avg('rating_amount');

        $ratingText = $guiderRating ? number_format($guiderRating, 1) : 'Baru';

        // 3. Ambil activities (itinerary)
        $activitiesDB = DB::table('trip_activities')->where('trip_id', $id)->orderBy('activity_order', 'asc')->get();

        $itinerary = $activitiesDB->map(function ($act) {
            $images = DB::table('image_activities')
                ->where('trip_activity_id', $act->id)
                ->pluck('activity_img_name')
                ->toArray();

            $start = Carbon::parse($act->activity_start_datetime);
            $end = Carbon::parse($act->activity_end_datetime);

            return [
                'step' => (int) $act->activity_order,
                'title' => $act->activity_name,
                'time' => $start->format('d F Y, \J\a\m H:i') . ' - ' . $end->format('H:i'),
                'desc' => $act->activity_description,
                'images' => count($images) > 0 ? $images : [
                    "https://images.unsplash.com/photo-1596825205469-80fb2228a4da?q=80&w=600&auto=format&fit=crop"
                ]
            ];
        });

        // 4. Ambil fasilitas (Included)
        $facilities = DB::table('trip_facilities')
            ->join('facilities', 'trip_facilities.facility_id', '=', 'facilities.id')
            ->where('trip_facilities.trip_id', $id)
            ->select('facilities.name', 'facilities.icon')
            ->get();

        $startDate = Carbon::parse($trip->start_date);
        $endDate = Carbon::parse($trip->end_date);

        $tripData = [
            'id'          => $trip->id,
            'title'       => $trip->name,
            'location'    => $trip->location ?? $trip->city ?? $trip->destination ?? $trip->name,

            'duration'    => $startDate->diffInDays($endDate) . ' Hari',
            'date_range'  => $startDate->format('d F Y') . ' hingga ' . $endDate->format('d F Y'),
            'joined_count' => $joined,
            'capacity'    => $trip->people_amount,
            'remaining_seats' => max(0, $trip->people_amount - $joined),
            'participants' => $participants,
            'price'       => (float) $trip->price,
            'description' => $trip->description,
            'host' => [
                'id' => $trip->guider_id,
                'name' => $trip->guide_name,
                'role' => 'Pemilik',
                'badge' => 'Expert Guide - ★ ' . $ratingText,
                'avatar' => $this->resolveAvatar($trip->profile_image),
            ],
            'itinerary'   => $itinerary,
            'facilities'  => $facilities,
            'already_joined' => $request->user()
                ? DB::table('trip_orders')
                    ->where('trip_id', $trip->id)
                    ->where('user_id', $request->user()->id)
                    ->where('order_status', 'paid')
                    ->exists()
                : false,
            'liked'       => $request->user()
                ? DB::table('favorites')
                    ->where('user_id', $request->user()->id)
                    ->where('favoritable_type', 'trip')
                    ->where('favoritable_id', $trip->id)
                    ->exists()
                : false,
        ];

        return Inertia::render('TripBareng/Detail', [
            'trip' => $tripData,
        ]);
    }

    public function checkout($id)
    {
        $trip = DB::table('trips')->where('id', $id)->first();
        if (!$trip) abort(404);

        // Jumlah peserta = user unik yang sudah membayar (konsisten dgn detail & index)
        $joined = $this->joinedCount($trip->id);

        $trip_check_out = [
            'id' => $trip->id,
            'title' => $trip->name,
            'price' => (float) $trip->price,
            'joined_count' => $joined, // <--- Pakai data asli
            'capacity' => $trip->people_amount,
            'remaining_quota' => $trip->people_amount - $joined, // <--- Hitungan sisa kursi akurat
            'image' => $this->resolveTripImage($trip->image),
        ];

        return Inertia::render('TripBareng/Checkout', [
            'trip' => $trip_check_out,
        ]);
    }

    // Ini Fungsi Payment
    public function processPayment(Request $request, $id)
    {
        $trip = DB::table('trips')->where('id', $id)->first();
        if (!$trip) abort(404);

        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Silakan login terlebih dahulu.'], 401);
        }

        $quantity     = (int) $request->input('quantity', 1);
        $participants = $request->input('participants', []);

        // Validasi sisa kuota
        $joined    = $this->joinedCount($id);
        $remaining = $trip->people_amount - $joined;

        if ($quantity > $remaining) {
            return response()->json(['error' => "Kuota tidak cukup. Sisa: {$remaining} orang."], 422);
        }

        // Hitung total — HARUS integer untuk Midtrans
        $serviceFee   = 5000 * $quantity;
        $insuranceFee = 5000 * $quantity;
        $totalAmount  = (int) round(($trip->price * $quantity) + $serviceFee + $insuranceFee);

        $transactionId = (string) \Illuminate\Support\Str::uuid();

        // Insert ke DB — TANPA va_number (kolom itu tidak ada di tabel)
        try {
            DB::table('transactions')->insert([
                'id'             => $transactionId,
                'user_id'        => $user->id,
                'total_amount'   => $totalAmount,
                'type'           => 'trip',
                'payment_method' => 'Midtrans',
                // TIDAK ADA va_number
                'expired_at'     => now()->addHours(24),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            DB::table('trip_orders')->insert([
                'transaction_id' => $transactionId,
                'trip_id'        => $id,
                'user_id'        => $user->id,
                'quantity'       => $quantity,
                'participants'   => json_encode($participants),
                'total'          => $totalAmount,
                'order_status'   => 'pending',
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        } catch (\Exception $e) {
            \Log::error('[BARENGIN] Gagal insert transaksi: ' . $e->getMessage());
            return response()->json([
                'error'  => 'Gagal menyimpan transaksi: ' . $e->getMessage(),
            ], 500);
        }

        // Konfigurasi Midtrans — pakai config(), bukan env() langsung
        \Midtrans\Config::$serverKey    = config('midtrans.server_key');
        \Midtrans\Config::$isProduction = config('midtrans.is_production', false);
        \Midtrans\Config::$isSanitized  = true;
        \Midtrans\Config::$is3ds        = true;

        $params = [
            'transaction_details' => [
                'order_id'     => $transactionId,
                'gross_amount' => $totalAmount,
            ],
            'item_details' => [
                [
                    'id'       => 'TRIP-' . $id,
                    'price'    => (int) $trip->price,
                    'quantity' => $quantity,
                    'name'     => substr($trip->name, 0, 50),
                ],
                [
                    'id'       => 'SERVICE-FEE',
                    'price'    => 5000,
                    'quantity' => $quantity,
                    'name'     => 'Biaya Layanan',
                ],
                [
                    'id'       => 'INSURANCE-FEE',
                    'price'    => 5000,
                    'quantity' => $quantity,
                    'name'     => 'Biaya Asuransi Trip',
                ],
            ],
            'customer_details' => [
                'first_name' => $user->full_name ?? $user->name ?? 'Pengguna',
                'email'      => $user->email,
                'phone'      => $user->phone ?? '08000000000',
            ],
        ];

        try {
            $snapToken = \Midtrans\Snap::getSnapToken($params);

            // Simpan token agar pembayaran bisa dibuka kembali dari Profile History
            DB::table('transactions')->where('id', $transactionId)->update([
                'snap_token' => $snapToken,
                'updated_at' => now(),
            ]);

            return response()->json([
                'snap_token'     => $snapToken,
                'transaction_id' => $transactionId,
            ]);
        } catch (\Exception $e) {
            // Rollback jika Midtrans gagal
            DB::table('trip_orders')->where('transaction_id', $transactionId)->delete();
            DB::table('transactions')->where('id', $transactionId)->delete();

            \Log::error('[BARENGIN] Gagal Snap Token: ' . $e->getMessage());
            return response()->json([
                'error' => 'Gagal menghubungi Midtrans: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function success(Request $request, $id)
    {
        // Pastikan status pembayaran tersinkron (peserta & grup chat dibuat saat lunas)
        if ($request->user()) {
            MidtransController::syncPendingForUser($request->user()->id);
        }

        $trip = DB::table('trips')->where('id', $id)->first();
        if (!$trip) abort(404);

        $startDate = Carbon::parse($trip->start_date);
        $endDate = Carbon::parse($trip->end_date);

        // Jumlah peserta = user unik yang sudah membayar (konsisten dgn detail & index)
        $joined = $this->joinedCount($trip->id);

        $order = [
            'transaction_id' => 'OTRIP-' . str_pad($id, 6, '0', STR_PAD_LEFT),
            'trip_id' => (int) $trip->id,
            'trip_title' => $trip->name,
            'date_range' => $startDate->format('d M') . ' - ' . $endDate->format('d M Y'),
            'quantity' => 1,
            'image' => $this->resolveTripImage($trip->image),
            'friends_waiting' => $joined, // <-- Ganti rand(3, 15) menjadi data asli ($joined)
        ];

        return Inertia::render('TripBareng/Success', [
            'order' => $order,
        ]);
    }

    /**
     * Ubah path gambar trip dari DB menjadi URL yang bisa dipakai <img>.
     * - kosong  -> gambar contoh
     * - http/.. -> dipakai apa adanya
     * - relatif -> diarahkan ke storage link
     */
    /**
     * Jumlah peserta yang sudah bergabung = user unik yang sudah membayar.
     * Dipakai konsisten di index, detail, checkout, & success.
     */
    private function joinedCount($tripId): int
    {
        return (int) DB::table('trip_orders')
            ->where('trip_id', $tripId)
            ->where('order_status', 'paid')
            ->distinct()
            ->count('user_id');
    }

    private function resolveTripImage(?string $path): string
    {
        $fallback = '/assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg';

        if (! $path) {
            return $fallback;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return '/storage/' . $path;
    }

    private function resolveAvatar(?string $path): string
    {
        if (! $path) {
            return asset('assets/default-profile.png');
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return asset('storage/' . $path);
    }
}
