<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Immutable audit log : every status change on a scouting report is appended
     * here so the drawer can show "qui a soumis à qui, quand, avec quel commentaire".
     * We never UPDATE these rows — only INSERT.
     */
    public function up(): void
    {
        Schema::create('scouting_report_transitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scouting_report_id')->constrained('scouting_reports')->cascadeOnDelete();
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32);
            // Actor — the user who triggered the transition (clicked Soumettre / Valider / …).
            $table->foreignId('from_user_id')->nullable()->constrained('users')->nullOnDelete();
            // Recipient — only set for "submit" and "request_changes" transitions
            // (validated/archived don't have a target).
            $table->foreignId('to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comment')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['scouting_report_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scouting_report_transitions');
    }
};
