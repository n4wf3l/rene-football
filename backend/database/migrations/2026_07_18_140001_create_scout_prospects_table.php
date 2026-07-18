<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scout-private prospect entries (Option B).
 *
 * Deliberately a *separate* table from `players` so the two datasets
 * never mix. A prospect here is a player the scout is tracking for their
 * external client — it does NOT need to exist in Rene's roster, and it
 * MUST NOT appear anywhere Rene's admin looks (analysis, presentations,
 * public site, etc.).
 *
 * Shape mirrors the essentials of Player: identity + a subset of match
 * stats + one heatmap slot + scout notes. If a scout later decides a
 * prospect is worth flagging for Rene, a dedicated "propose" flow will
 * import it into the shared Player table (out of scope for this MVP).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scout_prospects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('scout_workspaces')->cascadeOnDelete();

            // Identity
            $table->string('name');
            $table->integer('age')->nullable();
            $table->string('position', 120)->nullable();
            $table->string('category', 40)->nullable();
            $table->string('club', 255)->nullable();
            $table->string('nationality', 120)->nullable();
            $table->string('preferred_foot', 20)->nullable();
            $table->string('height', 20)->nullable();
            $table->integer('since')->nullable();
            $table->string('photo_url', 500)->nullable();

            // Scout observation
            $table->text('notes')->nullable();
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->decimal('rating', 3, 1)->nullable();            // 0-10 global impression
            $table->decimal('potential_rating', 3, 1)->nullable();
            $table->string('recommendation', 40)->nullable();        // signer / observer / suivre / passer
            $table->string('status', 40)->nullable();                // decouvert / watchlist / shortlist / valide / rejete
            $table->text('next_action')->nullable();

            // Compact stats snapshot (per-match). Keeps the table small
            // rather than duplicating every Player column - the scout can
            // add whatever headline numbers matter for their client.
            $table->integer('matches_played')->nullable();
            $table->integer('goals')->nullable();
            $table->integer('assists')->nullable();
            $table->decimal('xg', 6, 2)->nullable();
            $table->decimal('xa', 6, 2)->nullable();
            $table->integer('minutes_played')->nullable();

            $table->timestamps();

            $table->index(['workspace_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scout_prospects');
    }
};
