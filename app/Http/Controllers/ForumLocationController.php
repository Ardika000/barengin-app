<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ForumLocationController extends Controller
{
    private function toPlaceShapeFromLocation(Location $l): array
    {
        return [
            'id' => $l->provider_place_id, // example is 'osm:relation:12345' yeak karena pakai nomatinim
            'name' => $l->name,
            'display_name' => $l->display_name,
            'lat' => $l->lat !== null ? (float) $l->lat : null,
            'lng' => $l->lng !== null ? (float) $l->lng : null,
            'address' => [
                'city' => $l->city,
                'state' => $l->state,
                'country' => $l->country,
                'country_code' => $l->country_code,
            ],
            'raw' => [
                'provider' => $l->provider,
                'provider_place_id' => $l->provider_place_id,
            ],
            'posts_count' => (int) $l->posts_count,
        ];
    }

    public function popular(Request $request)
    {
        $limit = (int) $request->query('limit', 8);
        $limit = max(1, min(20, $limit));

        $rows = Location::query()
            ->where('posts_count', '>', 0)
            ->orderByDesc('posts_count')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $data = $rows->map(fn ($l) => $this->toPlaceShapeFromLocation($l))->values();

        return response()->json(['data' => $data]);
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        // popular when empty/short
        if (mb_strlen($q) < 2) {
            $rows = Location::query()
                ->where('posts_count', '>', 0)
                ->orderByDesc('posts_count')
                ->orderByDesc('id')
                ->limit(8)
                ->get();

            $data = $rows->map(function (Location $l) {
                return [
                    'id' => $l->provider_place_id,
                    'name' => $l->name,
                    'display_name' => $l->display_name,
                    'lat' => $l->lat !== null ? (float) $l->lat : null,
                    'lng' => $l->lng !== null ? (float) $l->lng : null,
                    'address' => [
                        'city' => $l->city,
                        'state' => $l->state,
                        'country' => $l->country,
                        'country_code' => $l->country_code,
                    ],
                    'raw' => [
                        'provider' => $l->provider,
                        'provider_place_id' => $l->provider_place_id,
                    ],
                    'posts_count' => (int) $l->posts_count,
                ];
            })->values();

            return response()->json(['data' => $data]);
        }

        $base = config('services.nominatim.base_url');
        $email = config('services.nominatim.email');
        $ua = config('services.nominatim.user_agent');

        $cacheKey = 'nominatim:search:' . md5(mb_strtolower($q));

        $rawItems = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($base, $email, $ua, $q) {
            $resp = Http::withHeaders([
                'User-Agent' => $ua,
                'Accept-Language' => 'id,en;q=0.8',
            ])->get($base . '/search', [
                'q' => $q,
                'format' => 'jsonv2',
                'addressdetails' => 1,
                'limit' => 8,
                'email' => $email,
            ]);

            if (!$resp->ok()) return [];
            $json = $resp->json();
            return is_array($json) ? $json : [];
        });

        $normalized = collect($rawItems)->map(function ($x) {
            $address = $x['address'] ?? [];
            $placeKey = 'osm:' . ($x['osm_type'] ?? '') . ':' . ($x['osm_id'] ?? '');

            return [
                'id' => $placeKey,
                'name' => $x['name'] ?? ($address['amenity'] ?? null) ?? null,
                'display_name' => $x['display_name'] ?? null,
                'lat' => isset($x['lat']) ? (float) $x['lat'] : null,
                'lng' => isset($x['lon']) ? (float) $x['lon'] : null,
                'address' => [
                    'city' => $address['city'] ?? $address['town'] ?? $address['village'] ?? null,
                    'state' => $address['state'] ?? null,
                    'country' => $address['country'] ?? null,
                    'country_code' => $address['country_code'] ?? null,
                ],
                'raw' => [
                    'osm_type' => $x['osm_type'] ?? null,
                    'osm_id' => $x['osm_id'] ?? null,
                    'place_id' => $x['place_id'] ?? null,
                    'type' => $x['type'] ?? null,
                ],
                'posts_count' => null,
            ];
        });

        $ids = $normalized->pluck('id')->filter()->unique()->values()->all();

        $counts = Location::query()
            ->whereIn('provider_place_id', $ids)
            ->pluck('posts_count', 'provider_place_id');

        $data = $normalized->map(function ($p) use ($counts) {
            $id = $p['id'];
            $p['posts_count'] = isset($counts[$id]) ? (int) $counts[$id] : null;
            return $p;
        })->values();

        return response()->json(['data' => $data]);
    }

    public function reverse(Request $request)
    {
        $lat = $request->query('lat');
        $lng = $request->query('lng');

        if ($lat === null || $lng === null) {
            return response()->json(['data' => null], 422);
        }

        $base = config('services.nominatim.base_url');
        $email = config('services.nominatim.email');
        $ua = config('services.nominatim.user_agent');

        $cacheKey = 'nominatim:reverse:' . md5($lat . ',' . $lng);

        $data = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($base, $email, $ua, $lat, $lng) {
            $resp = Http::withHeaders([
                'User-Agent' => $ua,
                'Accept-Language' => 'id,en;q=0.8',
            ])->get($base . '/reverse', [
                'lat' => $lat,
                'lon' => $lng,
                'format' => 'jsonv2',
                'addressdetails' => 1,
                'email' => $email,
            ]);

            if (!$resp->ok()) return null;

            $x = $resp->json();
            if (!is_array($x)) return null;

            $address = $x['address'] ?? [];
            $placeKey = 'osm:' . ($x['osm_type'] ?? '') . ':' . ($x['osm_id'] ?? '');

            return [
                'id' => $placeKey,
                'name' => $x['name'] ?? ($address['amenity'] ?? null) ?? null,
                'display_name' => $x['display_name'] ?? null,
                'lat' => isset($x['lat']) ? (float) $x['lat'] : null,
                'lng' => isset($x['lon']) ? (float) $x['lon'] : null,
                'address' => [
                    'city' => $address['city'] ?? $address['town'] ?? $address['village'] ?? null,
                    'state' => $address['state'] ?? null,
                    'country' => $address['country'] ?? null,
                    'country_code' => $address['country_code'] ?? null,
                ],
                'raw' => [
                    'osm_type' => $x['osm_type'] ?? null,
                    'osm_id' => $x['osm_id'] ?? null,
                    'place_id' => $x['place_id'] ?? null,
                ],
                'posts_count' => null,
            ];
        });

        return response()->json(['data' => $data]);
    }
}