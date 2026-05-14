<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shortlist_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shortlist_id')->constrained('shortlists')->cascadeOnDelete();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->unsignedSmallInteger('rank')->default(0); // ordering within stage
            $table->string('stage', 16)->default('watchlist');
            // watchlist | shortlist_b | shortlist_a | valide | rejete
            $table->text('reason')->nullable();
            $table->string('next_action', 255)->nullable();
            $table->unsignedInteger('estimated_price')->nullable();
            $table->string('risk_level', 8)->nullable(); // faible | moyen | eleve
            $table->decimal('confidence_score', 4, 1)->nullable();
            $table->timestamps();

            $table->unique(['shortlist_id', 'player_id']);
            $table->index(['shortlist_id', 'stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shortlist_players');
    }
};
