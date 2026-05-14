<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scouting_report_id')->constrained('scouting_reports')->cascadeOnDelete();
            $table->string('category', 24); // technique | tactique | physique | mental | offensif | defensif
            $table->string('criterion', 120);
            $table->unsignedTinyInteger('score'); // 1..10
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index(['scouting_report_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_scores');
    }
};
