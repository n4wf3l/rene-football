<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration: publishes the "Rene Football × WNRS Sport" partnership
 * announcement (agency post of 25/10/2026) as the first news article in
 * production, with its cover. Idempotent: does nothing if the slug exists.
 * Skipped under tests so fixtures and article counts stay deterministic.
 */
return new class extends Migration
{
    private const SLUG  = 'rene-football-s-associe-a-wnrs-sport';
    private const COVER = 'partenariat-wnrs-sport.jpg';

    public function up(): void
    {
        if (app()->environment('testing')) return;
        if (DB::table('articles')->where('slug', self::SLUG)->exists()) return;

        $content = implode("\n\n", [
            "Rene Football annonce un partenariat avec WNRS Sport, agence de représentation de joueurs basée en Angleterre. Une collaboration qui élargit notre réseau à l’international et renforce notre capacité à accompagner nos joueurs vers le football professionnel.",
            "Dans ce cadre, Gbolahan, agent de WNRS Sport, et René Jacob Yougbaré, fondateur de Rene Football, travaillent désormais ensemble sur le suivi et le placement des talents que nous représentons.",
            "Ce partenariat nous ouvre des entrées directes auprès de clubs en Allemagne, aux Pays-Bas, en Espagne, en Belgique et en Angleterre. Pour nos joueurs, c’est l’assurance d’un dossier présenté aux bons interlocuteurs et porté par deux agences complémentaires.",
            "Notre cap reste le même : propulser les talents que nous accompagnons vers des horizons professionnels, avec exigence et sur la durée.",
        ]);

        DB::table('articles')->insert([
            'slug'         => self::SLUG,
            'title'        => 'Rene Football s’associe à l’agence anglaise WNRS Sport',
            'excerpt'      => 'Gbolahan (WNRS Sport) et René Jacob Yougbaré unissent leurs réseaux : des entrées directes dans des clubs en Allemagne, aux Pays-Bas, en Espagne, en Belgique et en Angleterre pour les talents de l’agence.',
            'content'      => $content,
            'category'     => 'Agence',
            'cover_url'    => $this->storeCover(),
            'featured'     => true,
            'is_published' => true,
            'published_at' => '2026-10-25 12:00:00',
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        $article = DB::table('articles')->where('slug', self::SLUG)->first();
        if (! $article) return;
        if (str_starts_with((string) $article->cover_url, '/storage/articles/'.self::SLUG.'-mig-')) {
            Storage::disk('public')->delete(substr($article->cover_url, strlen('/storage/')));
        }
        DB::table('articles')->where('id', $article->id)->delete();
    }

    private function storeCover(): ?string
    {
        $source = database_path('data/articles/'.self::COVER);
        if (! is_file($source)) return null;

        $path = 'articles/'.self::SLUG.'-mig-'.substr(sha1_file($source), 0, 8).'.jpg';
        Storage::disk('public')->put($path, file_get_contents($source));

        return '/storage/'.$path;
    }
};
