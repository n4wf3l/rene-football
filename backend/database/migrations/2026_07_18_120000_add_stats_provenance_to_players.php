<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Data provenance for player stats.
 *
 * Analytics only mean something if we know where the numbers came from and
 * how fresh they are. These three columns are surfaced everywhere player
 * stats appear (cards, analysis, presentation PDF footer) so a DS reading a
 * dossier knows whether the xG is a Wyscout import from last week or an
 * agent's rough estimate from 3 months ago.
 *
 *   stats_source       enum-like string ('manual', 'csv', 'wyscout',
 *                      'instat', 'club_official', 'observed', 'seed')
 *   stats_updated_at   last time any stat was written / imported
 *   stats_reliability  1-5 self-declared reliability (1 = rumor, 5 = certified)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('stats_source', 40)->nullable()->after('reliability_score');
            $table->timestamp('stats_updated_at')->nullable()->after('stats_source');
            $table->unsignedTinyInteger('stats_reliability')->nullable()->after('stats_updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['stats_source', 'stats_updated_at', 'stats_reliability']);
        });
    }
};
