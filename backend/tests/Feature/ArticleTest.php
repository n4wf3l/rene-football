<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleTest extends TestCase
{
    use RefreshDatabase;

    /* -------------------- Public endpoints -------------------- */

    public function test_public_index_returns_only_published_articles(): void
    {
        Article::factory()->create(['title' => 'Published Article']);
        Article::factory()->unpublished()->create(['title' => 'Draft Article']);

        $titles = collect($this->getJson('/api/articles')->assertOk()->json('data'))
            ->pluck('title');

        $this->assertTrue($titles->contains('Published Article'));
        $this->assertFalse($titles->contains('Draft Article'));
    }

    public function test_public_index_orders_featured_first_then_by_published_date(): void
    {
        Article::factory()->create([
            'title' => 'Older normal',
            'published_at' => now()->subDays(5),
            'featured' => false,
        ]);
        Article::factory()->create([
            'title' => 'Recent normal',
            'published_at' => now()->subDay(),
            'featured' => false,
        ]);
        Article::factory()->featured()->create([
            'title' => 'Featured old',
            'published_at' => now()->subDays(30),
        ]);

        $titles = collect($this->getJson('/api/articles')->json('data'))->pluck('title')->all();
        $this->assertSame(['Featured old', 'Recent normal', 'Older normal'], $titles);
    }

    public function test_public_index_filters_by_category(): void
    {
        Article::factory()->create(['category' => 'Mercato', 'title' => 'M1']);
        Article::factory()->create(['category' => 'Mercato', 'title' => 'M2']);
        Article::factory()->create(['category' => 'Talents', 'title' => 'T1']);

        $titles = collect(
            $this->getJson('/api/articles?category=Mercato')->assertOk()->json('data')
        )->pluck('title');

        $this->assertCount(2, $titles);
        $this->assertFalse($titles->contains('T1'));
    }

    public function test_public_index_filters_by_player_slug(): void
    {
        $player = Player::factory()->create(['slug' => 'star-player']);
        Article::factory()->create(['player_id' => $player->id, 'title' => 'About Star']);
        Article::factory()->create(['player_id' => null, 'title' => 'Generic']);

        $titles = collect(
            $this->getJson('/api/articles?player=star-player')->assertOk()->json('data')
        )->pluck('title');

        $this->assertCount(1, $titles);
        $this->assertTrue($titles->contains('About Star'));
    }

    public function test_public_show_returns_published_article(): void
    {
        $article = Article::factory()->create(['title' => 'Detail Article']);

        $this->getJson("/api/articles/{$article->slug}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Detail Article')
            ->assertJsonStructure(['data' => ['id', 'slug', 'title', 'content', 'images', 'clips']]);
    }

    public function test_public_show_404s_for_unpublished_article(): void
    {
        $article = Article::factory()->unpublished()->create();

        $this->getJson("/api/articles/{$article->slug}")->assertStatus(404);
    }

    /* -------------------- Admin endpoints -------------------- */

    public function test_admin_index_requires_authentication(): void
    {
        $this->getJson('/api/admin/articles')->assertStatus(401);
    }

    public function test_admin_index_returns_all_articles_including_drafts(): void
    {
        Article::factory()->count(2)->create();
        Article::factory()->unpublished()->create();

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/articles')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_delete_an_article(): void
    {
        $admin   = User::factory()->admin()->create();
        $article = Article::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/articles/{$article->slug}")
            ->assertOk();

        $this->assertDatabaseMissing('articles', ['id' => $article->id]);
    }

    public function test_non_admin_cannot_delete_an_article(): void
    {
        $user    = User::factory()->create(['is_admin' => false]);
        $article = Article::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/admin/articles/{$article->slug}")
            ->assertStatus(403);

        $this->assertDatabaseHas('articles', ['id' => $article->id]);
    }
}
