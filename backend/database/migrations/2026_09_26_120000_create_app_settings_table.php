<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Single-row settings table for agency-wide config that is not tied to a
 * specific entity (players, articles, staff) — social network URLs today,
 * potentially contact overrides / legal info later.
 *
 * The AppSetting model exposes a `singleton()` accessor that lazy-creates
 * row id=1 if missing, so callers never have to worry about it existing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();

            // Social network URLs. Nullable — the frontend hides any icon
            // whose URL is empty so an unset network never leaks into the
            // footer / contact page.
            $table->string('instagram_url', 500)->nullable();
            $table->string('facebook_url', 500)->nullable();
            $table->string('linkedin_url', 500)->nullable();
            $table->string('youtube_url', 500)->nullable();
            $table->string('tiktok_url', 500)->nullable();
            $table->string('x_url', 500)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
