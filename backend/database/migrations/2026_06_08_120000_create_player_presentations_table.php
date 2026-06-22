<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Presentation PDFs generated per player. Each row owns a rendered PDF
     * file under storage/app/public/presentations/, plus the options used to
     * produce it (template, colors, selected stats, photo source) so the same
     * presentation can be regenerated identically later.
     */
    public function up(): void
    {
        Schema::create('player_presentations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained()->cascadeOnDelete();
            $table->string('template_key', 40);
            $table->string('title', 200);
            // Layout / branding / content selection - one JSON blob, decoded server-side.
            $table->json('options')->nullable();
            // Path to the rendered PDF on the public disk (/storage/...).
            $table->string('file_path', 500)->nullable();
            $table->boolean('is_published')->default(false);
            // Unguessable token used in the public URL when published.
            $table->string('public_token', 64)->nullable()->unique();
            $table->timestamp('generated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['player_id', 'is_published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_presentations');
    }
};