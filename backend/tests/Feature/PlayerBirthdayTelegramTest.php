<?php

namespace Tests\Feature;

use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * players:birthdays posts one Telegram message per published player born
 * on that day, once per year, and stays silent without configuration.
 */
class PlayerBirthdayTelegramTest extends TestCase
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
    }

    private function telegramAccepts(): void
    {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);
    }

    public function test_sends_a_message_for_a_birthday_today(): void
    {
        $this->telegramAccepts();
        Player::factory()->create([
            'name' => 'Hanibal Tesfegabir Solomon', 'slug' => 'hanibal-tesfegabir-solomon',
            'date_of_birth' => '2008-03-14', 'position' => 'Attaquant', 'club' => 'F91 Dudelange',
        ]);
        Player::factory()->create(['date_of_birth' => '2008-03-15']);

        $this->artisan('players:birthdays', ['--date' => '2026-03-14'])->assertSuccessful();

        Http::assertSentCount(1);
        Http::assertSent(function (Request $request) {
            return str_contains($request->url(), '/bottest-token/sendMessage')
                && $request['chat_id'] === '-1001234'
                && $request['parse_mode'] === 'HTML'
                && str_contains($request['text'], 'Joyeux anniversaire Hanibal Tesfegabir Solomon')
                && str_contains($request['text'], 'ses 18 ans')
                && str_contains($request['text'], 'Attaquant · F91 Dudelange')
                && str_contains($request['text'], 'https://renefootball.com/joueurs/hanibal-tesfegabir-solomon');
        });
    }

    public function test_a_player_is_announced_only_once_a_year(): void
    {
        $this->telegramAccepts();
        $player = Player::factory()->create(['date_of_birth' => '2009-11-06']);

        $this->artisan('players:birthdays', ['--date' => '2026-11-06'])->assertSuccessful();
        $this->artisan('players:birthdays', ['--date' => '2026-11-06'])->assertSuccessful();
        Http::assertSentCount(1);
        $this->assertSame(2026, (int) $player->fresh()->birthday_notified_year);

        // Next year, again.
        $this->artisan('players:birthdays', ['--date' => '2027-11-06'])->assertSuccessful();
        Http::assertSentCount(2);
    }

    public function test_unpublished_players_are_left_out(): void
    {
        $this->telegramAccepts();
        Player::factory()->unpublished()->create(['date_of_birth' => '2007-05-01']);

        $this->artisan('players:birthdays', ['--date' => '2026-05-01'])->assertSuccessful();

        Http::assertNothingSent();
    }

    public function test_29_february_is_celebrated_on_28_february_in_other_years(): void
    {
        $this->telegramAccepts();
        Player::factory()->create(['date_of_birth' => '2008-02-29']);

        $this->artisan('players:birthdays', ['--date' => '2027-02-28'])->assertSuccessful();
        Http::assertSentCount(1);

        $this->artisan('players:birthdays', ['--date' => '2028-02-28'])->assertSuccessful();
        Http::assertSentCount(1); // leap year: waits for the 29th
        $this->artisan('players:birthdays', ['--date' => '2028-02-29'])->assertSuccessful();
        Http::assertSentCount(2);
    }

    public function test_nothing_is_sent_or_marked_without_telegram_configuration(): void
    {
        $this->telegramAccepts();
        config(['services.telegram.bot_token' => null]);
        $player = Player::factory()->create(['date_of_birth' => '2008-03-14']);

        $this->artisan('players:birthdays', ['--date' => '2026-03-14'])->assertSuccessful();

        Http::assertNothingSent();
        $this->assertNull($player->fresh()->birthday_notified_year);
    }

    public function test_a_refused_message_is_retried_on_the_next_run(): void
    {
        Http::fake(['api.telegram.org/*' => Http::sequence()
            ->push(['ok' => false, 'description' => 'Bad Request: chat not found'], 400)
            ->push(['ok' => true, 'result' => []])]);
        $player = Player::factory()->create(['date_of_birth' => '2008-03-14']);

        $this->artisan('players:birthdays', ['--date' => '2026-03-14'])->assertSuccessful();
        $this->assertNull($player->fresh()->birthday_notified_year);

        $this->artisan('players:birthdays', ['--date' => '2026-03-14'])->assertSuccessful();
        $this->assertSame(2026, (int) $player->fresh()->birthday_notified_year);
    }

    public function test_http_cron_needs_the_maintenance_secret(): void
    {
        $this->telegramAccepts();
        config(['maintenance.secret' => 'maint-secret']);
        Player::factory()->create(['date_of_birth' => now('Europe/Luxembourg')->subYears(19)->toDateString()]);

        $this->postJson('/api/_maintenance/cron/birthdays')->assertForbidden();
        Http::assertNothingSent();

        $this->postJson('/api/_maintenance/cron/birthdays', [], ['X-Maint-Secret' => 'maint-secret'])
            ->assertOk()->assertJsonPath('ok', true);
        Http::assertSentCount(1);
    }
}
