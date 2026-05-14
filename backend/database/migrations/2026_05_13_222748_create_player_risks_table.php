<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('risk_type', 16); // sportif | physique | mental | adaptation | marche | entourage | blessure
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->string('probability', 8)->default('moyenne'); // faible | moyenne | elevee
            $table->string('impact', 8)->default('moyen'); // faible | moyen | eleve
            $table->text('mitigation_plan')->nullable();
            $table->string('status', 12)->default('ouvert'); // ouvert | surveille | resolu
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['player_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_risks');
    }
};
