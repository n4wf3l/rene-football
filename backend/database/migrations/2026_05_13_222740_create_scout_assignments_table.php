<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scout_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('title', 180);
            $table->foreignId('football_match_id')->nullable()->constrained('football_matches')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('priority', 12)->default('moyenne'); // basse | moyenne | haute | urgente
            $table->text('objective')->nullable();
            $table->json('players_to_watch')->nullable(); // array of player_ids
            $table->date('due_date')->nullable();
            $table->string('status', 24)->default('a_faire');
            // a_faire | en_cours | rapport_soumis | a_completer | valide
            $table->json('checklist')->nullable(); // array of {key, label, done}
            $table->timestamps();

            $table->index('status');
            $table->index('assigned_to');
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scout_assignments');
    }
};
