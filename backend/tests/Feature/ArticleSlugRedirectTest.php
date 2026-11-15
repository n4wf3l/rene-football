<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Editing an article's title changes its slug: the former URL must keep
 * working (301 on the public page, current article from the API) instead
 * of answering 404.
 */
class ArticleSlugRedirectTest extends TestCase
{
    use RefreshDatabase;

    private function rename(Article $article, string $title): Article
    {
        $this->actingAs(User::factory()->admin()->create(), 'sanctum')
            ->putJson("/api/admin/articles/{$article->slug}", [
                'title'    => $title,
                'category' => $article->category,
            ])
            ->assertOk();

        return $article->fresh();
    }

    public function test_title_edit_keeps_the_old_slug_as_a_redirect(): void
    {
        $article = Article::factory()->create(['title' => 'Abakar avec les U23', 'slug' => 'abakar-avec-les-u23']);

        $article = $this->rename($article, 'À seulement 17 ans, Abakar franchit une étape');

        $this->assertSame('a-seulement-17-ans-abakar-franchit-une-etape', $article->slug);
        $this->assertDatabaseHas('article_slug_redirects', ['slug' => 'abakar-avec-les-u23', 'article_id' => $article->id]);
    }

    public function test_old_public_url_redirects_permanently_to_the_current_one(): void
    {
        $article = Article::factory()->create(['title' => 'Ancien titre', 'slug' => 'ancien-titre']);
        $article = $this->rename($article, 'Nouveau titre');

        $this->get('/actualites/ancien-titre')
            ->assertStatus(301)
            ->assertRedirect('/actualites/nouveau-titre');
        $this->get('/actualites/nouveau-titre')->assertOk();
    }

    public function test_every_former_slug_redirects_to_the_latest_one(): void
    {
        $article = Article::factory()->create(['title' => 'Premier', 'slug' => 'premier']);
        $article = $this->rename($article, 'Deuxième');
        $article = $this->rename($article, 'Troisième');

        $this->get('/actualites/premier')->assertStatus(301)->assertRedirect('/actualites/troisieme');
        $this->get('/actualites/deuxieme')->assertStatus(301)->assertRedirect('/actualites/troisieme');
    }

    public function test_api_resolves_an_old_slug_to_the_current_article(): void
    {
        $article = Article::factory()->create(['title' => 'Ancien titre', 'slug' => 'ancien-titre']);
        $article = $this->rename($article, 'Nouveau titre');

        $this->getJson('/api/articles/ancien-titre')
            ->assertOk()
            ->assertJsonPath('data.id', $article->id)
            ->assertJsonPath('data.slug', 'nouveau-titre');
    }

    public function test_going_back_to_an_old_title_makes_its_url_live_again(): void
    {
        $article = Article::factory()->create(['title' => 'Titre A', 'slug' => 'titre-a']);
        $article = $this->rename($article, 'Titre B');
        $article = $this->rename($article, 'Titre A');

        $this->assertSame('titre-a', $article->slug);
        $this->assertDatabaseMissing('article_slug_redirects', ['slug' => 'titre-a']);
        $this->get('/actualites/titre-a')->assertOk();
        $this->get('/actualites/titre-b')->assertStatus(301)->assertRedirect('/actualites/titre-a');
    }

    public function test_a_live_article_wins_over_a_former_slug(): void
    {
        $first = Article::factory()->create(['title' => 'Mercato', 'slug' => 'mercato']);
        $this->rename($first, 'Mercato d\'hiver');
        Article::factory()->create(['title' => 'Mercato', 'slug' => 'mercato']);

        $this->get('/actualites/mercato')->assertOk();
    }

    public function test_old_slug_of_an_unpublished_article_is_not_found(): void
    {
        $article = Article::factory()->create(['title' => 'Ancien titre', 'slug' => 'ancien-titre']);
        $article = $this->rename($article, 'Nouveau titre');
        $article->update(['is_published' => false]);

        $this->get('/actualites/ancien-titre')->assertNotFound();
        $this->getJson('/api/articles/ancien-titre')->assertNotFound();
    }

    public function test_deleting_an_article_removes_its_redirects(): void
    {
        $article = Article::factory()->create(['title' => 'Ancien titre', 'slug' => 'ancien-titre']);
        $article = $this->rename($article, 'Nouveau titre');
        $article->delete();

        $this->assertDatabaseCount('article_slug_redirects', 0);
        $this->get('/actualites/ancien-titre')->assertNotFound();
    }
}
