<?php

use App\Support\PlayerPhoto;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration: publishes Joshua Lucky Uwakhonye (Borussia
 * Mönchengladbach, born 16/08/2005, Germany U18 international) in production
 * with his cut-out portrait and its lightweight display version.
 *
 * Idempotent (created once, photo added if missing) and skipped under tests.
 */
return new class extends Migration
{
    private const SLUG  = 'joshua-lucky-uwakhonye';
    private const PHOTO = 'joshua-lucky-uwakhonye.webp';
    private const BORN  = '2005-08-16';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if ($player && $player->photo_url) return;

        $photoUrl = $this->copy(database_path('data/players/'.self::PHOTO), 'players/'.self::SLUG);
        $display = $photoUrl ? PlayerPhoto::displayFor($photoUrl) : null;

        if ($player) {
            DB::table('players')->where('id', $player->id)->update([
                'photo_url' => $photoUrl, 'photo_display_url' => $display, 'updated_at' => now(),
            ]);
            return;
        }

        DB::table('players')->insert([
            'slug'              => self::SLUG,
            'name'              => 'Joshua Lucky Uwakhonye',
            'date_of_birth'     => self::BORN,
            'age'               => \Carbon\Carbon::parse(self::BORN)->age,
            'position'          => 'Défenseur central gauche / Latéral gauche',
            'best_position'     => 'Défenseur central gauche',
            'category'          => 'Defenseur',
            'club'              => 'Borussia Mönchengladbach',
            'nationality'       => 'Allemand',
            'preferred_foot'    => 'Gauche',
            'playing_style'     => 'Puissant – Rapide',
            'bio'               => 'Défenseur gauche moderne, Joshua Lucky Uwakhonye allie un physique hors norme et de solides qualités défensives. '
                .'Puissant, rapide et intelligent dans ses choix, il est redoutable dans les duels. International allemand U18.',
            'tags'              => json_encode(['Sélectionné international'], JSON_UNESCAPED_UNICODE),
            'since'             => (int) now()->year,
            'photo_url'         => $photoUrl,
            'photo_display_url' => $display,
            'is_published'      => true,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if ($player && str_contains((string) $player->photo_url, '/'.self::SLUG.'-mig-')) {
            $this->deleteIfMigrated($player->photo_url);
            PlayerPhoto::delete($player->photo_display_url);
            DB::table('players')->where('id', $player->id)->delete();
        }
    }

    private function copy(string $source, string $targetBase): ?string
    {
        if (! is_file($source)) return null;
        $path = $targetBase.'-mig-'.substr(sha1_file($source), 0, 8).'.'.pathinfo($source, PATHINFO_EXTENSION);
        Storage::disk('public')->put($path, file_get_contents($source));
        return '/storage/'.$path;
    }

    private function deleteIfMigrated(?string $url): void
    {
        if ($url && str_starts_with($url, '/storage/') && str_contains($url, '-mig')) {
            Storage::disk('public')->delete(substr($url, strlen('/storage/')));
        }
    }
};
