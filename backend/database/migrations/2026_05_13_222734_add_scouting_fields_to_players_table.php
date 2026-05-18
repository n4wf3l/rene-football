<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scouting workflow lives ON the existing Player record (one identity, multiple
 * facets). The public-facing `is_published` flag stays separate from the
 * internal `scouting_status` workflow - a Shortlist A player can still be
 * unpublished on the public site.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('scouting_status', 20)->default('decouvert')->after('is_published');
            // decouvert | watchlist | shortlist_b | shortlist_a | valide | rejete | archive

            $table->decimal('score_current',     4, 1)->nullable()->after('scouting_status');
            $table->decimal('score_potential',   4, 1)->nullable()->after('score_current');
            $table->decimal('score_club_fit',    4, 1)->nullable()->after('score_potential');
            $table->decimal('score_market',      4, 1)->nullable()->after('score_club_fit');
            $table->decimal('score_risk',        4, 1)->nullable()->after('score_market');
            $table->decimal('score_confidence',  4, 1)->nullable()->after('score_risk');
            $table->decimal('score_global',      4, 1)->nullable()->after('score_confidence'); // computed
            $table->unsignedTinyInteger('completeness_pct')->nullable()->after('score_global'); // computed

            $table->string('next_action', 255)->nullable()->after('completeness_pct');
            $table->text('scout_summary')->nullable()->after('next_action');
            $table->string('source_label', 120)->nullable()->after('scout_summary');
            $table->unsignedTinyInteger('reliability_score')->nullable()->after('source_label'); // 0-100
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn([
                'scouting_status',
                'score_current', 'score_potential', 'score_club_fit',
                'score_market', 'score_risk', 'score_confidence', 'score_global',
                'completeness_pct',
                'next_action', 'scout_summary', 'source_label', 'reliability_score',
            ]);
        });
    }
};
