<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Public Contact form is being reworked as a multi-step wizard with
 * audience-specific questions (Joueur / Club / Média / Autre). All the
 * structured answers land in `payload` as a typed JSON blob so we don't
 * blow up the column list with 20 nullable string fields.
 *
 * `status` drives the admin inbox workflow (new → read → handled → archived)
 * and `cv_path` stores the storage-disk path of the uploaded CV when a
 * player fills the "Rejoindre l'agence" flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->json('payload')->nullable()->after('message');
            $table->string('status', 16)->default('new')->after('payload');
            $table->string('cv_path', 500)->nullable()->after('status');
            $table->index('status');
            $table->index('reason');
        });
    }

    public function down(): void
    {
        Schema::table('contact_submissions', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['reason']);
            $table->dropColumn(['payload', 'status', 'cv_path']);
        });
    }
};
