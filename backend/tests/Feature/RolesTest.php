<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Back-office roles:
 *   superadmin — everything + members;
 *   admin      — no Scouting, no Data analyse;
 *   scout      — Scouting, no Data analyse;
 *   analyst    — Data analyse, no Scouting.
 * Everyone sees the sport dashboard and the agency side.
 */
class RolesTest extends TestCase
{
    use RefreshDatabase;

    private function as(string $role): static
    {
        return $this->actingAs(User::factory()->role($role)->create(), 'sanctum');
    }

    /** @return array<string, array{string, bool, bool, bool}> role => [role, scouting, analysis, members] */
    public static function roles(): array
    {
        return [
            'superadmin' => ['superadmin', true, true, true],
            'admin'      => ['admin', false, false, false],
            'scout'      => ['scout', true, false, false],
            'analyst'    => ['analyst', false, true, false],
        ];
    }

    #[DataProvider('roles')]
    public function test_each_role_reaches_only_its_parts(string $role, bool $scouting, bool $analysis, bool $members): void
    {
        $this->as($role);

        $this->getJson('/api/admin/scouting/reports')->assertStatus($scouting ? 200 : 403);
        $this->getJson('/api/admin/scouting/inbox')->assertStatus($scouting ? 200 : 403);
        $this->getJson('/api/admin/analysis/metrics')->assertStatus($analysis ? 200 : 403);
        $this->getJson('/api/admin/benchmarks')->assertStatus($analysis ? 200 : 403);
        $this->getJson('/api/admin/members')->assertStatus($members ? 200 : 403);

        // Shared by everyone.
        $this->getJson('/api/admin/scouting/dashboard')->assertOk();
        $this->getJson('/api/admin/players')->assertOk();
        $this->getJson('/api/admin/articles')->assertOk();
    }

    #[DataProvider('roles')]
    public function test_me_tells_the_spa_what_to_show(string $role, bool $scouting, bool $analysis, bool $members): void
    {
        $this->as($role)->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('role', $role)
            ->assertJsonPath('permissions', ['scouting' => $scouting, 'analysis' => $analysis, 'members' => $members]);
    }

    public function test_only_a_superadmin_can_add_edit_or_delete_members(): void
    {
        $target = User::factory()->role('scout')->create();

        foreach (['admin', 'scout', 'analyst'] as $role) {
            $this->as($role);
            $this->postJson('/api/admin/members', ['name' => 'X', 'email' => "x-$role@ex.test", 'role' => 'scout'])->assertForbidden();
            $this->patchJson("/api/admin/members/{$target->id}", ['role' => 'admin'])->assertForbidden();
            $this->deleteJson("/api/admin/members/{$target->id}")->assertForbidden();
        }
        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => 'scout']);
    }

    public function test_superadmin_adds_a_member_who_gets_an_invitation(): void
    {
        Mail::fake();

        $this->as('superadmin')
            ->postJson('/api/admin/members', ['name' => 'Nina Scout', 'email' => 'nina@ex.test', 'role' => 'scout'])
            ->assertCreated()
            ->assertJsonPath('data.role', 'scout')
            ->assertJsonPath('data.invitation_pending', true)
            ->assertJsonPath('invitation_sent', true);

        $this->assertDatabaseHas('users', ['email' => 'nina@ex.test', 'role' => 'scout', 'is_admin' => true]);
        $this->assertDatabaseHas('member_invitation_tokens', ['email' => 'nina@ex.test']);
    }

    public function test_invitation_link_lets_the_member_choose_a_password_and_log_in(): void
    {
        $member = User::factory()->role('analyst')->create(['email' => 'dana@ex.test']);
        $token = \Illuminate\Support\Facades\Password::broker('invitations')->createToken($member);

        // A password-reset link is not an invitation, and vice versa.
        $this->postJson('/api/admin/reset-password', [
            'token' => $token, 'email' => 'dana@ex.test',
            'password' => 'NouveauPass2026', 'password_confirmation' => 'NouveauPass2026',
        ])->assertStatus(422);

        $this->postJson('/api/admin/reset-password', [
            'token' => $token, 'email' => 'dana@ex.test', 'invitation' => true,
            'password' => 'NouveauPass2026', 'password_confirmation' => 'NouveauPass2026',
        ])->assertOk();

        $this->assertDatabaseMissing('member_invitation_tokens', ['email' => 'dana@ex.test']);
        $this->postJson('/api/admin/login', ['email' => 'dana@ex.test', 'password' => 'NouveauPass2026'])
            ->assertOk()
            ->assertJsonPath('user.role', 'analyst');
    }

    public function test_superadmin_changes_a_role_and_deletes_a_member(): void
    {
        $member = User::factory()->role('scout')->create();
        $member->createToken('admin-spa');

        $this->as('superadmin');
        $this->patchJson("/api/admin/members/{$member->id}", ['role' => 'analyst'])
            ->assertOk()->assertJsonPath('data.role', 'analyst');

        $this->deleteJson("/api/admin/members/{$member->id}")->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $member->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_superadmin_cannot_lock_themself_out(): void
    {
        $me = User::factory()->role('superadmin')->create();
        $this->actingAs($me, 'sanctum');

        $this->patchJson("/api/admin/members/{$me->id}", ['role' => 'admin'])->assertStatus(422);
        $this->deleteJson("/api/admin/members/{$me->id}")->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $me->id, 'role' => 'superadmin']);

        // Renaming oneself is fine.
        $this->patchJson("/api/admin/members/{$me->id}", ['name' => 'René'])->assertOk();
    }
}
