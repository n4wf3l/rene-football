<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Back-office roles (see User::ROLES):
 *   superadmin — everything, and the only one who manages members;
 *   admin      — the agency side, without Scouting nor Data analyse;
 *   scout      — the agency side + Scouting, without Data analyse;
 *   analyst    — the agency side + Data analyse, without Scouting.
 *
 * Every account that had back-office access keeps all of it: existing
 * admins become superadmins, and a superadmin then assigns the right roles
 * from the Members page.
 *
 * member_invitation_tokens: one-time links sent to new members so they
 * choose their own password (72 h, separate from the 60-minute password
 * reset links).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('admin')->after('is_admin');
        });
        DB::table('users')->where('is_admin', true)->update(['role' => 'superadmin']);

        Schema::create('member_invitation_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_invitation_tokens');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
