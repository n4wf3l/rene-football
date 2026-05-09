<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pivot: an article can attach any number of pre-existing PlayerClip
     * frames (the annotated PNGs from the scout work). Reusing clips means
     * zero duplication: the same key moment can illustrate multiple articles.
     */
    public function up(): void
    {
        Schema::create('article_player_clip', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->foreignId('player_clip_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['article_id', 'player_clip_id']);
            $table->index(['article_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_player_clip');
    }
};
