<?php

namespace Tests\Feature;

use App\Models\ContactSubmission;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContactSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        // Both disks are faked because CVs now land on `local` (private disk,
        // served via signed URL by ContactController::downloadCv) but a
        // legacy fallback on `public` is kept — the tests below exercise the
        // current `local` path.
        Storage::fake('local');
        Storage::fake('public');
        // The route uses throttle:5,1 (5 requests / minute / IP). Reset it
        // between tests so the last suite run doesn't leak rate limits.
        RateLimiter::clear('ip:127.0.0.1');
    }

    private function playerPayload(array $overrides = []): array
    {
        return array_merge([
            'reason'  => 'joueur',
            'name'    => 'Alex Martin',
            'email'   => 'alex@example.com',
            'phone'   => '+352 000 000',
            'message' => 'Bonjour, je souhaite rejoindre l\'agence.',
            'consent' => '1',
            'payload' => [
                // Default submitter_type = adult player; the RGPD gate added
                // in 2026-09-30 makes this required for the joueur parcours.
                'submitter_type' => 'self',
                'intent'         => 'join',
                'player_name'    => 'Alex Martin',
                'position'       => 'Milieu offensif',
                'level'          => 'amateur',
            ],
        ], $overrides);
    }

    public function test_valid_joueur_submission_is_persisted(): void
    {
        $response = $this->postJson('/api/contact', $this->playerPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'created_at']]);

        $this->assertDatabaseHas('contact_submissions', [
            'reason' => 'joueur',
            'name'   => 'Alex Martin',
            'email'  => 'alex@example.com',
            'status' => 'new',
        ]);

        $submission = ContactSubmission::first();
        $this->assertNotNull($submission->consent_at);
        $this->assertSame('127.0.0.1', $submission->ip);
        $this->assertSame('join', $submission->payload['intent'] ?? null);
        $this->assertSame('joueur', $submission->payload['_reason'] ?? null);
    }

    public function test_email_is_normalised_to_lowercase(): void
    {
        $this->postJson('/api/contact', $this->playerPayload([
            'email' => 'MiXeD@Example.COM',
        ]))->assertStatus(201);

        $this->assertDatabaseHas('contact_submissions', ['email' => 'mixed@example.com']);
    }

    public function test_missing_consent_is_rejected(): void
    {
        $this->postJson('/api/contact', $this->playerPayload(['consent' => false]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['consent']);
    }

    public function test_invalid_email_is_rejected(): void
    {
        $this->postJson('/api/contact', $this->playerPayload(['email' => 'not-an-email']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_message_too_short_is_rejected(): void
    {
        $this->postJson('/api/contact', $this->playerPayload(['message' => 'hi']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['message']);
    }

    public function test_joueur_intent_is_required_and_enumerated(): void
    {
        $this->postJson('/api/contact', $this->playerPayload([
            'payload' => ['submitter_type' => 'self', 'player_name' => 'Alex'],
        ]))->assertStatus(422)->assertJsonValidationErrors(['payload.intent']);

        $this->postJson('/api/contact', $this->playerPayload([
            'payload' => ['submitter_type' => 'self', 'intent' => 'bogus', 'player_name' => 'Alex'],
        ]))->assertStatus(422)->assertJsonValidationErrors(['payload.intent']);
    }

    public function test_joueur_submitter_type_is_required(): void
    {
        $this->postJson('/api/contact', $this->playerPayload([
            'payload' => [
                'intent' => 'join',
                'player_name' => 'Alex Martin',
            ], // deliberately missing submitter_type
        ]))->assertStatus(422)->assertJsonValidationErrors(['payload.submitter_type']);
    }

    public function test_guardian_submission_requires_relation_minor_name_and_consent(): void
    {
        // Guardian without relation / minor_name / guardian_consent → rejected
        // with all 3 field errors reported for the wizard.
        $this->postJson('/api/contact', $this->playerPayload([
            'payload' => [
                'submitter_type' => 'guardian',
                'intent'         => 'join',
                'player_name'    => 'Jeune Prometteur',
            ],
            // guardian_consent omitted on purpose
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'payload.guardian_relation',
                'payload.minor_name',
                'guardian_consent',
            ]);

        // Happy path : guardian with the full set.
        $this->postJson('/api/contact', $this->playerPayload([
            'payload' => [
                'submitter_type'    => 'guardian',
                'guardian_relation' => 'parent',
                'minor_name'        => 'Jeune Prometteur',
                'intent'            => 'join',
                'player_name'       => 'Jeune Prometteur',
            ],
            'guardian_consent' => '1',
        ]))->assertStatus(201);
    }

    public function test_club_submission_validates_role_and_interest(): void
    {
        $this->postJson('/api/contact', [
            'reason'  => 'club',
            'name'    => 'John Coach',
            'email'   => 'coach@fc.example',
            'message' => 'Nous nous intéressons à un joueur.',
            'consent' => '1',
            'payload' => [
                'club_name' => 'FC Example',
                'role'      => 'coach',
                'interest'  => 'player',
            ],
        ])->assertStatus(201);
    }

    public function test_media_submission_validates_purpose(): void
    {
        $this->postJson('/api/contact', [
            'reason'  => 'medias',
            'name'    => 'Reporter One',
            'email'   => 'reporter@media.example',
            'message' => 'Interview possible pour un joueur ?',
            'consent' => '1',
            'payload' => [
                'media_name' => 'Media Example',
                'role'       => 'journalist',
                'purpose'    => 'interview_player',
            ],
        ])->assertStatus(201);
    }

    public function test_autre_submission_requires_subject(): void
    {
        $this->postJson('/api/contact', [
            'reason'  => 'autre',
            'name'    => 'Anonymous',
            'email'   => 'anon@example.com',
            'message' => 'Question générale sur le site.',
            'consent' => '1',
            'payload' => [], // missing subject
        ])->assertStatus(422)->assertJsonValidationErrors(['payload.subject']);
    }

    public function test_club_player_id_must_reference_existing_player(): void
    {
        $this->postJson('/api/contact', [
            'reason'  => 'club',
            'name'    => 'John Coach',
            'email'   => 'coach@fc.example',
            'message' => 'Intérêt pour un joueur inconnu.',
            'consent' => '1',
            'payload' => [
                'club_name' => 'FC Example',
                'role'      => 'coach',
                'interest'  => 'player',
                'player_id' => 99999,
            ],
        ])->assertStatus(422)->assertJsonValidationErrors(['payload.player_id']);
    }

    public function test_club_player_id_accepts_a_real_player(): void
    {
        $player = Player::factory()->create();

        $this->postJson('/api/contact', [
            'reason'  => 'club',
            'name'    => 'John Coach',
            'email'   => 'coach@fc.example',
            'message' => 'Intérêt pour un joueur du roster.',
            'consent' => '1',
            'payload' => [
                'club_name' => 'FC Example',
                'role'      => 'coach',
                'interest'  => 'player',
                'player_id' => $player->id,
            ],
        ])->assertStatus(201);

        $submission = ContactSubmission::first();
        $this->assertSame($player->id, $submission->payload['player_id']);
    }

    public function test_cv_upload_is_stored_on_private_disk(): void
    {
        // Since the signed-URL hardening (2026-09-28), CVs land on the
        // private `local` disk — accessible only through the admin signed
        // URL endpoint. No `/storage/cvs/...` path is ever exposed to the
        // client.
        $cv = UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf');

        $this->postJson('/api/contact', array_merge($this->playerPayload(), ['cv' => $cv]))
            ->assertStatus(201);

        $submission = ContactSubmission::first();
        $this->assertNotNull($submission->cv_path);
        Storage::disk('local')->assertExists($submission->cv_path);
        Storage::disk('public')->assertMissing($submission->cv_path);
    }

    public function test_cv_upload_rejects_disallowed_extension(): void
    {
        $bad = UploadedFile::fake()->create('malware.exe', 10, 'application/x-msdownload');

        $this->postJson('/api/contact', array_merge($this->playerPayload(), ['cv' => $bad]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cv']);
    }

    public function test_rate_limit_kicks_in_after_five_submissions_per_minute(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/contact', $this->playerPayload([
                'email' => "spammer{$i}@example.com",
            ]))->assertStatus(201);
        }

        $this->postJson('/api/contact', $this->playerPayload([
            'email' => 'spammer6@example.com',
        ]))->assertStatus(429);
    }
}
