<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * Streak "Nyala": tiap hari user aktif (login/buka aplikasi) menambah streak.
 * - Aktif hari ini (sudah dihitung) -> tidak berubah
 * - Aktif kemarin -> streak +1
 * - Bolong (lebih dari 1 hari) atau pertama kali -> streak reset ke 1
 * Hanya menulis ke DB sekali per hari.
 */
class UpdateStreak
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $today = Carbon::today();
            $last = $user->streak_last_date ? Carbon::parse($user->streak_last_date) : null;

            // Hanya proses jika belum dihitung untuk hari ini
            if (! $last || ! $last->isSameDay($today)) {
                if ($last && $last->isSameDay($today->copy()->subDay())) {
                    $user->streak_count = (int) $user->streak_count + 1;
                } else {
                    $user->streak_count = 1;
                }

                $user->streak_best = max((int) $user->streak_best, (int) $user->streak_count);
                $user->streak_last_date = $today->toDateString();
                $user->saveQuietly();
            }
        }

        return $next($request);
    }
}
