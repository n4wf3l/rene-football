<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-field provenance — lets us know *how* we know a given fact about a
 * player, so the cockpit can show low-reliability rows in amber.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('field_name', 60);
            $table->string('value', 255)->nullable();
            $table->string('source_type', 24); // scout | officiel | feuille_match | video | agent | autre
            $table->string('source_label', 160)->nullable();
            $table->unsignedTinyInteger('reliability_score')->nullable(); // 0..100
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['player_id', 'field_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_sources');
    }
};
