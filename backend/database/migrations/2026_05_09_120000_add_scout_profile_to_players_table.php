<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // Pro players this prospect is compared to. Stored as JSON array of
            // { name: string, club?: string, photo_url?: string }.
            $table->json('comparisons')->nullable();

            // 3-5 strength keywords. JSON array of { key: string, label: string }
            // where key maps to a Phosphor icon on the frontend.
            $table->json('strengths')->nullable();

            // 0-10 with one decimal (e.g. 8.5).
            $table->decimal('potential_rating', 3, 1)->nullable();

            // Short qualifier shown next to the rating (e.g. "World class").
            $table->string('potential_label', 80)->nullable();

            // One-paragraph scout report. Shown as a quote block.
            $table->text('scout_quote')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn([
                'comparisons',
                'strengths',
                'potential_rating',
                'potential_label',
                'scout_quote',
            ]);
        });
    }
};
