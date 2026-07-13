<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Perbarui `last_seen_at` pengguna yang login pada setiap request (di-throttle),
 * agar indikator "online" mencerminkan kehadiran nyata di seluruh aplikasi —
 * tidak bergantung pada WebSocket/Pusher (penting untuk shared hosting).
 */
class TrackLastSeen
{
    // Jangan menulis DB lebih sering dari ini.
    private const THROTTLE_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user
            && (! $user->last_seen_at || $user->last_seen_at->lt(now()->subSeconds(self::THROTTLE_SECONDS)))) {
            // saveQuietly agar tidak memicu event model lain.
            $user->forceFill(['last_seen_at' => now()])->saveQuietly();
        }

        return $next($request);
    }
}
