<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('player_presentations', function (Blueprint $table) {
            // Absolute /storage/... URL to the admin-uploaded fiche (PNG/JPG/PDF).
            // When set, the generator is bypassed: file_path is either a wrapping
            // 1-page PDF (image case) or a copy of the uploaded PDF.
            $table->string('external_asset_path', 500)->nullable()->after('file_path');
            $table->string('external_asset_type', 10)->nullable()->after('external_asset_path');
            $table->string('external_asset_original_name', 200)->nullable()->after('external_asset_type');
        });
    }

    public function down(): void
    {
        Schema::table('player_presentations', function (Blueprint $table) {
            $table->dropColumn([
                'external_asset_path',
                'external_asset_type',
                'external_asset_original_name',
            ]);
        });
    }
};
