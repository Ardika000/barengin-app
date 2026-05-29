<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Trip>
 */
class TripFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'people_amount' => $this->faker->numberBetween(1, 100),
            'start_date' => $this->faker->date(),
            'end_date' => $this->faker->date(),
            'rating' => $this->faker->randomFloat(2, 1, 5),
            'price' => $this->faker->randomFloat(2, 100000, 10000000),
            "image" => "/assets/default-image.png"
        ];
    }
}
