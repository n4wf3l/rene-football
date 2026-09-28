<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Regression tests for the security hardening on file uploads.
 * Focused on the SVG-on-partners XSS vector flagged in SECURITY-AUDIT.md.
 */
class PartnerUploadSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_partner_logo_rejects_svg_uploads(): void
    {
        $admin = User::factory()->admin()->create();

        // Craft a fake SVG that would carry <script> in the wild.
        $svg = UploadedFile::fake()->createWithContent(
            'logo.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        );

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/partners', [
                'name'         => 'Evil Corp',
                'is_published' => true,
                'logo'         => $svg,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);
    }

    public function test_partner_logo_accepts_png_uploads(): void
    {
        $admin = User::factory()->admin()->create();

        $png = UploadedFile::fake()->image('logo.png', 200, 100);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/partners', [
                'name'         => 'Good Corp',
                'is_published' => true,
                'logo'         => $png,
            ])
            ->assertStatus(201);
    }
}
