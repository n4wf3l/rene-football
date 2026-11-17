<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Former slugs of players. Renaming a player in the admin changes his
 * slug; the old /joueurs/{slug} URL (shared, indexed by Google) keeps
 * working through a 301 to the current one. Same model as
 * article_slug_redirects.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('player_slug_redirects', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 200)->unique();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_slug_redirects');
    }
};
