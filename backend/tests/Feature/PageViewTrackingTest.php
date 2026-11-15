<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Anonymous page-view counter: what gets stored, what gets ignored, and
 * what the admin "Fréquentation" endpoint returns.
 */
class PageViewTrackingTest extends TestCase
{
    use RefreshDatabase;

    private const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

    private function track(array $payload, string $userAgent = self::BROWSER, string $ip = '203.0.113.7')
    {
        return $this->withHeaders(['User-Agent' => $userAgent])
            ->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/track/view', $payload);
    }

    public function test_records_a_player_view_without_ip_or_user_agent(): void
    {
        $this->track(['path' => '/joueurs/Saeed-Adams/?utm=x#top'])->assertNoContent();

        $view = PageView::sole();
        $this->assertSame('/joueurs/saeed-adams', $view->path);
        $this->assertSame('player', $view->resource_type);
        $this->assertSame('saeed-adams', $view->slug);
        $this->assertSame(64, strlen($view->visitor_hash));

        $columns = Schema::getColumnListing('page_views');
        $this->assertNotContains('ip', $columns);
        $this->assertNotContains('user_agent', $columns);
        $this->assertStringNotContainsString('203.0.113.7', json_encode($view->getAttributes()));
    }

    public function test_article_and_plain_pages_get_their_type(): void
    {
        $this->track(['path' => '/actualites/une-signature']);
        $this->track(['path' => '/contact']);

        $this->assertSame(['article', 'page'], PageView::orderBy('id')->pluck('resource_type')->all());
        $this->assertNull(PageView::where('path', '/contact')->value('slug'));
    }

    public function test_ignores_bots_admin_and_odd_paths(): void
    {
        $this->track(['path' => '/'], 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
        $this->track(['path' => '/'], '');
        $this->track(['path' => '/'], 'Mozilla/5.0 HeadlessChrome/130.0');
        $this->track(['path' => '/admin/joueurs']);
        $this->track(['path' => '/p/abc123']);
        $this->track(['path' => '/wp-login.php']);
        $this->track(['path' => 'https://evil.example/joueurs']);

        $this->assertSame(0, PageView::count());
    }

    public function test_visitor_hash_is_stable_within_a_day_and_rotates_the_next_day(): void
    {
        $this->travelTo(now()->setTime(9, 0));
        $this->track(['path' => '/']);
        $this->track(['path' => '/joueurs']);
        $this->travelTo(now()->addDay());
        $this->track(['path' => '/']);

        $hashes = PageView::orderBy('id')->pluck('visitor_hash');
        $this->assertSame($hashes[0], $hashes[1]);
        $this->assertNotSame($hashes[0], $hashes[2]);
    }

    public function test_referrer_is_kept_as_host_only_and_only_on_entry(): void
    {
        $this->track(['path' => '/', 'entry' => true, 'referrer' => 'https://l.instagram.com/?u=https%3A%2F%2Frenefootball.com']);
        $this->track(['path' => '/joueurs', 'entry' => false, 'referrer' => 'https://www.google.com/search?q=rene']);
        $this->track(['path' => '/contact', 'entry' => true, 'referrer' => 'http://localhost/joueurs']);

        $this->assertSame(['instagram.com', null, null], PageView::orderBy('id')->pluck('referrer_host')->all());
    }

    public function test_purge_command_deletes_views_older_than_thirteen_months(): void
    {
        PageView::create(['path' => '/', 'visitor_hash' => str_repeat('a', 64), 'viewed_at' => now()->subMonths(14)]);
        PageView::create(['path' => '/', 'visitor_hash' => str_repeat('b', 64), 'viewed_at' => now()->subMonths(2)]);

        $this->artisan('analytics:purge')->assertSuccessful();

        $this->assertSame([str_repeat('b', 64)], PageView::pluck('visitor_hash')->all());
    }

    public function test_admin_analytics_requires_an_admin(): void
    {
        $this->getJson('/api/admin/analytics')->assertUnauthorized();
    }

    public function test_admin_analytics_aggregates_the_period(): void
    {
        $player = Player::factory()->create(['slug' => 'saeed-adams', 'name' => 'Saeed Adams']);
        Article::factory()->create(['slug' => 'une-signature', 'title' => 'Une signature']);

        $this->track(['path' => '/', 'entry' => true, 'referrer' => 'https://www.instagram.com/']);
        $this->track(['path' => '/joueurs/saeed-adams']);
        $this->track(['path' => '/joueurs/saeed-adams'], self::BROWSER, '198.51.100.4');
        $this->track(['path' => '/actualites/une-signature', 'entry' => true], self::BROWSER, '198.51.100.4');
        // Outside the 7-day window: counted in neither the totals nor the lists.
        PageView::create(['path' => '/joueurs/saeed-adams', 'resource_type' => 'player', 'slug' => 'saeed-adams', 'visitor_hash' => str_repeat('c', 64), 'viewed_at' => now()->subDays(20)]);

        ContactSubmission::create([
            'reason' => 'club', 'name' => 'Club X', 'email' => 'club@example.com', 'message' => 'Intéressés',
            'payload' => ['player_id' => $player->id], 'status' => 'new', 'consent_at' => now(),
        ]);

        $admin = User::factory()->admin()->create();
        $data = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/analytics?days=7')->assertOk()->json();

        $this->assertSame(7, $data['range']['days']);
        $this->assertSame(4, $data['totals']['views']);
        $this->assertSame(2, $data['totals']['visits']);
        $this->assertCount(7, $data['timeseries']);
        $this->assertSame(4, collect($data['timeseries'])->sum('views'));

        $this->assertSame('Saeed Adams', $data['players'][0]['name']);
        $this->assertSame(2, $data['players'][0]['views']);
        $this->assertSame(1, $data['players'][0]['contacts']);
        $this->assertSame('Une signature', $data['articles'][0]['title']);

        $sources = collect($data['referrers'])->pluck('visits', 'host');
        $this->assertSame(1, $sources['instagram.com']);
        $this->assertSame(1, $sources['']);
    }
}
