<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Circle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Circle>
 */
class CircleFactory extends Factory
{
    protected $model = Circle::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'oshi_tag' => fake()->word(),
            'max_members' => 30,
            'plan' => 'free',
        ];
    }
}
