<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Club DNA" profiles describe the style/attributes a recruit should match
 * for a given position. Player.club_fit score will eventually compare against
 * one of these. Seeded with 4 archetypes (winger high-press, holding mid possession,
 * CB build-up, attacking full-back).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('club_dna_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name', 160);
            $table->string('position', 80);
            $table->string('category', 12)->default('Pro');
            $table->text('description')->nullable();
            $table->json('attributes')->nullable(); // [{key, label, weight}]
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('club_dna_profiles');
    }
};
