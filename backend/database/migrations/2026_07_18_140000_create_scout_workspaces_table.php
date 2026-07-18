<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Personal scouting workspace for each scout (Option B).
 *
 * A scout has ONE workspace owned by them, isolated from Rene's shared
 * scouting data. The workspace holds prospects the scout tracks for their
 * own external client (e.g. FC X). Nothing in this workspace bleeds into
 * Rene's roster unless the scout explicitly proposes a prospect for the
 * agency.
 *
 * `name` is optional — the UI shows "Ma boîte perso" when null. The scout
 * can rename it (e.g. "FC X Recruiting") directly from the scout page.
 *
 * Unique `owner_user_id` keeps things simple for MVP (one workspace per
 * scout). If we later want multi-workspace per scout, drop the unique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scout_workspaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 80)->nullable();
            $table->timestamps();

            $table->unique('owner_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scout_workspaces');
    }
};
