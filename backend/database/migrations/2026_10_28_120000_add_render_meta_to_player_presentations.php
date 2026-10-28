<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('player_presentations', function (Blueprint $table) {
            // Layout report of the last verified render: composition, density
            // rung, editorial syntheses (e.g. "4 of 5 countries"), page count
            // and size as read back from the PDF. Shown in the admin editor.
            $table->json('render_meta')->nullable()->after('generated_at');
        });
    }

    public function down(): void
    {
        Schema::table('player_presentations', function (Blueprint $table) {
            $table->dropColumn('render_meta');
        });
    }
};
