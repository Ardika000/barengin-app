<?php

namespace App\Http\Controllers;

use App\Models\JastipItem;
use App\Models\PostImage;
use App\Models\Trip;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Beranda publik.
 *
 * Sebelumnya seluruh isi method ini hidup sebagai closure di routes/web.php.
 * Dipindah ke sini bukan sekadar demi kerapian: bentuk closure membuat query-nya
 * tak terlihat sebagai kode yang perlu dirawat, dan di sanalah dua N+1 sempat
 * menumpuk tanpa ketahuan (lihat catatan di latestJastip()).
 */
class HomeController extends Controller
{
    public function index()
    {
        return inertia('Home/Index', [
            // Closure = dievaluasi hanya saat prop ini benar-benar dikirim, jadi
            // partial reload yang tak memintanya (mis. hanya 'latestJastip') tak
            // menyentuh galeri sama sekali.
            'galleryImages' => fn () => $this->galleryImages(),
            'popularTrips'  => $this->popularTrips(),
            'latestJastip'  => $this->latestJastip(),
        ]);
    }

    /**
     * Resolusi URL gambar (3 kasus, lihat requirement non-fungsional): kosong →
     * gambar default, URL absolut/path akar → dipakai apa adanya, selain itu →
     * diberi prefix storage.
     *
     * `$prefix` sengaja jadi parameter, bukan dipukul rata: tiap seksi beranda
     * memakai prefix yang berbeda (`/storage/` literal untuk trip, `asset()`
     * untuk jastip, subfolder `posts/` untuk galeri). Menyeragamkannya di sini
     * akan diam-diam mengubah URL yang sudah jalan, jadi perilakunya
     * dipertahankan apa adanya.
     */
    private function imageUrl(?string $name, string $fallback, string $prefix): string
    {
        if (! $name) {
            return $fallback;
        }

        return str_starts_with($name, 'http') || str_starts_with($name, '/')
            ? $name
            : $prefix . $name;
    }

    /**
     * Sebagian gambar acak dari postingan forum untuk galeri beranda.
     *
     * Diacak ulang HANYA saat halaman dimuat penuh (refresh browser / kunjungan
     * langsung) — permintaan itu tak membawa header `X-Inertia`. Pada kunjungan
     * Inertia (partial reload, mis. klik "suka" di kartu jastip) susunan yang
     * tersimpan di session dipakai ulang, sehingga galeri tak ikut teracak ulang
     * di tengah interaksi. Session bersifat per-pengguna, jadi tiap orang dapat
     * susunannya sendiri sampai me-refresh.
     */
    private function galleryImages(): array
    {
        $key = 'home.gallery_images';

        if (request()->header('X-Inertia') && session()->has($key)) {
            return session($key);
        }

        // asset() memangkas garis miring di belakang, jadi pemisahnya ditambahkan
        // sendiri — tanpa itu 'foo.jpg' jadi '.../postsfoo.jpg'. Nilai untuk nama
        // kosong sengaja dibiarkan tanpa garis miring, persis seperti sebelumnya.
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

    /** Trip populer (sudah dipublish), diurutkan rating tertinggi. */
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

    /**
     * Jastip terbaru (published & masih aktif) — bentuk data = props JastipCard.
     *
     * Pemilik dan rating-nya dulu diambil di dalam map(): satu `User::find()` dan
     * satu `avg()` ke `user_ratings` untuk TIAP item. Jumlahnya memang terbatas 4,
     * jadi tak pernah terasa — tapi polanya tetap N+1 dan akan ikut membesar
     * kalau limitnya dinaikkan. Sekarang pemilik di-eager load dan rating dihitung
     * lewat subquery, sehingga seluruh seksi ini tetap 2 query berapa pun limitnya.
     */
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
                        // Lihat catatan di galleryImages(): asset() memangkas
                        // garis miring di belakang.
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
