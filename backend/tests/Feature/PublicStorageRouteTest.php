<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * /storage/* is served by Laravel in production (no symlink on Hostinger
 * shared): media folders only, no traversal, no other files of the disk.
 */
class PublicStorageRouteTest extends TestCase
{
    public function test_serves_a_player_photo(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('players/photo.jpg', 'jpeg-bytes');

        $this->get('/storage/players/photo.jpg')
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=2592000, public');
    }

    public function test_missing_file_is_404(): void
    {
        Storage::fake('public');
        $this->get('/storage/players/absent.jpg')->assertNotFound();
    }

    public function test_files_outside_media_folders_are_not_exposed(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('cvs/candidat.pdf', '%PDF');
        Storage::disk('public')->put('players/photo.jpg', 'x');

        $this->get('/storage/cvs/candidat.pdf')->assertNotFound();
        $this->get('/storage/players/../cvs/candidat.pdf')->assertNotFound();
    }
}
