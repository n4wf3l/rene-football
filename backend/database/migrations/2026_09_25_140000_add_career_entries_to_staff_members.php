<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Structured career/parcours block on staff members.
     *
     * Rendered as the "Parcours" timeline section on the staff detail page.
     * Each row is { period, title, description } — period is a free-form
     * string ("2009 — 2016", "2008") so we don't force a date parser on
     * historical or open-ended entries.
     */
    public function up(): void
    {
        Schema::table('staff_members', function (Blueprint $table) {
            $table->json('career_entries')->nullable()->after('bio');
        });
    }

    public function down(): void
    {
        Schema::table('staff_members', function (Blueprint $table) {
            $table->dropColumn('career_entries');
        });
    }
};
