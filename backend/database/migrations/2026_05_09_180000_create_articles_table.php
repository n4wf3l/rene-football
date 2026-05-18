<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 200)->unique();
            $table->string('title', 200);
            $table->text('excerpt')->nullable();
            $table->longText('content')->nullable();   // plain text / lightweight Markdown
            $table->string('category', 60)->default('Agence'); // Mercato / Talents / Profils / Coulisses / Agence
            $table->string('cover_url', 500)->nullable();
            $table->boolean('featured')->default(false);
            // Optional "loop" - anchor the article on one specific player.
            $table->foreignId('player_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_published')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index('published_at');
            $table->index(['is_published', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
