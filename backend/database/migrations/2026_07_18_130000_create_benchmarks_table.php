<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Position × age-tier × metric reference profiles, editable at runtime.
 *
 * The config/benchmarks.php file remains as the *default* set (used as a
 * fallback when a row doesn't exist in the DB and as the source-of-truth
 * for the seeder). This table lets the sporting direction fine-tune the
 * averages / elite anchors without touching code — e.g. a specific league
 * benchmark or a rewrite after fresh Wyscout data.
 *
 * Unique triplet (category, tier, metric) ensures upsert semantics.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benchmarks', function (Blueprint $table) {
            $table->id();
            $table->string('category', 40);       // Gardien / Defenseur / Milieu / Attaquant
            $table->string('tier', 20);           // u18 / u21 / young / prime / vet
            $table->string('metric', 60);         // goals / xg / pass_accuracy ...
            $table->decimal('avg', 8, 3);
            $table->decimal('elite', 8, 3);
            $table->string('unit', 12)->nullable();
            $table->timestamps();

            $table->unique(['category', 'tier', 'metric']);
            $table->index(['category', 'tier']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benchmarks');
    }
};
