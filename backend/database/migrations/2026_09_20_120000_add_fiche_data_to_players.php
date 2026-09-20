<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // Optional DOB. `age` stays (denormalised for filtering/sorts and
            // to keep old scout imports working); when both are present, the
            // presentation renders DOB and derives display age from it.
            $table->date('date_of_birth')->nullable()->after('age');
            // Current club crest — displayed next to the club name on presentations.
            $table->string('club_logo_url', 500)->nullable()->after('club');
            // Secondary portrait, used on marketing-style fiches where a
            // small headshot sits alongside the main action photo.
            $table->string('secondary_photo_url', 500)->nullable()->after('photo_url');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['date_of_birth', 'club_logo_url', 'secondary_photo_url']);
        });
    }
};
