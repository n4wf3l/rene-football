<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scouting_reports', function (Blueprint $table) {
            // Validator the scout submitted the report to. Null means "broadcast queue"
            // (legacy reports) — the inbox endpoint surfaces both.
            $table->foreignId('submitted_to')->nullable()->after('validated_by')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('scouting_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('submitted_to');
        });
    }
};
