<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Content migration: aligns Abakar's profile with the 15/11/2026 article
 * (full name Abakar Mahamat-Abba, attacker, born 06/11/2009).
 *
 * Each field changes only if it still holds the old value, so an edit made
 * in the admin is never overwritten. The URL (/joueurs/abakar-abba) stays
 * the same so existing links and search results keep working.
 * Skipped under tests.
 */
return new class extends Migration
{
    private const SLUG = 'abakar-abba';
    private const BORN = '2009-11-06';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $p = DB::table('players')->where('slug', self::SLUG)->first();
        if (! $p) return;

        $changes = [];
        if ($p->name === 'Abakar Abba') {
            $changes['name'] = 'Abakar Mahamat-Abba';
        }
        if (in_array($p->position, ['Milieu défensif', 'Milieu defensif'], true)) {
            $changes['position'] = 'Attaquant';
        }
        if ($p->category === 'Milieu') {
            $changes['category'] = 'Attaquant';
        }
        if (empty($p->date_of_birth)) {
            $changes['date_of_birth'] = self::BORN;
            $changes['age'] = \Carbon\Carbon::parse(self::BORN)->age;
        }

        if ($changes) {
            DB::table('players')->where('id', $p->id)->update($changes + ['updated_at' => now()]);
        }
    }

    public function down(): void
    {
        // Content alignment: nothing to undo automatically.
    }
};
