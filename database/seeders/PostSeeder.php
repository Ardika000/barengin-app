<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostImage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::query()->pluck('id')->all();

        if (count($users) < 2) {
            $this->command?->warn('PostSeeder: Need at least 2 users. Please seed users first.');
            return;
        }

        $locations = [
            'Bogor',
            'Bandung',
            'Jakarta',
            'Yogyakarta',
            'Bali',
            null,
        ];

        $postContents = [
            'Bila kau je jelaki dalam rumah be like 🤣🤣 semua menjadi pulak tu #indonesia #landscape',
            'Definisi real-life hero tanpa jubah. Membelah kemacetan pasar tumpah demi jemput rezeki.',
            'Trip dadakan tapi worth it banget. Ada yang pernah ke sini juga?',
            'Sunset hari ini bikin tenang. Kadang yang kita butuh cuma waktu.',
            'Aku baru sadar jalan jauh itu seru kalau ada temannya. Siapa mau bareng next time?',
        ];

        // Create 12 posts
        $posts = collect(range(1, 12))->map(function () use ($users, $locations, $postContents) {
            return Post::create([
                'user_id' => Arr::random($users),
                'content' => Arr::random($postContents),
                'allows_comment' => true,
                'location' => Arr::random($locations),
                'like' => rand(0, 25000),
            ]);
        });

        // Add images for each post (1–3 images)
        foreach ($posts as $post) {
            $imageCount = rand(1, 3);

            for ($i = 0; $i < $imageCount; $i++) {
                PostImage::create([
                    'post_id' => $post->id,
                    'img_name' => '/assets/default-profile.png',
                ]);
            }
        }

        $commentTexts = [
            'Wah ini keren banget!',
            'Di mana ini? Pengen ke sana juga.',
            'Setuju sih, vibes-nya dapet banget.',
            'Auto masuk bucket list.',
            'Hahaha relatable 😂',
            'Semangat terus!🔥',
            'Cakep banget fotonya!',
            'Aku pernah lewat sini, emang macet tapi seru.',
            'Boleh share tips itinerary-nya?',
        ];

        // Comments + replies (max 2 levels)
        foreach ($posts as $post) {
            $topLevelCount = rand(2, 6);

            $topComments = collect();

            // top-level comments
            for ($i = 0; $i < $topLevelCount; $i++) {
                $topComments->push(
                    PostComment::create([
                        'post_id' => $post->id,
                        'user_id' => Arr::random($users),
                        'parent_id' => null, // IMPORTANT: requires parent_id nullable in migration
                        'comment_text' => Arr::random($commentTexts),
                        'like' => rand(0, 15000),
                    ])
                );
            }

            // replies (level 2)
            foreach ($topComments as $parent) {
                $replyCount = rand(0, 3);

                for ($r = 0; $r < $replyCount; $r++) {
                    PostComment::create([
                        'post_id' => $post->id,
                        'user_id' => Arr::random($users),
                        'parent_id' => $parent->id,
                        'comment_text' => Arr::random($commentTexts),
                        'like' => rand(0, 5000),
                    ]);
                }
            }
        }

        $this->command?->info('PostSeeder: Seeded posts, images, comments, and replies.');
    }
}