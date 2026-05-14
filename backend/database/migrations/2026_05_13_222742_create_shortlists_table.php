<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shortlists', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name', 160);
            $table->foreignId('recruitment_need_id')->nullable()->constrained('recruitment_needs')->nullOnDelete();
            $table->text('description')->nullable();
            $table->string('season', 20)->nullable();
            $table->string('status', 16)->default('active'); // active | closed | archived
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shortlists');
    }
};
