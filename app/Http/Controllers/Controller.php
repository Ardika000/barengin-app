<?php

namespace App\Http\Controllers;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

abstract class Controller
{
    /**
     * Ringkasan rating akun (untuk kartu "Performa Akun" di halaman analitik).
     * Mengambil dari tabel user_ratings sesuai tipe (mis. 'trip_bareng' untuk
     * pemandu trip, 'pergi_bareng' untuk penyelenggara pergi bareng).
     *
     * @return array{average: float, count: int, breakdown: array<int,int>, reviews: array<int,array<string,mixed>>}
     */
    protected function accountRating(int $userId, string $type): array
    {
        $rows = DB::table('user_ratings')
            ->leftJoin('users', 'user_ratings.user_id', '=', 'users.id')
            ->where('user_ratings.rated_user_id', $userId)
            ->where('user_ratings.type', $type)
            ->orderByDesc('user_ratings.created_at')
            ->orderByDesc('user_ratings.id')
            ->get([
                'user_ratings.id',
                'user_ratings.rating_amount',
                'user_ratings.comment',
                'user_ratings.created_at',
                'users.full_name as reviewer_name',
                'users.profile_image as reviewer_image',
            ]);

        $count = $rows->count();

        $breakdown = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
        foreach ($rows as $row) {
            $star = (int) round((float) $row->rating_amount);
            $star = max(1, min(5, $star));
            $breakdown[$star]++;
        }

        // Daftar ulasan tertulis (yang punya komentar) — terbaru lebih dulu.
        $reviews = $rows
            ->filter(fn ($r) => trim((string) $r->comment) !== '')
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->reviewer_name,
                'avatar' => $this->resolveAvatarUrl($r->reviewer_image),
                'rating' => (float) $r->rating_amount,
                'comment' => $r->comment,
                'date' => Carbon::parse($r->created_at)->translatedFormat('d M Y'),
            ])
            ->values()
            ->all();

        return [
            'average' => $count > 0 ? round((float) $rows->avg(fn ($r) => (float) $r->rating_amount), 1) : 0.0,
            'count' => $count,
            'breakdown' => $breakdown,
            'reviews' => $reviews,
        ];
    }

    /**
     * Resolusi path gambar tersimpan menjadi URL, dengan gambar default
     * generik sebagai fallback saat tidak ada gambar yang diunggah.
     */
    protected function resolveStoredImage(?string $path, string $fallback = '/assets/default-image.png'): string
    {
        if (! $path) {
            return $fallback;
        }

        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }

        return '/storage/' . $path;
    }

    /**
     * Ubah nilai kolom profile_image menjadi URL yang valid untuk ditampilkan.
     */
    protected function resolveAvatarUrl(?string $path): string
    {
        if (! $path) {
            return asset('assets/default-profile.png');
        }

        if (Str::startsWith($path, ['http://', 'https://', '/'])) {
            return $path;
        }

        return asset('storage/' . $path);
    }
}
