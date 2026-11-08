<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Social-app scrapers get server-rendered Open Graph tags for articles and
 * player profiles (the SPA's tags are only set by JavaScript).
 */
class SharePreviewTest extends TestCase
{
    use RefreshDatabase;

    private const WHATSAPP = 'WhatsApp/2.24.10.85 A';

    public function test_article_preview_uses_its_title_excerpt_and_cover(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('articles/cover.jpg', UploadedFile::fake()->image('c.jpg', 1200, 750)->getContent());
        $article = Article::factory()->create([
            'slug'      => 'lutsen-signs',
            'title'     => 'Lutsen signs with AJ Auxerre',
            'excerpt'   => 'The left-back joins the agency.',
            'cover_url' => '/storage/articles/cover.jpg',
        ]);

        $html = $this->get("/actualites/{$article->slug}", ['User-Agent' => self::WHATSAPP])
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8')
            ->getContent();

        $this->assertStringContainsString('<meta property="og:title" content="Lutsen signs with AJ Auxerre" />', $html);
        $this->assertStringContainsString('<meta property="og:description" content="The left-back joins the agency." />', $html);
        $this->assertStringContainsString('<meta property="og:image" content="http://localhost/storage/articles/cover.jpg" />', $html);
        $this->assertStringContainsString('<meta property="og:image:width" content="1200" />', $html);
        $this->assertStringContainsString('<meta property="og:type" content="article" />', $html);
        $this->assertStringContainsString('<meta property="og:url" content="http://localhost/actualites/lutsen-signs" />', $html);
    }

    public function test_player_preview_uses_photo_and_bio(): void
    {
        $player = Player::factory()->create([
            'slug'      => 'lutsen-sohan-tizgha',
            'name'      => 'Lutsen Sohan Tizgha',
            'position'  => 'Latéral gauche',
            'club'      => 'AJ Auxerre',
            'bio'       => 'Latéral gauche franco-marocain.',
            'photo_url' => 'https://cdn.example.com/lutsen.jpg',
        ]);

        $html = $this->get("/joueurs/{$player->slug}", ['User-Agent' => self::WHATSAPP])->assertOk()->getContent();

        $this->assertStringContainsString('content="Lutsen Sohan Tizgha · Latéral gauche · AJ Auxerre"', $html);
        $this->assertStringContainsString('<meta property="og:description" content="Latéral gauche franco-marocain." />', $html);
        $this->assertStringContainsString('<meta property="og:image" content="https://cdn.example.com/lutsen.jpg" />', $html);
    }

    public function test_unpublished_or_unknown_content_gets_the_generic_preview(): void
    {
        $draft = Article::factory()->unpublished()->create(['title' => 'Secret draft']);

        $html = $this->get("/actualites/{$draft->slug}")->assertOk()->getContent();
        $this->assertStringNotContainsString('Secret draft', $html);
        $this->assertStringContainsString('Agence de football au Luxembourg', $html);

        $this->get('/joueurs/nobody-here')->assertOk()->assertSee('logo-black.png', false);
    }

    public function test_text_is_escaped(): void
    {
        $article = Article::factory()->create(['title' => 'Quote " and <b>tag</b>', 'excerpt' => 'x']);

        $html = $this->get("/actualites/{$article->slug}")->getContent();
        $this->assertStringNotContainsString('<b>tag</b>', $html);
        $this->assertStringContainsString('Quote &quot; and &lt;b&gt;tag&lt;/b&gt;', $html);
    }
}
