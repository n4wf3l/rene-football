<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agency partners (e.g. WNRS Sport). Displayed as a logo strip on the
 * public site — same admin CRUD pattern as StaffMember.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 200)->unique();
            $table->string('name', 160);
            /** Small tagline / role on the fiche ("Partenaire stratégique UK"). */
            $table->string('role', 200)->nullable();
            $table->string('logo_url', 500)->nullable();
            /** External site — makes the logo card clickable when set. */
            $table->string('website_url', 500)->nullable();
            /** ISO 3166-1 alpha-2 lowercase (e.g. "gb") — powers the flag chip. */
            $table->string('country_code', 4)->nullable();
            $table->string('country_label', 80)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['is_published', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partners');
    }
};
