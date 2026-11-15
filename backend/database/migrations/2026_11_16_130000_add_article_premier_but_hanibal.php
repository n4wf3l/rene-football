<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration: publishes the news article about Hanibal Tesfegabir
 * Solomon's first goal in the BGL Ligue with F91 Dudelange (31/10/2026,
 * 3-0 against Victoria Rosport), featured so it leads the news pages.
 * Cover: his F91 Dudelange portrait, copied to its own file so replacing
 * the cover in the admin never deletes the player's photo.
 *
 * Idempotent (created once) and skipped under tests.
 */
return new class extends Migration
{
    private const SLUG   = 'premier-but-en-bgl-ligue-pour-hanibal-tesfegabir-solomon';
    private const PLAYER = 'hanibal-tesfegabir-solomon';
    private const COVER  = 'premier-but-hanibal-tesfegabir-solomon.jpg';

    public function up(): void
    {
        if (app()->environment('testing')) return;
        if (DB::table('articles')->where('slug', self::SLUG)->exists()) return;
        if (DB::table('article_slug_redirects')->where('slug', self::SLUG)->exists()) return;

        $content = implode("\n\n", [
            'Le 31 octobre 2026, **Hanibal Tesfegabir Solomon** a inscrit son premier but en championnat luxembourgeois. Lors de la 12e journée de BGL Ligue, le **F91 Dudelange** s\'est imposé 3-0 face à Victoria Rosport, et c\'est lui qui a signé le troisième but, à la 84e minute.',
            'À 18 ans, l\'attaquant marque ainsi son premier but officiel en équipe première.',
            '## Le match',
            implode("\n", [
                '- **Match :** F91 Dudelange 3-0 Victoria Rosport',
                '- **Compétition :** BGL Ligue, 12e journée',
                '- **Date :** 31 octobre 2026',
                '- **But :** 84e minute, pour le 3-0',
                '- **Âge :** 18 ans',
            ]),
            '## Déjà décisif le 18 octobre',
            'Le 18 octobre, face au Swift Hesperange (5-0), Hanibal avait déjà pesé sur le match en délivrant la passe décisive sur le quatrième but, inscrit par Valentino Tallarico.',
            'Une passe décisive puis un premier but en moins de deux semaines : Hanibal confirme sa progression avec le F91 Dudelange. Rene Football continue de l\'accompagner dans cette nouvelle étape.',
        ]);

        DB::table('articles')->insert([
            'slug'         => self::SLUG,
            'title'        => 'Premier but en BGL Ligue pour Hanibal Tesfegabir Solomon',
            'excerpt'      => 'À 18 ans, l\'attaquant du F91 Dudelange a inscrit son premier but officiel en équipe première, le 31 octobre face à Victoria Rosport (3-0), lors de la 12e journée de BGL Ligue.',
            'content'      => $content,
            'category'     => 'Talents',
            'cover_url'    => $this->copy(database_path('data/articles/'.self::COVER), 'articles/'.self::SLUG),
            'featured'     => true,
            'player_id'    => DB::table('players')->where('slug', self::PLAYER)->value('id'),
            'is_published' => true,
            'published_at' => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        // Only removes the article if it still carries the migrated cover.
        $article = DB::table('articles')->where('slug', self::SLUG)->first();
        if (! $article || ! str_contains((string) $article->cover_url, '/'.self::SLUG.'-mig-')) return;

        Storage::disk('public')->delete(substr($article->cover_url, strlen('/storage/')));
        DB::table('articles')->where('id', $article->id)->delete();
    }

    /** Copies a bundled file to the public disk; returns its /storage URL. */
    private function copy(string $source, string $targetBase): ?string
    {
        if (! is_file($source)) return null;
        $path = $targetBase.'-mig-'.substr(sha1_file($source), 0, 8).'.'.pathinfo($source, PATHINFO_EXTENSION);
        Storage::disk('public')->put($path, file_get_contents($source));
        return '/storage/'.$path;
    }
};
