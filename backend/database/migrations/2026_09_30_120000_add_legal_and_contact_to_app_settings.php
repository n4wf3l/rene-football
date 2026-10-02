<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends the singleton app_settings row with two blocks of agency data
 * that until now were hardcoded in TSX / i18n JSON :
 *
 *   - Tier 1 (legal) : forme juridique, RCS Luxembourg, TVA intracom,
 *     siège social, directeur de publication → mentions légales.
 *   - Tier 2 (contact) : email agence, téléphone, ville → footer, contact
 *     page sidebar, legal pages, i18n summary bullets.
 *
 * All fields are nullable with sensible defaults so an existing row keeps
 * working and the admin can populate them progressively.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            // --- Legal identity ---
            $table->string('legal_form', 120)->nullable()->after('x_url');
            $table->string('rcs_number', 60)->nullable()->after('legal_form');
            $table->string('vat_number', 40)->nullable()->after('rcs_number');
            $table->string('registered_office_address', 500)->nullable()->after('vat_number');
            $table->string('publication_director', 160)->nullable()->after('registered_office_address');

            // --- Contact ---
            $table->string('contact_email', 160)->nullable()->after('publication_director');
            $table->string('contact_phone', 40)->nullable()->after('contact_email');
            $table->string('office_city', 200)->nullable()->after('contact_phone');
        });
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropColumn([
                'legal_form',
                'rcs_number',
                'vat_number',
                'registered_office_address',
                'publication_director',
                'contact_email',
                'contact_phone',
                'office_city',
            ]);
        });
    }
};
