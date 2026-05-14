<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `football_matches` is a calendar entity (one match = two teams), distinct
 * from the player-centric `appearances` table. Scouting reports, missions and
 * quick observations all hook here. Named `football_matches` rather than
 * `matches` to avoid PHP's `match` keyword and any reserved-word concerns.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('football_matches', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->dateTime('kickoff_at');
            $table->string('competition', 120);
            $table->string('season', 20)->nullable(); // ex. 2025-2026
            $table->string('home_team', 120);
            $table->string('away_team', 120);
            $table->string('category', 12)->default('Pro'); // Pro | U23 | U19 | U18 | U16
            $table->string('venue', 160)->nullable();
            $table->unsignedTinyInteger('score_home')->nullable();
            $table->unsignedTinyInteger('score_away')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 16)->default('scheduled'); // scheduled | live | played | postponed | cancelled
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['kickoff_at', 'category']);
            $table->index('competition');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('football_matches');
    }
};
