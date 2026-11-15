<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Public pages are served as the SPA shell with their own head tags, so
 * search engines and link previews see each page's real title, description
 * and image without running JavaScript - and visitors get no cookie.
 */
class PublicPageTest extends TestCase
{
    use RefreshDatabase;

    private string $shellPath;

    protected function setUp(): void
    {
        parent::setUp();
        // A shell shaped like the real index.html, with its generic tags.
        $this->shellPath = tempnam(sys_get_temp_dir(), 'shell').'.html';
        file_put_contents($this->shellPath, <<<'HTML'
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Rene Football · Agence de football au Luxembourg</title>
    <meta name="description" content="Agent FIFA licencié basé au Luxembourg." />
    <link rel="canonical" href="https://renefootball.com/" />
    <meta property="og:title" content="Rene Football · Agence de football au Luxembourg" />
    <meta property="og:image" content="https://renefootball.com/logo-black.png" />
    <meta name="twitter:title" content="Rene Football" />
    <meta name="robots" content="index, follow" />
    <meta name="googlebot" content="index, follow" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-abc.js"></script>
  </body>
</html>
HTML);
        config(['app.spa_index' => $this->shellPath]);
    }

    protected function tearDown(): void
    {
        @unlink($this->shellPath);
        parent::tearDown();
    }

    public function test_player_page_carries_its_own_title_description_and_structured_data(): void
    {
        $player = Player::factory()->create([
            'slug' => 'hanibal-tesfegabir-solomon', 'name' => 'Hanibal Tesfegabir Solomon',
            'position' => 'Ailier gauche', 'club' => 'F91 Dudelange', 'nationality' => 'Belge',
            'bio' => 'Ailier gauche rapide et créatif, formé au Luxembourg.',
            'photo_url' => 'https://cdn.example.com/hanibal.jpg',
        ]);

        $html = $this->get('/joueurs/'.$player->slug)->assertOk()->getContent();

        // The app itself is served: same page for people and robots.
        $this->assertStringContainsString('<div id="root"></div>', $html);
        $this->assertStringContainsString('/assets/index-abc.js', $html);
        // One title, the player's; the generic home tags are gone.
        $this->assertSame(1, substr_count($html, '<title'));
        $this->assertStringContainsString('<title data-rh="true">Hanibal Tesfegabir Solomon · Ailier gauche · F91 Dudelange · Rene Football</title>', $html);
        $this->assertStringNotContainsString('Agent FIFA licencié basé au Luxembourg."', $html);
        $this->assertStringContainsString('name="description" content="Ailier gauche rapide et créatif, formé au Luxembourg."', $html);
        $this->assertStringContainsString('rel="canonical" href="http://localhost/joueurs/hanibal-tesfegabir-solomon"', $html);
        $this->assertStringContainsString('property="og:image" content="https://cdn.example.com/hanibal.jpg"', $html);
        $this->assertStringContainsString('property="og:type" content="profile"', $html);
        $this->assertStringNotContainsString('name="googlebot"', $html);
        // schema.org: the player and the breadcrumb.
        $this->assertStringContainsString('"@type":"Person","name":"Hanibal Tesfegabir Solomon"', $html);
        $this->assertStringContainsString('"affiliation":{"@type":"SportsTeam","name":"F91 Dudelange"}', $html);
        $this->assertStringContainsString('"@type":"BreadcrumbList"', $html);
    }

    public function test_article_page_carries_news_article_data_and_cover_size(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('articles/cover.jpg', UploadedFile::fake()->image('c.jpg', 1200, 750)->getContent());
        $article = Article::factory()->create([
            'slug' => 'lutsen-signs', 'title' => 'Lutsen signs with AJ Auxerre',
            'excerpt' => 'The left-back joins the agency.', 'cover_url' => '/storage/articles/cover.jpg',
        ]);

        $html = $this->get('/actualites/'.$article->slug)->assertOk()->getContent();

        $this->assertStringContainsString('<title data-rh="true">Lutsen signs with AJ Auxerre · Rene Football</title>', $html);
        $this->assertStringContainsString('property="og:image" content="http://localhost/storage/articles/cover.jpg"', $html);
        $this->assertStringContainsString('property="og:image:width" content="1200"', $html);
        $this->assertStringContainsString('property="og:type" content="article"', $html);
        $this->assertStringContainsString('"@type":"NewsArticle","headline":"Lutsen signs with AJ Auxerre"', $html);
    }

    public function test_static_pages_get_their_own_title(): void
    {
        $this->get('/joueurs')->assertOk()->assertSee('<title data-rh="true">Nos joueurs · Rene Football</title>', false);
        $this->get('/a-propos')->assertOk()->assertSee('<title data-rh="true">À propos · Rene Football</title>', false);
    }

    public function test_unknown_or_unpublished_content_is_a_real_404(): void
    {
        $draft = Article::factory()->unpublished()->create(['title' => 'Secret draft']);

        $res = $this->get('/actualites/'.$draft->slug)->assertNotFound();
        $this->assertStringNotContainsString('Secret draft', $res->getContent());
        $this->assertStringContainsString('name="robots" content="noindex, follow"', $res->getContent());
        $this->get('/joueurs/nobody-here')->assertNotFound()->assertSee('<div id="root"></div>', false);
    }

    public function test_old_player_url_with_another_name_order_redirects(): void
    {
        Player::factory()->create(['slug' => 'hanibal-tesfegabir-solomon']);

        $this->get('/joueurs/tesfegabir-solomon-hanibal')->assertStatus(301)
            ->assertRedirect('/joueurs/hanibal-tesfegabir-solomon');
    }

    public function test_text_is_escaped(): void
    {
        $article = Article::factory()->create(['title' => 'Quote " and <b>tag</b>', 'excerpt' => 'x']);

        $html = $this->get('/actualites/'.$article->slug)->getContent();
        $this->assertStringNotContainsString('<b>tag</b>', $html);
        $this->assertStringContainsString('Quote &quot; and &lt;b&gt;tag&lt;/b&gt;', $html);
    }

    public function test_public_responses_set_no_cookie(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('players/p.jpg', 'x');
        $player = Player::factory()->create();

        foreach (['/joueurs/'.$player->slug, '/joueurs', '/robots.txt', '/sitemap.xml', '/storage/players/p.jpg'] as $url) {
            $this->assertSame([], $this->get($url)->headers->getCookies(), "cookie set on $url");
        }
    }

    public function test_without_a_built_shell_a_minimal_page_still_has_the_tags(): void
    {
        config(['app.spa_index' => '/nonexistent/index.html']);
        $player = Player::factory()->create(['name' => 'Ali Test']);

        // No public_html or frontend/dist next to the backend in this case either.
        if (is_file(base_path('../public_html/index.html')) || is_file(base_path('../frontend/dist/index.html'))) {
            $this->markTestSkipped('A built index.html exists next to the backend.');
        }
        $this->get('/joueurs/'.$player->slug)->assertOk()->assertSee('<title data-rh="true">Ali Test', false);
    }
}
