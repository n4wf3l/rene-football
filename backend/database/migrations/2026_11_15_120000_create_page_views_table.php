<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Anonymous, server-side page-view counter (issue #1, docs/analytics-roadmap.md).
 *
 * No IP, no user-agent, no cookie id: each row only carries a visitor_hash
 * that rotates every day (HMAC of APP_KEY + IP + UA + date), so a visitor
 * can be counted once per day but never followed from one day to the next.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('path', 255);
            $table->string('resource_type', 16)->default('page'); // page | player | article
            $table->string('slug', 191)->nullable();
            $table->char('visitor_hash', 64);
            // Only set on the first page of a visit, so traffic sources are
            // counted per visit and not per page.
            $table->boolean('is_entry')->default(false);
            $table->string('referrer_host', 191)->nullable();
            $table->timestamp('viewed_at')->index();

            $table->index(['resource_type', 'viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
