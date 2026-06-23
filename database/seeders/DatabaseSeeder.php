<?php

namespace Database\Seeders;
use Database\Seeders\PostSeeder;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;
    public function run(): void
    {
        $this->call([
            TagSeeder::class,
            UsersSeeder::class,
            PostSeeder::class,
            PostTagSeeder::class,
            ChatSeeder::class,
            TripSeeder::class,
            TripFacilitySeeder::class,
            PergiBarengSeeder::class,
            FinancingEstimateSeeder::class,
            TripParticipantSeeder::class,
            AdminHistorySeeder::class,
        ]);
    }
}