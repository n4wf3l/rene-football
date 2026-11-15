<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Content migration: the Abakar U23 article was first published on
 * 15/11/2026 as /actualites/abakar-mahamat-abba-u23-standard-de-liege, then
 * its slug changed with a title edit in the admin. The first URL redirects
 * (301) to the current one again.
 *
 * Idempotent (inserted once, only if the old slug is not an article of its
 * own) and skipped under tests.
 */
return new class extends Migration
{
    private const OLD_SLUG = 'abakar-mahamat-abba-u23-standard-de-liege';
    private const CURRENT_SLUG = 'a-seulement-17-ans-abakar-mahamat-abba-franchit-une-nouvelle-etape';
    private const PLAYER = 'abakar-abba';

    public function up(): void
    {
        if (app()->environment('testing')) return;
        if (DB::table('articles')->where('slug', self::OLD_SLUG)->exists()) return;
        if (DB::table('article_slug_redirects')->where('slug', self::OLD_SLUG)->exists()) return;

        $articleId = DB::table('articles')->where('slug', self::CURRENT_SLUG)->value('id')
            ?? $this->onlyArticleAboutAbakar();
        if (! $articleId) return;

        DB::table('article_slug_redirects')->insert([
            'slug'       => self::OLD_SLUG,
            'article_id' => $articleId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** Fallback if the title was edited again: the one article linked to Abakar's profile. */
    private function onlyArticleAboutAbakar(): ?int
    {
        $playerId = DB::table('players')->where('slug', self::PLAYER)->value('id');
        if (! $playerId) return null;

        $ids = DB::table('articles')->where('player_id', $playerId)->pluck('id');
        return $ids->count() === 1 ? (int) $ids->first() : null;
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        DB::table('article_slug_redirects')->where('slug', self::OLD_SLUG)->delete();
    }
};
