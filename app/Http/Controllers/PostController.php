<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Tag;
use App\Models\PostImage;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PostController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content_html' => ['required', 'string', 'max:20000'],
            'allows_comment' => ['required', 'boolean'],
            'location' => ['nullable', 'string', 'max:255'],

            'location_place' => ['nullable', 'string', 'max:20000'],

            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => ['file', 'image', 'max:5120'],

            'tag_names' => ['nullable', 'array', 'max:10'],
            'tag_names.*' => ['string', 'max:50'],
        ]);

        $userId = Auth::id();

        DB::transaction(function () use ($validated, $request, $userId) {
            $contentHtml = $validated['content_html'];

            // location handling
            $locationId = null;

            $placeRaw = $validated['location_place'] ?? null;
            $place = null;

            if (is_string($placeRaw) && $placeRaw !== '') {
                $decoded = json_decode($placeRaw, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $place = $decoded;
                }
            }

            if (is_array($place) && !empty($place['id'])) {
                $provider = $place['provider'] ?? 'osm';
                $providerPlaceId = (string) $place['id'];

                $address = is_array($place['address'] ?? null) ? $place['address'] : [];

                $location = Location::query()->firstOrCreate(
                    [
                        'provider' => $provider,
                        'provider_place_id' => $providerPlaceId,
                    ],
                    [
                        'name' => $place['name'] ?? null,
                        'display_name' => $place['display_name'] ?? ($validated['location'] ?? null),
                        'lat' => $place['lat'] ?? null,
                        'lng' => $place['lng'] ?? null,
                        'city' => $address['city'] ?? null,
                        'state' => $address['state'] ?? null,
                        'country' => $address['country'] ?? null,
                        'country_code' => $address['country_code'] ?? null,
                        'posts_count' => 0,
                    ]
                );

                // optional refresh
                $location->fill([
                    'name' => $place['name'] ?? $location->name,
                    'display_name' => $place['display_name'] ?? $location->display_name,
                    'lat' => $place['lat'] ?? $location->lat,
                    'lng' => $place['lng'] ?? $location->lng,
                    'city' => $address['city'] ?? $location->city,
                    'state' => $address['state'] ?? $location->state,
                    'country' => $address['country'] ?? $location->country,
                    'country_code' => $address['country_code'] ?? $location->country_code,
                ])->save();

                $location->increment('posts_count', 1);
                $locationId = $location->id;
            }

            $post = Post::create([
                'user_id' => $userId,
                'content' => $contentHtml,
                'allows_comment' => (bool) $validated['allows_comment'],
                'location' => $validated['location'] ?? null,
                'location_id' => $locationId,
                'like' => 0,
            ]);

            // images handling
            $files = $request->file('images', []);
            foreach ($files as $file) {
                $path = $file->store('posts', 'public');

                PostImage::create([
                    'post_id' => $post->id,
                    'img_name' => basename($path),
                ]);
            }

            // tags handling
            $tagNames = $this->normalizeChipTags($validated['tag_names'] ?? []);
            if (!empty($tagNames)) {
                $tagIds = [];
                foreach ($tagNames as $name) {
                    $tag = Tag::firstOrCreate([
                        'tag_key' => mb_strtolower($name),
                        'tag_name' => $name,
                    ]);
                    $tagIds[] = $tag->id;
                }
                $post->tags()->sync($tagIds);
            }
        });

        return redirect()->back();
    }

    private function normalizeChipTags(array $tags): array
    {
        $out = [];

        foreach ($tags as $t) {
            $name = (string) $t;
            $name = ltrim($name, "#");
            $name = preg_replace('/\s+/u', ' ', $name) ?? $name;
            $name = trim($name);

            if ($name === '') continue;

            if (mb_strlen($name) > 50) {
                $name = mb_substr($name, 0, 50);
            }

            $out[] = $name;
        }

        $unique = [];
        $seen = [];

        foreach ($out as $name) {
            $key = mb_strtolower($name);
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            $unique[] = $name;
        }

        return $unique;
    }
}