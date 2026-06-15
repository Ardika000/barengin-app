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
    public function index()
    {
        $tripsPaginated = DB::table('trips')
            ->join('users', 'trips.guider_id', '=', 'users.id')
            ->select('trips.*', 'users.id as host_id', 'users.full_name as guide_name', 'users.profile_image')
            ->orderBy('trips.created_at', 'desc')
            ->paginate(9);

        $tripsPaginated->getCollection()->transform(function ($trip) {
            $startDate = Carbon::parse($trip->start_date);
            $endDate = Carbon::parse($trip->end_date);
            $duration = $startDate->diffInDays($endDate) . ' Days';

            // [PERBAIKAN]: Hitung partisipan murni sesuai tabel DB (tanpa angka acak)
            $joined = DB::table('trip_participants')->where('trip_id', $trip->id)->count();

            // Sisa kursi otomatis dihitung dari jumlah asli di tabel DB
            $remaining = $trip->people_amount - $joined;

            $guiderRating = DB::table('user_ratings')
                ->where('rated_user_id', $trip->host_id)
                ->where('type', 'pergi_bareng')
                ->avg('rating_amount');

            $guiderReviews = DB::table('user_ratings')
                ->where('rated_user_id', $trip->host_id)
                ->where('type', 'pergi_bareng')
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
                'guide_avatar' => $trip->profile_image ?? '/assets/default-avatar.png',
                'guide_rating' => $guiderRating ? number_format($guiderRating, 1) : '0',
                'guide_reviews' => $guiderReviews,
                'guide_badge' => 'Expert Guide',
                'image' => $trip->image ?? '/assets/trips/bromo.jpg',
                'liked' => false,
            ];
        });

        $all_trips = Trip::all();

        return Inertia::render('TripBareng/Index', [
            'trips' => $tripsPaginated,
            'all_trips' => $all_trips,
        ]);
    }

    public function show($id)
    {
        // 1. Ambil data spesifik trip
        $trip = DB::table('trips')
            ->join('users', 'trips.guider_id', '=', 'users.id')
            ->select('trips.*', 'users.id as host_id', 'users.full_name as guide_name', 'users.profile_image')
            ->where('trips.id', $id)
            ->first();

        if (!$trip) abort(404);

        // [PERBAIKAN]: Hitung jumlah partisipan riil dari database (Bukan rand() lagi)
        $joined = DB::table('trip_participants')->where('trip_id', $trip->id)->count();

        // 2. Ambil Rata-Rata Rating Guide
        $guiderRating = DB::table('user_ratings')
            ->where('rated_user_id', $trip->host_id)
            ->where('type', 'pergi_bareng')
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
            'id' => $trip->id,
            'title' => $trip->name,
            'location' => 'Indonesia',
            'duration' => $startDate->diffInDays($endDate) . ' Hari',
            'date_range' => $startDate->format('d F Y') . ' hingga ' . $endDate->format('d F Y'),
            'joined_count' => $joined, // <--- Sekarang pakai $joined asli dari DB
            'capacity' => $trip->people_amount,
            'price' => (float) $trip->price,
            'description' => $trip->description,
            'host' => [
                'id' => $trip->guider_id,
                'name' => $trip->guide_name,
                'role' => 'Pemilik',
                'badge' => 'Expert Guide - ★ ' . $ratingText,
                'avatar' => $trip->profile_image ?? '/assets/default-avatar.png'
            ],
            'itinerary' => $itinerary,
            'facilities' => $facilities
        ];

        return Inertia::render('TripBareng/Detail', [
            'trip' => $tripData,
        ]);
    }

    public function checkout($id)
    {
        $trip = DB::table('trips')->where('id', $id)->first();
        if (!$trip) abort(404);

        // [PERBAIKAN]: Hitung jumlah partisipan riil dari database (Bukan rand() lagi)
        $joined = DB::table('trip_participants')->where('trip_id', $trip->id)->count();

        $trip_check_out = [
            'id' => $trip->id,
            'title' => $trip->name,
            'price' => (float) $trip->price,
            'joined_count' => $joined, // <--- Pakai data asli
            'capacity' => $trip->people_amount,
            'remaining_quota' => $trip->people_amount - $joined, // <--- Hitungan sisa kursi akurat
            'image' => $trip->image ?? '/assets/trips/bromo.jpg',
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
        $joined    = DB::table('trip_participants')->where('trip_id', $id)->count();
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

    public function success($id)
    {
        $trip = DB::table('trips')->where('id', $id)->first();
        if (!$trip) abort(404);

        $startDate = Carbon::parse($trip->start_date);
        $endDate = Carbon::parse($trip->end_date);

        // [PERBAIKAN] Ambil jumlah partisipan asli yang sudah tergabung di trip ini dari DB
        $joined = DB::table('trip_participants')->where('trip_id', $trip->id)->count();

        $order = [
            'transaction_id' => 'OTRIP-' . str_pad($id, 6, '0', STR_PAD_LEFT),
            'trip_id' => (int) $trip->id,
            'trip_title' => $trip->name,
            'date_range' => $startDate->format('d M') . ' - ' . $endDate->format('d M Y'),
            'quantity' => 1,
            'image' => $trip->image ?? '/assets/trips/bromo.jpg',
            'friends_waiting' => $joined, // <-- Ganti rand(3, 15) menjadi data asli ($joined)
        ];

        return Inertia::render('TripBareng/Success', [
            'order' => $order,
        ]);
    }
}
