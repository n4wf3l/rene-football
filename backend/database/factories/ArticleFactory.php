<?php

namespace Database\Factories;

use App\Models\Article;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->sentence(6);
        return [
            'slug'         => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 999999),
            'title'        => $title,
            'excerpt'      => fake()->paragraph(2),
            'content'      => fake()->paragraphs(6, true),
            'category'     => fake()->randomElement(['Mercato', 'Talents', 'Profils', 'Coulisses', 'Agence']),
            'cover_url'    => null,
            'featured'     => false,
            'player_id'    => null,
            'is_published' => true,
            'published_at' => now(),
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn () => ['is_published' => false, 'published_at' => null]);
    }

    public function featured(): static
    {
        return $this->state(fn () => ['featured' => true]);
    }
}
