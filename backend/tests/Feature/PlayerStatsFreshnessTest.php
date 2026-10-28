<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Public pages hide match counts older than a month, so a manual stats edit
 * in the admin must date itself; editing anything else must not.
 */
class PlayerStatsFreshnessTest extends TestCase
{
    use RefreshDatabase;

    public function test_editing_stats_dates_the_update(): void
    {
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create(['matches_played' => 3, 'stats_updated_at' => null, 'stats_source' => null]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/players/{$player->slug}", ['matches_played' => 4])
            ->assertOk();

        $player->refresh();
        $this->assertNotNull($player->stats_updated_at);
        $this->assertTrue($player->stats_updated_at->isToday());
        $this->assertSame('manual', $player->stats_source);
    }

    public function test_editing_other_fields_keeps_the_stats_date(): void
    {
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create(['matches_played' => 3, 'stats_updated_at' => now()->subMonths(3)]);
        $before = $player->stats_updated_at->toDateTimeString();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/players/{$player->slug}", ['bio' => 'Nouvelle bio.', 'matches_played' => 3])
            ->assertOk();

        $this->assertSame($before, $player->fresh()->stats_updated_at->toDateTimeString());
    }
}
