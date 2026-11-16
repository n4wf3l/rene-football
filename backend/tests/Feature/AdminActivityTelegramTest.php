<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The Telegram bot tells the team when an article goes live or a player is
 * added from the back-office, and stays quiet on ordinary edits.
 */
class AdminActivityTelegramTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.telegram.bot_token' => 'test-token',
            'services.telegram.chat_id'   => '-1001234',
            'app.url'                     => 'https://renefootball.com',
        ]);
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);
        $this->actingAs(User::factory()->admin()->create(['name' => 'René']), 'sanctum');
    }

    public function test_publishing_a_new_article_is_announced(): void
    {
        $this->postJson('/api/admin/articles', [
            'title' => 'Premier but pour Hanibal', 'category' => 'Talents',
            'excerpt' => 'À 18 ans, il marque en BGL Ligue.', 'is_published' => true,
        ])->assertCreated();

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $r) => str_contains($r['text'], 'Article publié')
            && str_contains($r['text'], 'Premier but pour Hanibal')
            && str_contains($r['text'], 'À 18 ans, il marque en BGL Ligue.')
            && str_contains($r['text'], 'Catégorie : Talents')
            && str_contains($r['text'], 'Par René')
            && str_contains($r['text'], 'https://renefootball.com/actualites/premier-but-pour-hanibal'));
    }

    public function test_a_draft_is_announced_only_when_it_goes_live(): void
    {
        $this->postJson('/api/admin/articles', ['title' => 'Brouillon', 'category' => 'Agence', 'is_published' => false])
            ->assertCreated();
        Http::assertNothingSent();

        $this->putJson('/api/admin/articles/brouillon', ['title' => 'Brouillon', 'category' => 'Agence', 'is_published' => true])
            ->assertOk();
        Http::assertSentCount(1);

        // Further edits of a live article stay quiet.
        $this->putJson('/api/admin/articles/brouillon', ['title' => 'Brouillon', 'category' => 'Mercato', 'is_published' => true])
            ->assertOk();
        Http::assertSentCount(1);
    }

    public function test_editing_an_already_published_article_sends_nothing(): void
    {
        $article = Article::factory()->create(['title' => 'Déjà en ligne']);

        $this->putJson("/api/admin/articles/{$article->slug}", ['title' => 'Déjà en ligne', 'category' => 'Agence', 'excerpt' => 'Nouveau chapô'])
            ->assertOk();

        Http::assertNothingSent();
    }

    public function test_adding_a_player_is_announced(): void
    {
        $this->postJson('/api/admin/players', [
            'name' => 'Nouveau Joueur', 'age' => 17, 'position' => 'Latéral droit',
            'category' => 'Defenseur', 'club' => 'F91 Dudelange',
        ])->assertCreated();

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $r) => str_contains($r['text'], 'Nouveau joueur ajouté')
            && str_contains($r['text'], 'Nouveau Joueur')
            && str_contains($r['text'], 'Latéral droit · F91 Dudelange')
            && str_contains($r['text'], 'Par René'));
    }

    public function test_the_admin_action_succeeds_when_telegram_fails(): void
    {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => false], 500)]);

        $this->postJson('/api/admin/players', ['name' => 'Joueur Sans Bot', 'age' => 20, 'position' => 'Gardien', 'category' => 'Gardien'])
            ->assertCreated();
        $this->assertDatabaseHas('players', ['name' => 'Joueur Sans Bot']);
    }
}
