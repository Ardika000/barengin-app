<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Jastip;
use App\Models\JastipItem;
use App\Models\PergiBareng;
use App\Models\Trip;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminDashboardController extends Controller
{
    public function index(Request $request)
    {
        $stats = [
            'users' => User::count(),
            'trips' => Trip::count(),
            'jastip' => Jastip::count(),
            'pergi_bareng' => PergiBareng::count(),
        ];

        // 3 trip terbaru dibuat (format sama dengan TripCard)
        $latestTrips = Trip::query()
            ->join('users', 'trips.guider_id', '=', 'users.id')
            ->select('trips.*', 'users.id as host_id', 'users.full_name as guide_name', 'users.profile_image')
            ->orderByDesc('trips.created_at')
            ->orderByDesc('trips.id')
            ->limit(3)
            ->get()
            ->map(fn ($trip) => $this->formatTripCard($trip));

        // 3 pergi bareng terbaru dibuat (format sama dengan PergiBarengCard)
        $latestPergi = PergiBareng::with(['initiator.received_ratings', 'pergi_bareng_participants'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(3)
            ->get()
            ->map(fn ($trip) => $this->formatPergiCard($trip));

        // 3 jastip terpopuler (paling banyak dibeli) — global, hanya yang dipublish
        $soldSub = DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->where('jastip_orders.order_status', 'paid')
            ->groupBy('jastip_item_id')
            ->select('jastip_item_id', DB::raw('SUM(quantity) as sold'));

        $popularJastip = JastipItem::query()
            ->with(['jastip_item_images', 'category'])
            ->leftJoinSub($soldSub, 'sold', 'sold.jastip_item_id', '=', 'jastip_items.id')
            ->select('jastip_items.*', DB::raw('COALESCE(sold.sold, 0) as sold_count'))
            ->where('jastip_items.status', 'published')
            ->orderByDesc('sold_count')
            ->limit(3)
            ->get()
            ->map(fn ($item) => $this->formatJastipCard($item));

        // Log kegiatan — paginasi 5 per halaman
        $logs = ActivityLog::with('user:id,full_name,profile_image')
            ->latest()
            ->paginate(5, ['*'], 'logs_page')
            ->withQueryString()
            ->through(fn ($log) => [
                'id' => $log->id,
                'time' => Carbon::parse($log->created_at)->translatedFormat('d M Y H:i:s'),
                'actor' => $log->user?->full_name ?? $log->actor_name ?? 'Sistem',
                'initials' => $this->initials($log->user?->full_name ?? $log->actor_name ?? 'S'),
                'avatar' => $log->user?->public_profile_image,
                'action' => $log->action,
                'ip' => $log->ip_address ?? '-',
            ]);

        return Inertia::render('Admin/Beranda', [
            'stats' => $stats,
            'latestTrips' => $latestTrips,
            'latestPergi' => $latestPergi,
            'popularJastip' => $popularJastip,
            'logs' => $logs,
        ]);
    }

    public function exportLogs(): StreamedResponse
    {
        ActivityLog::record('Mengekspor log kegiatan');

        $filename = 'log-kegiatan-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Waktu', 'Aktor', 'Aksi', 'Alamat IP']);

            ActivityLog::with('user:id,full_name')
                ->latest()
                ->chunk(200, function ($logs) use ($out) {
                    foreach ($logs as $log) {
                        fputcsv($out, [
                            Carbon::parse($log->created_at)->format('Y-m-d H:i:s'),
                            $log->user?->full_name ?? $log->actor_name ?? 'Sistem',
                            $log->action,
                            $log->ip_address ?? '-',
                        ]);
                    }
                });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function initials(?string $name): string
    {
        if (! $name) return 'S';
        $words = preg_split('/\s+/', trim($name));
        if (count($words) >= 2) {
            return Str::upper(Str::substr($words[0], 0, 1) . Str::substr($words[1], 0, 1));
        }
        return Str::upper(Str::substr($name, 0, 2));
    }

    // Format pergi bareng agar cocok dengan props PergiBarengCard.jsx
    private function formatPergiCard(PergiBareng $trip): array
    {
        $date = $trip->time_appointment;
        $avgRating = $trip->initiator?->receivedRatingAvg('pergi_bareng') ?? 0;
        $totalReviews = $trip->initiator?->receivedRatingCount('pergi_bareng') ?? 0;
        $joined = $trip->pergi_bareng_participants->sum('quantity');

        $transportIcon = str_contains(strtolower((string) $trip->transportation), 'umum') ? 'train' : 'car';

        return [
            'id' => $trip->id,
            'image' => $this->resolvePergiImage($trip->img_name),
            'title' => $trip->name,
            'address' => $trip->departure_loc,
            'date' => $date->translatedFormat('d M y'),
            'time' => $date->format('H:i'),
            'capacity' => $joined . '/' . $trip->people_amount . ' Orang',
            'remainingSeats' => max(0, $trip->people_amount - $joined),
            'user' => [
                'id' => $trip->initiator?->id,
                'name' => $trip->initiator?->full_name ?? 'Penyelenggara',
                'avatar' => $trip->initiator?->public_profile_image ?? asset('assets/default-profile.png'),
                'rating' => number_format($avgRating, 1),
                'reviews' => (int) $totalReviews,
                'verified' => true,
            ],
            'transportType' => $trip->transportation,
            'transportIcon' => $transportIcon,
            'href' => '/pergi-bareng/' . $trip->id,
            'liked' => false,
        ];
    }

    // Samakan resolusi gambar pergi bareng dengan halaman front (PergiBarengController)
    private function resolvePergiImage(?string $path): string
    {
        return $this->resolveStoredImage($path);
    }

    // Format produk jastip agar cocok dengan props JastipProductCard.jsx
    private function formatJastipCard(JastipItem $item): array
    {
        $sold = (int) ($item->sold_count ?? 0);
        $isSoldOut = $item->max_slot > 0 && $sold >= $item->max_slot;

        $image = $item->relationLoaded('jastip_item_images') && $item->jastip_item_images->isNotEmpty()
            ? $item->jastip_item_images->first()->image_name
            : null;
        if ($image && ! Str::startsWith($image, ['http://', 'https://', '/'])) {
            $image = asset('storage/' . $image);
        }

        return [
            'id' => $item->id,
            'name' => $item->name,
            'category' => $item->category?->name,
            'image' => $image ?: '/assets/default-image.png',
            'max_slot' => (int) $item->max_slot,
            'sold' => $sold,
            'status' => $isSoldOut ? 'sold_out' : $item->status,
            'jastiper_status' => $item->jastiperStatus(),
            'is_draft' => false,
        ];
    }

    private function formatTripCard($trip): array
    {
        $startDate = Carbon::parse($trip->start_date);
        $endDate = Carbon::parse($trip->end_date);
        $duration = (int) $startDate->diffInDays($endDate);

        $joined = (int) DB::table('trip_orders')
            ->where('trip_id', $trip->id)
            ->where('order_status', 'paid')
            ->distinct()
            ->count('user_id');

        $guiderRating = DB::table('user_ratings')
            ->where('rated_user_id', $trip->host_id)
            ->where('type', 'trip_bareng')
            ->avg('rating_amount');
        $guiderReviews = DB::table('user_ratings')
            ->where('rated_user_id', $trip->host_id)
            ->where('type', 'trip_bareng')
            ->count();

        $image = $trip->image;
        if ($image && ! Str::startsWith($image, ['http://', 'https://', '/'])) {
            $image = '/storage/' . $image;
        }

        return [
            'id' => $trip->id,
            'title' => $trip->name,
            'location' => $trip->location,
            'date' => $startDate->format('d M y') . ' - ' . $endDate->format('d M y') . ' (' . $duration . ' Hari)',
            'capacity' => (int) $trip->people_amount,
            'joined_count' => $joined,
            'remaining_seats' => max(0, $trip->people_amount - $joined),
            'rating' => (float) $trip->rating,
            'price' => (float) $trip->price,
            'guide_id' => $trip->guider_id,
            'guide' => $trip->guide_name,
            'guide_avatar' => $trip->profile_image
                ? (Str::startsWith($trip->profile_image, ['http', '/']) ? $trip->profile_image : '/storage/' . $trip->profile_image)
                : '/assets/default-profile.png',
            'guide_rating' => $guiderRating ? number_format($guiderRating, 1) : '0',
            'guide_reviews' => (int) $guiderReviews,
            'guide_badge' => 'Pemandu Ahli',
            'image' => $image ?: '/assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg',
            'liked' => false,
        ];
    }
}
