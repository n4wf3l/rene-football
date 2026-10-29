<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Changing a player's photo switches the admin editor to multipart, where
 * every list field travels as a JSON string. All of them must be decoded
 * back, otherwise the save fails ("languages_spoken must be an array").
 */
class PlayerMultipartUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_photo_upload_keeps_list_fields(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->post("/api/admin/players/{$player->slug}", [
                '_method'          => 'PUT',
                'photo'            => UploadedFile::fake()->image('portrait.png', 400, 600),
                'languages_spoken' => json_encode(['Anglais', 'Néerlandais']),
                'mental_strengths' => json_encode(['Confiant']),
                'gallery_photos'   => json_encode([]),
                'career_history'   => json_encode([['years' => '2024 - 2026', 'club' => 'KV Mechelen']]),
                'tags'             => json_encode(['U17']),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $player->refresh();
        $this->assertSame(['Anglais', 'Néerlandais'], $player->languages_spoken);
        $this->assertSame(['Confiant'], $player->mental_strengths);
        $this->assertSame('KV Mechelen', $player->career_history[0]['club']);
        $this->assertStringStartsWith('/storage/players/', (string) $player->photo_url);
    }
}
