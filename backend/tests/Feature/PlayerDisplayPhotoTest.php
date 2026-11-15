<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\User;
use App\Support\PlayerPhoto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The website shows a lightweight WebP of each player photo, kept in step
 * with the original, which stays untouched for the PDF fiches.
 */
class PlayerDisplayPhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('GD without WebP support.');
        }
        Storage::fake('public');
    }

    /** A large, noisy PNG with transparency, like a cut-out portrait. */
    private function portrait(string $path, int $w = 1600, int $h = 2000): string
    {
        $img = imagecreatetruecolor($w, $h);
        imagesavealpha($img, true);
        imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 0, 0, 127));
        mt_srand(3);
        for ($i = 0; $i < 4000; $i++) {
            imagefilledellipse($img, mt_rand(0, $w), mt_rand(0, $h), mt_rand(10, 90), mt_rand(10, 90),
                imagecolorallocatealpha($img, mt_rand(0, 255), mt_rand(0, 255), mt_rand(0, 255), mt_rand(0, 60)));
        }
        ob_start();
        imagepng($img);
        Storage::disk('public')->put($path, (string) ob_get_clean());
        imagedestroy($img);
        return '/storage/'.$path;
    }

    public function test_display_version_is_a_smaller_webp_within_bounds(): void
    {
        $url = $this->portrait('players/big.png');

        $display = PlayerPhoto::displayFor($url);

        $this->assertNotNull($display);
        $this->assertStringEndsWith('.webp', $display);
        $relative = Str::after($display, '/storage/');
        $bytes = Storage::disk('public')->get($relative);
        $this->assertLessThan(strlen(Storage::disk('public')->get('players/big.png')), strlen($bytes));
        [$w, $h] = getimagesizefromstring($bytes);
        $this->assertLessThanOrEqual(PlayerPhoto::MAX_WIDTH, $w);
        $this->assertLessThanOrEqual(PlayerPhoto::MAX_HEIGHT, $h);
    }

    public function test_external_or_missing_photos_get_no_display_version(): void
    {
        $this->assertNull(PlayerPhoto::displayFor('https://picsum.photos/seed/x/600/800'));
        $this->assertNull(PlayerPhoto::displayFor('/storage/players/missing.png'));
        $this->assertNull(PlayerPhoto::displayFor(null));
    }

    public function test_player_keeps_its_display_photo_in_step_with_the_original(): void
    {
        $player = Player::factory()->create(['photo_url' => $this->portrait('players/first.png')]);
        $first = $player->photo_display_url;
        $this->assertNotNull($first);

        $player->update(['photo_url' => $this->portrait('players/second.png', 1200, 1500)]);
        $this->assertNotSame($first, $player->photo_display_url);
        Storage::disk('public')->assertMissing(Str::after($first, '/storage/'));

        $second = $player->photo_display_url;
        $player->delete();
        Storage::disk('public')->assertMissing(Str::after($second, '/storage/'));
    }

    public function test_admin_upload_creates_the_display_photo_and_public_api_exposes_it(): void
    {
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create(['slug' => 'young-talent', 'is_published' => true]);
        $this->portrait('tmp/upload.png');
        $file = UploadedFile::fake()->createWithContent('portrait.png', Storage::disk('public')->get('tmp/upload.png'));

        $this->actingAs($admin, 'sanctum')
            ->post("/api/admin/players/{$player->slug}", ['_method' => 'PUT', 'photo' => $file], ['Accept' => 'application/json'])
            ->assertOk();

        $display = $player->fresh()->photo_display_url;
        $this->assertNotNull($display);
        $this->getJson('/api/players')->assertOk()->assertJsonPath('data.0.photo_display_url', $display);
        $this->getJson('/api/players/young-talent')->assertOk()->assertJsonPath('data.photo_display_url', $display);
    }
}
