<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration: publishes Hamzath Mohamadou (Borussia Dortmund, 15 ans)
 * in production. Idempotent, same rules as the Camara / Hanibal migrations:
 *  - player missing         → created, published, with his detoured photo;
 *  - player present, no photo → only the photo is attached;
 *  - player present with photo → nothing is touched.
 * Skipped under tests so fixtures and player counts stay deterministic.
 */
return new class extends Migration
{
    private const SLUG  = 'hamzath-mohamadou';
    private const PHOTO = 'hamzath-mohamadou.png';

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

        DB::table('players')->insert([
            'slug'         => self::SLUG,
            'name'         => 'Hamzath Mohamadou',
            'age'          => 15,
            'position'     => 'Ailier gauche',
            'category'     => 'Attaquant',
            'club'         => 'Borussia Dortmund',
            'nationality'  => 'Allemand',
            'strengths'    => json_encode([
                ['key' => '1v1',           'label' => 'Duels en 1 contre 1'],
                ['key' => 'explosiveness', 'label' => 'Explosivité'],
                ['key' => 'dribbling',     'label' => 'Dribble'],
                ['key' => 'unpredictable', 'label' => 'Imprévisibilité'],
            ], JSON_UNESCAPED_UNICODE),
            'since'        => (int) now()->year,
            'photo_url'    => $photoUrl,
            'is_published' => true,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if (! $player || ! str_starts_with((string) $player->photo_url, '/storage/players/'.self::SLUG.'-mig-')) return;

        Storage::disk('public')->delete(substr($player->photo_url, strlen('/storage/')));
        DB::table('players')->where('id', $player->id)->delete();
    }

    private function storePhoto(): ?string
    {
        $source = database_path('data/players/'.self::PHOTO);
        if (! is_file($source)) return null;

        $ext  = pathinfo($source, PATHINFO_EXTENSION);
        $path = 'players/'.self::SLUG.'-mig-'.substr(sha1_file($source), 0, 8).'.'.$ext;
        Storage::disk('public')->put($path, file_get_contents($source));

        return '/storage/'.$path;
    }
};
