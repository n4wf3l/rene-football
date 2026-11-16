<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Every contact-form submission is also posted by the Telegram bot, without
 * ever breaking the form when Telegram is down or not configured.
 */
class ContactTelegramTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('local');
        RateLimiter::clear('ip:127.0.0.1');
        config([
            'services.telegram.bot_token' => 'test-token',
            'services.telegram.chat_id'   => '-1001234',
            'app.url'                     => 'https://renefootball.com',
        ]);
    }

    private function submission(array $overrides = []): array
    {
        return array_merge([
            'reason'  => 'joueur',
            'name'    => 'Alex <Martin>',
            'email'   => 'alex@example.com',
            'phone'   => '+352 000 000',
            'message' => 'Bonjour, je souhaite rejoindre l\'agence & en savoir plus.',
            'consent' => '1',
            'payload' => [
                'submitter_type' => 'guardian',
                'guardian_relation' => 'parent',
                'minor_name'     => 'Noah Martin',
                'guardian_consent' => '1',
                'intent'         => 'join',
                'player_name'    => 'Noah Martin',
                'position'       => 'Milieu offensif',
                'level'          => 'amateur',
            ],
            'guardian_consent' => '1',
        ], $overrides);
    }

    public function test_a_submission_is_posted_on_telegram(): void
    {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);

        $this->post('/api/contact', $this->submission() + ['cv' => UploadedFile::fake()->create('cv.pdf', 50, 'application/pdf')],
            ['Accept' => 'application/json'])->assertCreated();

        Http::assertSentCount(1);
        Http::assertSent(function (Request $request) {
            $text = $request['text'];
            return str_contains($request->url(), '/bottest-token/sendMessage')
                && $request['chat_id'] === '-1001234'
                && str_contains($text, 'Nouvelle demande de contact · Joueur')
                && str_contains($text, 'Alex &lt;Martin&gt;')            // escaped
                && str_contains($text, 'alex@example.com')
                && str_contains($text, 'Rempli par : un parent / tuteur')
                && str_contains($text, 'Joueur mineur : Noah Martin')
                && str_contains($text, 'Demande : rejoindre l&#039;agence')
                && str_contains($text, 'Niveau : amateur')
                && str_contains($text, 'je souhaite rejoindre l&#039;agence &amp; en savoir plus')
                && str_contains($text, 'CV joint')
                && str_contains($text, 'https://renefootball.com/admin/contact');
        });
    }

    public function test_club_submission_uses_its_own_labels(): void
    {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);

        $this->postJson('/api/contact', [
            'reason' => 'club', 'name' => 'Paul Coach', 'email' => 'paul@club.test',
            'message' => 'Nous cherchons un latéral gauche U19.', 'consent' => '1',
            'payload' => ['club_name' => 'F91 Dudelange', 'role' => 'sporting_director', 'interest' => 'profile', 'needed_position' => 'Latéral gauche'],
        ])->assertCreated();

        Http::assertSent(fn (Request $r) => str_contains($r['text'], 'Nouvelle demande de contact · Club')
            && str_contains($r['text'], 'Club : F91 Dudelange')
            && str_contains($r['text'], 'Fonction : directeur sportif')
            && str_contains($r['text'], 'Poste recherché : Latéral gauche'));
    }

    public function test_the_form_still_works_when_telegram_fails(): void
    {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => false, 'description' => 'Bad Request'], 400)]);

        $this->postJson('/api/contact', $this->submission())->assertCreated();
        $this->assertDatabaseCount('contact_submissions', 1);
    }

    public function test_nothing_is_sent_without_telegram_configuration(): void
    {
        config(['services.telegram.chat_id' => null]);
        Http::fake();

        $this->postJson('/api/contact', $this->submission())->assertCreated();

        Http::assertNothingSent();
    }
}
