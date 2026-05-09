<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Inline gallery images attached to an article. The cover lives on the
     * article row directly; this table is for the body gallery.
     */
    public function up(): void
    {
        Schema::create('article_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->string('caption', 200)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['article_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_images');
    }
};
