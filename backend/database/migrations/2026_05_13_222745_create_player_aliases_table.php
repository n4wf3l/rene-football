<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->string('alias', 160);
            $table->string('source_type', 24)->nullable(); // officiel | feuille_match | medias | erreur_saisie | autre
            $table->timestamps();

            $table->index(['player_id']);
            $table->index('alias');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_aliases');
    }
};
