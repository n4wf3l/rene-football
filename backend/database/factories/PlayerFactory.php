<?php

namespace Database\Factories;

use App\Models\Player;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Player>
 */
class PlayerFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->name('male');
        return [
            'slug'            => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 999999),
            'name'            => $name,
            'age'             => fake()->numberBetween(16, 34),
            'height'          => fake()->numberBetween(165, 195).' cm',
            'position'        => fake()->randomElement(['Attaquant', 'Milieu', 'Défenseur', 'Gardien']),
            'category'        => fake()->randomElement(['Attaquant', 'Milieu', 'Defenseur', 'Gardien']),
            'club'            => fake()->company(),
            'nationality'     => fake()->countryCode(),
            'preferred_foot'  => fake()->randomElement(['Droit', 'Gauche', 'Ambidextre']),
            'since'           => fake()->numberBetween(2015, 2025),
            'matches_played'  => fake()->numberBetween(0, 40),
            'goals'           => fake()->numberBetween(0, 25),
            'assists'         => fake()->numberBetween(0, 15),
            'minutes_played'  => fake()->numberBetween(0, 3200),
            'is_published'    => true,
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn () => ['is_published' => false]);
    }

    public function keeper(): static
    {
        return $this->state(fn () => [
            'category'      => 'Gardien',
            'position'      => 'Gardien',
            'clean_sheets'  => fake()->numberBetween(0, 15),
            'saves'         => fake()->numberBetween(0, 120),
        ]);
    }
}
