<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scouting_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->cascadeOnDelete();
            $table->foreignId('football_match_id')->nullable()->constrained('football_matches')->nullOnDelete();
            $table->foreignId('scout_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('observed_position', 80)->nullable();
            $table->unsignedSmallInteger('minutes_observed')->nullable();
            $table->string('context', 60)->nullable(); // live | video | mixte
            $table->string('tactical_role', 120)->nullable();

            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->json('key_actions')->nullable(); // array of {minute, type, note, clip_id?}

            $table->decimal('global_rating', 4, 1)->nullable(); // 0..10
            $table->decimal('current_level', 4, 1)->nullable();
            $table->decimal('potential_level', 4, 1)->nullable();

            $table->string('recommendation', 32)->nullable();
            // ne_pas_poursuivre | a_revoir | watchlist | shortlist_b | shortlist_a | recruter
            $table->string('next_action', 255)->nullable();

            $table->string('status', 24)->default('draft');
            // draft | submitted | needs_changes | validated | archived

            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable();

            $table->timestamps();

            $table->index(['player_id', 'status']);
            $table->index('status');
            $table->index('football_match_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scouting_reports');
    }
};
