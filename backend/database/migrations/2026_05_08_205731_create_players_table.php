<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->unsignedTinyInteger('age');
            $table->string('height')->nullable();
            $table->string('position');
            $table->string('category');
            $table->string('club')->nullable();
            $table->string('nationality')->nullable();
            $table->string('preferred_foot')->nullable();
            $table->unsignedSmallInteger('since')->nullable();
            $table->string('photo_url')->nullable();
            $table->text('bio')->nullable();

            $table->unsignedSmallInteger('matches_played')->default(0);
            $table->unsignedSmallInteger('goals')->default(0);
            $table->unsignedSmallInteger('assists')->default(0);

            $table->unsignedSmallInteger('minutes_played')->default(0);
            $table->unsignedSmallInteger('shots')->default(0);
            $table->unsignedSmallInteger('shots_on_target')->default(0);
            $table->decimal('xg', 5, 2)->default(0);
            $table->decimal('xa', 5, 2)->default(0);
            $table->unsignedSmallInteger('key_passes')->default(0);
            $table->decimal('pass_accuracy', 5, 2)->default(0);
            $table->unsignedSmallInteger('dribbles_completed')->default(0);
            $table->unsignedSmallInteger('tackles')->default(0);
            $table->unsignedSmallInteger('interceptions')->default(0);
            $table->unsignedSmallInteger('duels_won')->default(0);
            $table->unsignedSmallInteger('yellow_cards')->default(0);
            $table->unsignedSmallInteger('red_cards')->default(0);
            $table->unsignedSmallInteger('clean_sheets')->default(0);
            $table->unsignedSmallInteger('saves')->default(0);

            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
