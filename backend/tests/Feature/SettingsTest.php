<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_settings_returns_empty_social_links_on_fresh_install(): void
    {
        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJson(['data' => ['social_links' => []]]);

        // Singleton is lazy-created on first access.
        $this->assertDatabaseHas('app_settings', ['id' => 1]);
    }

    public function test_public_settings_only_exposes_non_empty_social_links(): void
    {
        AppSetting::singleton()->update([
            'instagram_url' => 'https://instagram.com/renefootball',
            'facebook_url'  => null,
            'linkedin_url'  => '',
            'youtube_url'   => 'https://youtube.com/@renefootball',
        ]);

        $links = $this->getJson('/api/settings')->assertOk()->json('data.social_links');

        $this->assertSame([
            'instagram' => 'https://instagram.com/renefootball',
            'youtube'   => 'https://youtube.com/@renefootball',
        ], $links);
    }

    public function test_admin_settings_read_requires_admin(): void
    {
        $this->getJson('/api/admin/settings')->assertStatus(401);

        $user = User::factory()->create(['is_admin' => false]);
        $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertStatus(403);
    }

    public function test_admin_can_read_all_social_url_fields(): void
    {
        $admin = User::factory()->admin()->create();
        AppSetting::singleton()->update(['instagram_url' => 'https://instagram.com/x']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'instagram_url', 'facebook_url', 'linkedin_url',
                'youtube_url', 'tiktok_url', 'x_url',
            ]])
            ->assertJsonPath('data.instagram_url', 'https://instagram.com/x');
    }

    public function test_admin_can_update_social_urls(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', [
                'instagram_url' => 'https://instagram.com/renefootball',
                'linkedin_url'  => 'https://linkedin.com/company/rene-football',
            ])
            ->assertOk()
            ->assertJsonPath('data.instagram_url', 'https://instagram.com/renefootball');

        $this->assertSame(
            'https://instagram.com/renefootball',
            AppSetting::singleton()->instagram_url
        );
    }

    public function test_empty_strings_are_stored_as_null(): void
    {
        $admin = User::factory()->admin()->create();
        AppSetting::singleton()->update(['instagram_url' => 'https://old.url']);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['instagram_url' => ''])
            ->assertOk();

        $this->assertNull(AppSetting::singleton()->instagram_url);
    }

    public function test_invalid_url_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', ['instagram_url' => 'not-a-url'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['instagram_url']);
    }
}
