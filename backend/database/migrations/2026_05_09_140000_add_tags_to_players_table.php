<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            // JSON array of free-form short labels — UI feeds them from a
            // curated palette but the column itself is unconstrained.
            // Examples: ["Sous mandat", "Fin de contrat", "En prêt", "Blessé long"]
            $table->json('tags')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('tags');
        });
    }
};
