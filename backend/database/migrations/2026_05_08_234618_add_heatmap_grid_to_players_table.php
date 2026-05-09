<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // 6 cols × 4 rows = 24 intensities (0-100), JSON-encoded.
            // Player attacks left -> right; rows top-to-bottom for the rendered pitch.
            $table->json('heatmap_grid')->nullable()->after('saves');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('heatmap_grid');
        });
    }
};
