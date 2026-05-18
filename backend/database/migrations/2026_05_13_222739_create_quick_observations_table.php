<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rapid in-stadium tagging - one row per click on a + Action button. They get
 * surfaced as a draft "key actions" list when the scout opens the formal
 * report editor after the match.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quick_observations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('football_match_id')->constrained('football_matches')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('scout_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('minute')->nullable();
            $table->string('kind', 24); // positif | negatif | offensif | defensif | mental | video | key_moment
            $table->string('note', 255)->nullable();
            $table->string('impact', 8)->default('moyen'); // faible | moyen | fort
            $table->timestamps();

            $table->index(['football_match_id', 'player_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quick_observations');
    }
};
