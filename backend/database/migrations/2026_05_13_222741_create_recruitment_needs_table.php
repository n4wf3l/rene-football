<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recruitment_needs', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title', 180);
            $table->string('position', 80);
            $table->string('priority', 12)->default('moyenne'); // basse | moyenne | haute | urgente
            $table->string('season', 20)->nullable();
            $table->string('category', 12)->default('Pro'); // Pro | U23 | U19 | U18 | U16
            $table->unsignedInteger('budget_min')->nullable();
            $table->unsignedInteger('budget_max')->nullable();
            $table->unsignedTinyInteger('age_min')->nullable();
            $table->unsignedTinyInteger('age_max')->nullable();
            $table->string('preferred_foot', 16)->nullable();
            $table->text('profile_description')->nullable();
            $table->json('required_attributes')->nullable(); // [{key, label, weight}]
            $table->string('status', 16)->default('actif'); // actif | en_pause | cloture
            $table->date('deadline')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
            $table->index('priority');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recruitment_needs');
    }
};
