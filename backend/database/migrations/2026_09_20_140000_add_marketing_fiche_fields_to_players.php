<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fills the field gaps needed by the "Marketing v1" template — mirrors
     * the fields visible on the reference fiches shared 2026-09-20 (Zoran,
     * Camara, Saeed, Destiny, Hanibal).
     */
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('playing_style', 160)->nullable()->after('preferred_foot');
            $table->string('best_position', 120)->nullable()->after('playing_style');
            $table->text('objective')->nullable()->after('best_position');
            // Short list of mental / soft-skill traits (Confiant, Persévérant…).
            $table->json('mental_strengths')->nullable()->after('objective');
            // Dual nationality support (Fiche 3 — Ghanaian / Dutch).
            $table->string('secondary_nationality', 120)->nullable()->after('nationality');
            // Languages spoken (Fiche 3 — English // Dutch).
            $table->json('languages_spoken')->nullable()->after('secondary_nationality');
            // Additional portrait/action photos shown as a 3-vignette strip
            // (Fiches 1, 3). Array of URLs.
            $table->json('gallery_photos')->nullable()->after('secondary_photo_url');
            // Career history (Fiche 5 "Parcours"): [{years:"2024-2026", club:"F91 Dudelange", logo_url:"..."}].
            $table->json('career_history')->nullable()->after('gallery_photos');
            // "Vient de" chip in the top-left of the photo (Fiche 4 Destiny → KRC Genk).
            $table->string('previous_club', 120)->nullable()->after('career_history');
            $table->string('previous_club_logo', 500)->nullable()->after('previous_club');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn([
                'playing_style',
                'best_position',
                'objective',
                'mental_strengths',
                'secondary_nationality',
                'languages_spoken',
                'gallery_photos',
                'career_history',
                'previous_club',
                'previous_club_logo',
            ]);
        });
    }
};
