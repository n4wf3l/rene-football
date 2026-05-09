<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->date('match_date');
            $table->string('competition', 80);              // e.g. "Bundesliga", "DFB-Pokal", "UEFA U-17"
            $table->string('opponent', 120);
            $table->boolean('home')->default(true);
            $table->unsignedTinyInteger('score_team')->default(0);
            $table->unsignedTinyInteger('score_opponent')->default(0);
            $table->unsignedSmallInteger('minutes_played')->default(0);
            $table->unsignedTinyInteger('goals')->default(0);
            $table->unsignedTinyInteger('assists')->default(0);
            $table->unsignedTinyInteger('shots')->default(0);
            $table->unsignedTinyInteger('shots_on_target')->default(0);
            $table->boolean('yellow_card')->default(false);
            $table->boolean('red_card')->default(false);
            $table->decimal('rating', 3, 1)->nullable();    // 0.0 - 10.0
            $table->text('notes')->nullable();              // internal scout note
            $table->timestamps();

            $table->index(['player_id', 'match_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appearances');
    }
};
