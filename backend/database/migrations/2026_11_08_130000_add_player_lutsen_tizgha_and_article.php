<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration: publishes Lutsen Sohan Tizgha (AJ Auxerre, born
 * 13/08/2012) in production with his portrait, plus the English news
 * article announcing that he joins the agency and signs with AJ Auxerre.
 *
 * Idempotent (each piece is created once) and skipped under tests.
 */
return new class extends Migration
{
    private const SLUG         = 'lutsen-sohan-tizgha';
    private const PHOTO        = 'lutsen-sohan-tizgha.jpg';
    private const ARTICLE_SLUG = 'lutsen-sohan-tizgha-joins-rene-football-and-signs-with-aj-auxerre';
    private const COVER        = 'signature-lutsen-sohan-tizgha-auxerre.jpg';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $this->ensurePlayer();
        $this->ensureArticle();
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        $article = DB::table('articles')->where('slug', self::ARTICLE_SLUG)->first();
        if ($article) {
            $this->deleteIfMigrated($article->cover_url);
            DB::table('articles')->where('id', $article->id)->delete();
        }

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if ($player && str_contains((string) $player->photo_url, '/'.self::SLUG.'-mig-')) {
            $this->deleteIfMigrated($player->photo_url);
            DB::table('players')->where('id', $player->id)->delete();
        }
    }

    private function ensurePlayer(): void
    {
        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if ($player && $player->photo_url) return;

        $photoUrl = $this->copy(database_path('data/players/'.self::PHOTO), 'players/'.self::SLUG);

        if ($player) {
            DB::table('players')->where('id', $player->id)->update(['photo_url' => $photoUrl, 'updated_at' => now()]);
            return;
        }

        DB::table('players')->insert([
            'slug'                  => self::SLUG,
            'name'                  => 'Lutsen Sohan Tizgha',
            'date_of_birth'         => '2012-08-13',
            'age'                   => \Carbon\Carbon::parse('2012-08-13')->age,
            'height'                => '1m69',
            'position'              => 'Latéral gauche',
            'best_position'         => 'Latéral gauche',
            'category'              => 'Defenseur',
            'club'                  => 'AJ Auxerre',
            'nationality'           => 'Français',
            'secondary_nationality' => 'Marocain',
            'bio'                   => 'Latéral gauche franco-marocain né en 2012, Lutsen évolue à l’AJ Auxerre. Un joueur professionnel dans la tête.',
            'since'                 => (int) now()->year,
            'photo_url'             => $photoUrl,
            'is_published'          => true,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
    }

    private function ensureArticle(): void
    {
        if (DB::table('articles')->where('slug', self::ARTICLE_SLUG)->exists()) return;
        $playerId = DB::table('players')->where('slug', self::SLUG)->value('id');

        $content = implode("\n\n", [
            'Rene Football is proud to welcome **Lutsen Sohan Tizgha** to the agency. The young left-back has signed with **AJ Auxerre**, a club with a long tradition of developing young players.',
            'Born on 13 August 2012, Lutsen is a French-Moroccan full-back who plays on the left flank. He joins the agency at an age where every decision counts, and his project now continues in Auxerre.',
            '## Key facts',
            implode("\n", [
                '- **Position:** left-back',
                '- **Club:** AJ Auxerre',
                '- **Date of birth:** 13 August 2012',
                '- **Height:** 1.69 m',
                '- **Nationality:** French / Moroccan',
            ]),
            '> A professional player, in his head first.',
            'For Rene Football, this signing is another step in our mission: propelling the talents we represent towards professional horizons, with ambition and over the long term.',
        ]);

        DB::table('articles')->insert([
            'slug'         => self::ARTICLE_SLUG,
            'title'        => 'Lutsen Sohan Tizgha joins Rene Football and signs with AJ Auxerre',
            'excerpt'      => 'The French-Moroccan left-back, born in 2012, is the agency’s newest player and now wears the colours of AJ Auxerre.',
            'content'      => $content,
            'category'     => 'Mercato',
            'cover_url'    => $this->copy(database_path('data/articles/'.self::COVER), 'articles/'.self::ARTICLE_SLUG),
            'featured'     => false,
            'player_id'    => $playerId,
            'is_published' => true,
            'published_at' => '2026-11-08 12:00:00',
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    /** Copies a bundled file to the public disk; returns its /storage URL. */
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
