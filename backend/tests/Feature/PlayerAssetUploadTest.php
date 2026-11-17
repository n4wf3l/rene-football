<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Images uploaded from the player editor (logos, portrait, gallery). */
class PlayerAssetUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_uploads_an_image_and_gets_its_url(): void
    {
        Storage::fake('public');
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');

        $res = $this->post('/api/admin/players/assets', [
            'image' => UploadedFile::fake()->image('logo.png', 200, 200),
            'kind'  => 'logo',
        ], ['Accept' => 'application/json'])->assertCreated();

        $url = $res->json('url');
        $this->assertStringStartsWith('/storage/players/assets/logo-', $url);
        Storage::disk('public')->assertExists(substr($url, strlen('/storage/')));
    }

    public function test_non_images_are_refused(): void
    {
        Storage::fake('public');
        $this->actingAs(User::factory()->admin()->create(), 'sanctum');

        $this->post('/api/admin/players/assets', [
            'image' => UploadedFile::fake()->create('evil.svg', 4, 'image/svg+xml'),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    public function test_requires_an_admin(): void
    {
        $this->post('/api/admin/players/assets', [], ['Accept' => 'application/json'])->assertUnauthorized();
    }
}
