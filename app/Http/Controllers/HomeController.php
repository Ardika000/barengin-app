<?php

namespace App\Http\Controllers;

use App\Models\JastipItem;
use App\Models\PostImage;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class HomeController extends Controller
{
    public function index()
    {
        return inertia('Home/Index', [
            // Closure biar galeri dilewati saat partial reload.
            'galleryImages' => fn () => $this->galleryImages(),
            'popularTrips'  => $this->popularTrips(),
            'latestJastip'  => $this->latestJastip(),
        ]);
    }

    private function imageUrl(?string $name, string $fallback, string $prefix): string
    {
        if (! $name) {
            return $fallback;
        }

        return str_starts_with($name, 'http') || str_starts_with($name, '/')
            ? $name
            : $prefix . $name;
    }

    // Diacak ulang cuma saat full page load; kunjungan Inertia pakai susunan dari session.
    private function galleryImages(): array
    {
        $key = 'home.gallery_images';

        if (request()->header('X-Inertia') && session()->has($key)) {
            return session($key);
        }

        $prefix = asset('storage/posts') . '/';

        $images = PostImage::inRandomOrder()
            ->limit(7)
            ->pluck('img_name')
            ->map(fn ($name) => $this->imageUrl($name, asset('storage/posts/'), $prefix))
            ->values()
            ->all();

        session([$key => $images]);

        return $images;
    }

    private function popularTrips(): array
    {
        return Trip::where('status', '!=', 'draft')
            ->orderByDesc('rating')
            ->limit(4)
            ->get()
            ->map(function ($trip) {
                $start  = Carbon::parse($trip->start_date);
                $end    = Carbon::parse($trip->end_date);
                $nights = (int) $start->diffInDays($end);

                return [
                    'id'       => $trip->id,
                    'title'    => $trip->location ?: $trip->name,
                    'duration' => ($nights + 1) . ' Hari, ' . $nights . ' Malam',
                    'rating'   => number_format((float) $trip->rating, 1, ',', '.'),
                    'image'    => $this->imageUrl(
                        $trip->image,
                        '/assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg',
                        '/storage/',
                    ),
                ];
            })
            ->all();
    }

    // Owner di-eager load & rating lewat subquery biar tidak N+1.
    private function latestJastip(): array
    {
        $likedJastipIds = auth()->check()
            ? DB::table('favorites')
                ->where('user_id', auth()->id())
                ->where('favoritable_type', 'jastip')
                ->pluck('favoritable_id')
                ->flip()
                ->all()
            : [];

        return JastipItem::query()
            ->where('status', JastipItem::STATUS_PUBLISHED)
            ->activeWindow() // jangan tampilkan jastip yang sudah lewat
            ->with(['jastip_item_images', 'user'])
            ->addSelect(['jastiper_rating' => DB::table('user_ratings')
                ->selectRaw('AVG(rating_amount)')
                ->whereColumn('rated_user_id', 'jastip_items.user_id')
                ->where('type', 'jastiper'),
            ])
            ->latest('created_at')
            ->limit(4)
            ->get()
            ->map(function ($item) use ($likedJastipIds) {
                $owner = $item->user;
                $now   = Carbon::now();

                if ($item->start_date && $now->lt(Carbon::parse($item->start_date))) {
                    $tag = ['type' => 'upcoming', 'date' => Carbon::parse($item->start_date)->translatedFormat('d M Y')];
                } elseif ($item->end_date) {
                    $tag = ['type' => 'ongoing', 'date' => Carbon::parse($item->end_date)->translatedFormat('d M Y')];
                } else {
                    $tag = null;
                }

                return [
                    'id'     => $item->id,
                    'name'   => $item->name,
                    'price'  => (float) $item->base_price + (float) $item->jastip_fee,
                    'from'   => $item->purchase_city ?: $item->purchase_province,
                    'to'     => $item->pickup_city ?: $item->pickup_province,
                    'tag'    => $tag,
                    'href'   => '/jastip/' . $item->id,
                    'liked'  => isset($likedJastipIds[$item->id]),
                    'image'  => $this->imageUrl(
                        $item->jastip_item_images->first()?->image_name,
                        '/assets/default-image.png',
                        asset('storage') . '/',
                    ),
                    'author' => $owner?->full_name ?? 'Jastiper',
                    'avatar' => $owner?->public_profile_image ?? asset('assets/default-profile.png'),
                    'rating' => number_format((float) ($item->jastiper_rating ?? 0), 1),
                ];
            })
            ->all();
    }
}
