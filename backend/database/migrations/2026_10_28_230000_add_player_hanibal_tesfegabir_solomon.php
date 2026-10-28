<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration: publishes Hanibal Tesfegabir Solomon (F91 Dudelange, 2008) in production,
 * where players can only be created through the admin. Idempotent:
 *  - player missing         → created, published, with his photo;
 *  - player present, no photo → only the photo is attached;
 *  - player present with photo → nothing is touched.
 * The photo ships in database/data/players and is copied to the public disk.
 * Skipped under tests so fixtures and player counts stay deterministic.
 */
return new class extends Migration
{
    private const SLUG  = 'hanibal-tesfegabir-solomon';
    private const PHOTO = 'hanibal-tesfegabir-solomon.jpg';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if ($player && $player->photo_url) return;

        $photoUrl = $this->storePhoto();

        if ($player) {
            DB::table('players')->where('id', $player->id)->update(['photo_url' => $photoUrl, 'updated_at' => now()]);
            return;
        }

        $dob = Carbon::parse('2008-01-01');
        DB::table('players')->insert([
            'slug'           => self::SLUG,
            'name'           => 'Hanibal Tesfegabir Solomon',
            'date_of_birth'  => $dob->toDateString(),
            'age'            => $dob->age,
            'position'       => 'Attaquant',
            'category'       => 'Attaquant',
            'club'           => 'F91 Dudelange',
            'nationality'    => 'Érythréen',
            'preferred_foot' => 'Droit',
            'since'          => (int) now()->year,
            'photo_url'      => $photoUrl,
            'is_published'   => true,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        // Only removes what this migration created: the bundled photo file
        // and the player, if he still carries that photo.
        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if (! $player || ! str_starts_with((string) $player->photo_url, '/storage/players/'.self::SLUG.'-mig-')) return;

        Storage::disk('public')->delete(substr($player->photo_url, strlen('/storage/')));
        DB::table('players')->where('id', $player->id)->delete();
    }

    private function storePhoto(): ?string
    {
        $source = database_path('data/players/'.self::PHOTO);
        if (! is_file($source)) return null;

        $path = 'players/'.self::SLUG.'-mig-'.substr(sha1_file($source), 0, 8).'.jpg';
        Storage::disk('public')->put($path, file_get_contents($source));

        return '/storage/'.$path;
    }
};
