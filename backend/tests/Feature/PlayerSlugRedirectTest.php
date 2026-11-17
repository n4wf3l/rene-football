<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Renaming a player changes his slug: the former URL must keep working
 * (301 on the public page, current profile from the API) instead of 404.
 */
class PlayerSlugRedirectTest extends TestCase
{
    use RefreshDatabase;

    private function rename(Player $player, string $name): Player
    {
        $this->actingAs(User::factory()->admin()->create(), 'sanctum')
            ->putJson("/api/admin/players/{$player->slug}", [
                'name'     => $name,
                'age'      => $player->age,
                'position' => $player->position,
                'category' => $player->category,
            ])
            ->assertOk();

        return $player->fresh();
    }

    public function test_old_profile_url_redirects_permanently_to_the_new_one(): void
    {
        $player = Player::factory()->create(['name' => 'Abakar Abba', 'slug' => 'abakar-abba']);
        $player = $this->rename($player, 'Abakar Mahamat-Abba');

        $this->assertSame('abakar-mahamat-abba', $player->slug);
        $this->get('/joueurs/abakar-abba')->assertStatus(301)->assertRedirect('/joueurs/abakar-mahamat-abba');
        $this->get('/joueurs/abakar-mahamat-abba')->assertOk();
    }

    public function test_api_resolves_a_former_slug_to_the_current_profile(): void
    {
        $player = Player::factory()->create(['name' => 'Abakar Abba', 'slug' => 'abakar-abba']);
        $player = $this->rename($player, 'Abakar Mahamat-Abba');

        $this->getJson('/api/players/abakar-abba')
            ->assertOk()
            ->assertJsonPath('data.slug', 'abakar-mahamat-abba');
    }

    public function test_every_former_name_leads_to_the_latest(): void
    {
        $player = Player::factory()->create(['name' => 'Karim Toure', 'slug' => 'karim-toure']);
        $player = $this->rename($player, 'Karim Touré Diallo');
        $player = $this->rename($player, 'Karim Diallo');

        $this->get('/joueurs/karim-toure')->assertStatus(301)->assertRedirect('/joueurs/karim-diallo');
        $this->get('/joueurs/karim-toure-diallo')->assertStatus(301)->assertRedirect('/joueurs/karim-diallo');
    }

    public function test_going_back_to_a_former_name_makes_its_url_live_again(): void
    {
        $player = Player::factory()->create(['name' => 'Yanis Lefevre', 'slug' => 'yanis-lefevre']);
        $player = $this->rename($player, 'Yanis Lefèvre Martin');
        $player = $this->rename($player, 'Yanis Lefevre');

        $this->assertSame('yanis-lefevre', $player->slug);
        $this->assertDatabaseMissing('player_slug_redirects', ['slug' => 'yanis-lefevre']);
        $this->get('/joueurs/yanis-lefevre')->assertOk();
    }

    public function test_former_slug_of_an_unpublished_player_is_not_found(): void
    {
        $player = Player::factory()->create(['name' => 'Theo Vasseur', 'slug' => 'theo-vasseur']);
        $player = $this->rename($player, 'Théo Vasseur Junior');
        $player->update(['is_published' => false]);

        $this->get('/joueurs/theo-vasseur')->assertNotFound();
        $this->getJson('/api/players/theo-vasseur')->assertNotFound();
    }

    public function test_word_order_fallback_still_works(): void
    {
        Player::factory()->create(['slug' => 'hanibal-tesfegabir-solomon']);

        $this->get('/joueurs/tesfegabir-solomon-hanibal')->assertStatus(301)
            ->assertRedirect('/joueurs/hanibal-tesfegabir-solomon');
    }
}
