<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlayerTest extends TestCase
{
    use RefreshDatabase;

    /* -------------------- Public endpoints -------------------- */

    public function test_public_index_returns_only_published_players(): void
    {
        Player::factory()->create(['name' => 'Alpha', 'is_published' => true]);
        Player::factory()->create(['name' => 'Beta',  'is_published' => true]);
        Player::factory()->unpublished()->create(['name' => 'Gamma']);

        $response = $this->getJson('/api/players')->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertCount(2, $names);
        $this->assertTrue($names->contains('Alpha'));
        $this->assertTrue($names->contains('Beta'));
        $this->assertFalse($names->contains('Gamma'));
    }

    public function test_public_index_sets_cache_header(): void
    {
        Player::factory()->create();

        $this->getJson('/api/players')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=60, public');
    }

    public function test_public_show_returns_player_with_percentiles_and_appearances(): void
    {
        $player = Player::factory()->create(['category' => 'Milieu']);

        $response = $this->getJson("/api/players/{$player->slug}")
            ->assertOk()
            ->assertJsonStructure([
                'data'        => ['id', 'slug', 'name'],
                'percentiles',
                'peers_count',
                'appearances',
                'clips',
            ])
            ->assertJsonPath('data.slug', $player->slug);

        // Solo player in its category → every metric percentile is 50 by convention.
        // (JSON decodes whole-number floats as int, so use assertEquals for loose compare.)
        $this->assertEquals(50, $response->json('percentiles.goals'));
    }

    public function test_public_show_404s_for_unpublished_player(): void
    {
        $player = Player::factory()->unpublished()->create();

        $this->getJson("/api/players/{$player->slug}")->assertStatus(404);
    }

    public function test_public_show_404s_for_unknown_slug(): void
    {
        $this->getJson('/api/players/does-not-exist')->assertStatus(404);
    }

    public function test_percentiles_rank_within_same_category(): void
    {
        $best   = Player::factory()->create(['category' => 'Attaquant', 'goals' => 30]);
        $middle = Player::factory()->create(['category' => 'Attaquant', 'goals' => 15]);
        $worst  = Player::factory()->create(['category' => 'Attaquant', 'goals' => 3]);
        // Player in a different category — must not influence the ranking.
        Player::factory()->create(['category' => 'Milieu', 'goals' => 100]);

        $bestResp   = $this->getJson("/api/players/{$best->slug}")->json();
        $worstResp  = $this->getJson("/api/players/{$worst->slug}")->json();
        $middleResp = $this->getJson("/api/players/{$middle->slug}")->json();

        $this->assertSame(3, $bestResp['peers_count']);
        $this->assertEquals(100, $bestResp['percentiles']['goals'], 'top scorer should be 100th percentile');
        $this->assertEquals(0,   $worstResp['percentiles']['goals'], 'bottom scorer should be 0th percentile');
        $this->assertEquals(50,  $middleResp['percentiles']['goals'], 'middle scorer should be 50th percentile');
    }

    /* -------------------- Admin endpoints -------------------- */

    public function test_admin_index_requires_authentication(): void
    {
        $this->getJson('/api/admin/players')->assertStatus(401);
    }

    public function test_admin_index_returns_all_players_including_unpublished(): void
    {
        Player::factory()->count(2)->create();
        Player::factory()->unpublished()->create();

        $admin = User::factory()->admin()->create();
        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/players')
            ->assertOk();

        $this->assertCount(3, $response->json('data'));
    }

    public function test_admin_can_create_a_player(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/players', [
                'name'     => 'Nouveau Joueur',
                'age'      => 22,
                'position' => 'Milieu offensif',
                'category' => 'Milieu',
                'club'     => 'FC Test',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'Nouveau Joueur')
            ->assertJsonPath('data.slug', 'nouveau-joueur');

        $this->assertDatabaseHas('players', [
            'name' => 'Nouveau Joueur',
            'slug' => 'nouveau-joueur',
        ]);
    }

    public function test_admin_create_generates_unique_slugs_on_collision(): void
    {
        $admin = User::factory()->admin()->create();
        Player::factory()->create(['name' => 'Alex Martin', 'slug' => 'alex-martin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/players', [
                'name'     => 'Alex Martin',
                'age'      => 22,
                'position' => 'Attaquant',
                'category' => 'Attaquant',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.slug', 'alex-martin-2');
    }

    public function test_admin_create_validates_required_fields(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/players', ['name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'age', 'position', 'category']);
    }

    public function test_admin_create_rejects_invalid_category(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/players', [
                'name'     => 'Bogus',
                'age'      => 22,
                'position' => 'Attaquant',
                'category' => 'NonExistantCategory',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    public function test_admin_can_update_a_player(): void
    {
        $admin  = User::factory()->admin()->create();
        $player = Player::factory()->create(['goals' => 5]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/players/{$player->slug}", ['goals' => 12])
            ->assertOk()
            ->assertJsonPath('data.goals', 12);

        $this->assertSame(12, $player->fresh()->goals);
    }

    public function test_admin_update_regenerates_slug_when_name_changes(): void
    {
        $admin  = User::factory()->admin()->create();
        $player = Player::factory()->create(['name' => 'Old Name', 'slug' => 'old-name']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/players/{$player->slug}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('data.slug', 'new-name');
    }

    public function test_admin_can_publish_and_unpublish(): void
    {
        $admin  = User::factory()->admin()->create();
        $player = Player::factory()->unpublished()->create();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/players/{$player->slug}", ['is_published' => true])
            ->assertOk()
            ->assertJsonPath('data.is_published', true);

        $this->assertTrue($player->fresh()->is_published);
    }

    public function test_admin_can_delete_a_player(): void
    {
        $admin  = User::factory()->admin()->create();
        $player = Player::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/players/{$player->slug}")
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseMissing('players', ['id' => $player->id]);
    }

    public function test_non_admin_cannot_delete_a_player(): void
    {
        $user   = User::factory()->create(['is_admin' => false]);
        $player = Player::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/admin/players/{$player->slug}")
            ->assertStatus(403);

        $this->assertDatabaseHas('players', ['id' => $player->id]);
    }
}
