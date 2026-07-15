<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LeaderboardController extends Controller
{
    private const LIMIT = 10;

    public function index(Request $request)
    {
        return Inertia::render('Leaderboard/Index', [
            'boards' => [
                'purchase_trip'  => $this->purchaseTrip(),
                'purchase_jastip' => $this->purchaseJastip(),
                'best_guider'    => $this->bestGuider(),
                'best_jastiper'  => $this->bestJastiper(),
                'streak'         => $this->streakBoard(),
            ],
            'streakLeader' => $this->streakLeader(),
        ]);
    }

    /** Pengguna dengan streak harian aktif terpanjang saat ini. */
    private function streakLeader(): ?array
    {
        $r = DB::table('users')
            ->where('streak_count', '>', 0)
            ->orderByDesc('streak_count')
            ->orderByDesc('streak_best')
            ->select('id', 'full_name', 'username', 'profile_image', 'streak_count', 'streak_best')
            ->first();

        if (! $r) {
            return null;
        }

        return [
            'id'           => $r->id,
            'name'         => $r->full_name ?? 'Pengguna',
            'username'     => $r->username,
            'avatar'       => $this->avatar($r->profile_image),
            'streak_count' => (int) $r->streak_count,
            'streak_best'  => (int) $r->streak_best,
        ];
    }

    /** Pembeli open trip terbanyak (order trip berbayar). */
    private function purchaseTrip(): array
    {
        $rows = DB::table('trip_orders')
            ->join('users', 'trip_orders.user_id', '=', 'users.id')
            ->where('trip_orders.order_status', 'paid')
            ->groupBy('users.id', 'users.full_name', 'users.username', 'users.profile_image')
            ->select('users.id', 'users.full_name', 'users.username', 'users.profile_image', DB::raw('SUM(trip_orders.quantity) as cnt'))
            ->orderByDesc('cnt')
            ->limit(self::LIMIT)
            ->get();

        return $this->format($rows, false);
    }

    /** Pembeli jastip terbanyak (item jastip pada order berbayar). */
    private function purchaseJastip(): array
    {
        $rows = DB::table('jastip_order_items')
            ->join('jastip_orders', 'jastip_order_items.jastip_order_id', '=', 'jastip_orders.id')
            ->join('transactions', 'jastip_orders.transaction_id', '=', 'transactions.id')
            ->join('users', 'transactions.user_id', '=', 'users.id')
            ->where('jastip_orders.order_status', 'paid')
            ->groupBy('users.id', 'users.full_name', 'users.username', 'users.profile_image')
            ->select('users.id', 'users.full_name', 'users.username', 'users.profile_image', DB::raw('SUM(jastip_order_items.quantity) as cnt'))
            ->orderByDesc('cnt')
            ->limit(self::LIMIT)
            ->get();

        return $this->format($rows, false);
    }

    /** Guider terbaik: paling banyak membuat trip + rating trip_bareng tertinggi. */
    private function bestGuider(): array
    {
        $ratingSub = DB::table('user_ratings')
            ->where('type', 'trip_bareng')
            ->groupBy('rated_user_id')
            ->select('rated_user_id', DB::raw('AVG(rating_amount) as avg_rating'));

        $rows = DB::table('trips')
            ->join('users', 'trips.guider_id', '=', 'users.id')
            ->leftJoinSub($ratingSub, 'r', 'r.rated_user_id', '=', 'users.id')
            ->where('trips.status', '!=', 'draft')
            ->groupBy('users.id', 'users.full_name', 'users.username', 'users.profile_image', 'r.avg_rating')
            ->select('users.id', 'users.full_name', 'users.username', 'users.profile_image', DB::raw('COUNT(trips.id) as cnt'), DB::raw('COALESCE(r.avg_rating, 0) as rating'))
            ->orderByDesc('cnt')
            ->orderByDesc('rating')
            ->limit(self::LIMIT)
            ->get();

        return $this->format($rows, true);
    }

    /** Jastiper terbaik: paling banyak membuat jastip + rating jastiper tertinggi. */
    private function bestJastiper(): array
    {
        $ratingSub = DB::table('user_ratings')
            ->where('type', 'jastiper')
            ->groupBy('rated_user_id')
            ->select('rated_user_id', DB::raw('AVG(rating_amount) as avg_rating'));

        $rows = DB::table('jastip_items')
            ->join('users', 'jastip_items.user_id', '=', 'users.id')
            ->leftJoinSub($ratingSub, 'r', 'r.rated_user_id', '=', 'users.id')
            ->where('jastip_items.status', 'published')
            ->whereNull('jastip_items.deleted_at')
            ->groupBy('users.id', 'users.full_name', 'users.username', 'users.profile_image', 'r.avg_rating')
            ->select('users.id', 'users.full_name', 'users.username', 'users.profile_image', DB::raw('COUNT(jastip_items.id) as cnt'), DB::raw('COALESCE(r.avg_rating, 0) as rating'))
            ->orderByDesc('cnt')
            ->orderByDesc('rating')
            ->limit(self::LIMIT)
            ->get();

        return $this->format($rows, true);
    }

    /** Papan streak: pengguna dengan streak harian aktif terpanjang saat ini. */
    private function streakBoard(): array
    {
        $rows = DB::table('users')
            ->where('streak_count', '>', 0)
            ->orderByDesc('streak_count')
            ->orderByDesc('streak_best')
            ->select('users.id', 'users.full_name', 'users.username', 'users.profile_image', DB::raw('streak_count as cnt'))
            ->limit(self::LIMIT)
            ->get();

        return $this->format($rows, false);
    }

    /** Bentuk seragam untuk podium & tabel di frontend. */
    private function format($rows, bool $withRating): array
    {
        return $rows->values()->map(function ($r, $i) use ($withRating) {
            return [
                'rank'     => $i + 1,
                'id'       => $r->id,
                'name'     => $r->full_name ?? 'Pengguna',
                'username' => $r->username,
                'avatar'   => $this->avatar($r->profile_image),
                'count'    => (int) $r->cnt,
                'rating'   => $withRating ? round((float) ($r->rating ?? 0), 1) : null,
            ];
        })->all();
    }

    private function avatar(?string $path): string
    {
        if (! $path) {
            return asset('assets/default-profile.png');
        }
        if (str_starts_with($path, 'http') || str_starts_with($path, '/')) {
            return $path;
        }
        return asset('storage/' . $path);
    }
}
