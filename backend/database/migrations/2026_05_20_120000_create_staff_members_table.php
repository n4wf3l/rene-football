<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Public "À propos / L'équipe" roster - small CRUD-managed list shown on
     * the about page. Photo is uploaded the same way as players/articles:
     * stored under storage/app/public/staff and served via /storage/...
     */
    public function up(): void
    {
        Schema::create('staff_members', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 200)->unique();
            $table->string('name', 160);
            $table->string('role', 200);
            $table->text('bio')->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['is_published', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_members');
    }
};
