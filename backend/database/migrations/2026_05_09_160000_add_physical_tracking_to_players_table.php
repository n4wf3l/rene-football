<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // Per-match averages (the four core GPS-tracker outputs).
            $table->decimal('distance_avg_km', 4, 2)->nullable();   // 0.00 - 16.00 km / match
            $table->unsignedSmallInteger('sprints_avg')->nullable(); // ~ 0 - 60 / match
            $table->decimal('top_speed_kmh', 4, 1)->nullable();      // 0.0 - 40.0 km/h
            $table->unsignedSmallInteger('high_intensity_runs_avg')->nullable(); // 0 - 200
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn([
                'distance_avg_km',
                'sprints_avg',
                'top_speed_kmh',
                'high_intensity_runs_avg',
            ]);
        });
    }
};
