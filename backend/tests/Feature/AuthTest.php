<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_succeeds_with_valid_credentials(): void
    {
        $user = User::factory()->admin()->create([
            'email' => 'admin@rene-football.test',
            'password' => bcrypt('secret1234'),
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@rene-football.test',
            'password' => 'secret1234',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'is_admin']])
            ->assertJsonPath('user.email', 'admin@rene-football.test')
            ->assertJsonPath('user.is_admin', true);

        $this->assertNotEmpty($response->json('token'));
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'admin-spa',
        ]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@rene-football.test',
            'password' => bcrypt('correct'),
        ]);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@rene-football.test',
            'password' => 'wrong',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'nobody@example.com',
            'password' => 'whatever',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_rejects_non_admin_users(): void
    {
        User::factory()->create([
            'email' => 'user@rene-football.test',
            'password' => bcrypt('secret1234'),
            'is_admin' => false,
        ]);

        $this->postJson('/api/admin/login', [
            'email' => 'user@rene-football.test',
            'password' => 'secret1234',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_validates_required_fields(): void
    {
        $this->postJson('/api/admin/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/admin/me')->assertStatus(401);
    }

    public function test_me_returns_user_payload_when_authenticated(): void
    {
        $user = User::factory()->admin()->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/me')
            ->assertOk()
            ->assertJson([
                'id' => $user->id,
                'email' => $user->email,
                'is_admin' => true,
            ]);
    }

    public function test_logout_deletes_the_current_token(): void
    {
        $user = User::factory()->admin()->create();
        $token = $user->createToken('admin-spa', ['admin'])->plainTextToken;

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'admin-spa',
        ]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/logout')
            ->assertOk()
            ->assertJson(['ok' => true]);

        // Token row is gone — subsequent requests from any client would 401.
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'name' => 'admin-spa',
        ]);
    }

    public function test_admin_middleware_blocks_non_admin_authenticated_users(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/me')
            ->assertStatus(403);
    }

    /* ---- Security hardening (added post-audit) ---- */

    public function test_login_rate_limits_ip_after_10_attempts_per_minute(): void
    {
        \Illuminate\Support\Facades\RateLimiter::clear('ip:127.0.0.1');

        // 10 legitimate 422s allowed…
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/admin/login', [
                'email' => "attacker{$i}@example.com",
                'password' => 'wrong',
            ])->assertStatus(422);
        }

        // 11th within the same minute → 429.
        $this->postJson('/api/admin/login', [
            'email' => 'attacker11@example.com',
            'password' => 'wrong',
        ])->assertStatus(429);
    }

    public function test_login_rate_limits_per_email_after_5_attempts(): void
    {
        \Illuminate\Support\Facades\RateLimiter::clear('email:target@example.com');
        \Illuminate\Support\Facades\RateLimiter::clear('ip:127.0.0.1');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/admin/login', [
                'email' => 'target@example.com',
                'password' => "wrong{$i}",
            ])->assertStatus(422);
        }

        $this->postJson('/api/admin/login', [
            'email' => 'target@example.com',
            'password' => 'wrong-again',
        ])->assertStatus(429);
    }
}
