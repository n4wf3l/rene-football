<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // True for users who can be auto-routed reports for validation
            // (chef de recrutement, directeur sportif, scout senior…).
            $table->boolean('is_head_of_scouting')->default(false)->after('is_admin');
            // Optional JSON array of player categories this validator owns
            // (e.g. ["Pro"], ["U19","U18"]). Null → covers everything.
            $table->json('scouting_scope')->nullable()->after('is_head_of_scouting');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_head_of_scouting', 'scouting_scope']);
        });
    }
};
