<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\PasswordResetController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * "Mot de passe oublié": the request never reveals whether an account
 * exists, the link only works once, and a reset closes open sessions.
 */
class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_answers_the_same_for_unknown_and_known_emails(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'rene@renefootball.test']);

        $known = $this->postJson('/api/admin/forgot-password', ['email' => $admin->email])->assertOk()->json('message');
        $unknown = $this->postJson('/api/admin/forgot-password', ['email' => 'nobody@renefootball.test'])->assertOk()->json('message');

        $this->assertSame(PasswordResetController::SENT_MESSAGE, $known);
        $this->assertSame($known, $unknown);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $admin->email]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'nobody@renefootball.test']);
    }

    public function test_non_admin_accounts_get_no_reset_link(): void
    {
        $user = User::factory()->create(['email' => 'visitor@renefootball.test']);

        $this->postJson('/api/admin/forgot-password', ['email' => $user->email])->assertOk();

        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
    }

    public function test_reset_sets_the_new_password_and_revokes_sessions(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'rene@renefootball.test']);
        $admin->createToken('admin-spa', ['admin']);
        $token = Password::broker()->createToken($admin);

        $this->postJson('/api/admin/reset-password', [
            'email' => $admin->email,
            'token' => $token,
            'password' => 'Nouveau-mdp-2026',
            'password_confirmation' => 'Nouveau-mdp-2026',
        ])->assertOk();

        $admin->refresh();
        $this->assertTrue(Hash::check('Nouveau-mdp-2026', $admin->password));
        $this->assertSame(0, $admin->tokens()->count());

        $this->postJson('/api/admin/login', ['email' => $admin->email, 'password' => 'Nouveau-mdp-2026'])
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_reset_link_works_only_once(): void
    {
        $admin = User::factory()->admin()->create();
        $token = Password::broker()->createToken($admin);
        $payload = ['email' => $admin->email, 'token' => $token, 'password' => 'Premier-essai-1', 'password_confirmation' => 'Premier-essai-1'];

        $this->postJson('/api/admin/reset-password', $payload)->assertOk();
        $this->postJson('/api/admin/reset-password', $payload)->assertStatus(422)->assertJsonValidationErrors('token');
    }

    public function test_reset_rejects_weak_or_mismatched_passwords(): void
    {
        $admin = User::factory()->admin()->create();
        $token = Password::broker()->createToken($admin);

        $this->postJson('/api/admin/reset-password', [
            'email' => $admin->email, 'token' => $token, 'password' => 'court1', 'password_confirmation' => 'court1',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/admin/reset-password', [
            'email' => $admin->email, 'token' => $token, 'password' => 'Assez-long-2026', 'password_confirmation' => 'Autre-chose-2026',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_bad_token_is_refused(): void
    {
        $admin = User::factory()->admin()->create();

        $this->postJson('/api/admin/reset-password', [
            'email' => $admin->email, 'token' => 'faux-jeton', 'password' => 'Assez-long-2026', 'password_confirmation' => 'Assez-long-2026',
        ])->assertStatus(422)->assertJsonValidationErrors('token');
    }
}
