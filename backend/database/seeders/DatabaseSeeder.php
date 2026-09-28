<?php

namespace Database\Seeders;

use Database\Seeders\Scouting\ClubDnaProfileSeeder;
use Database\Seeders\Scouting\FootballMatchSeeder;
use Database\Seeders\Scouting\PlayerRiskSeeder;
use Database\Seeders\Scouting\PlayerSourceSeeder;
use Database\Seeders\Scouting\RecruitmentNeedSeeder;
use Database\Seeders\Scouting\ScoutAssignmentSeeder;
use Database\Seeders\Scouting\ScoutingPlayerPatchSeeder;
use Database\Seeders\Scouting\ScoutingReportSeeder;
use Database\Seeders\Scouting\ShortlistSeeder;
use Illuminate\Database\Seeder;

/**
 * Content seeder — players, articles, staff, scouting cockpit demo data,
 * reference marketing fiches. Runs on `php artisan db:seed`.
 *
 * NOTE: the demo user accounts (admin@rene-football.test etc., all with
 * weak passwords baked into git history) live in {@see DemoAccountsSeeder}
 * and are NOT invoked here. To seed local demo accounts run:
 *     php artisan db:seed --class=DemoAccountsSeeder
 * In production the admin is created manually via tinker with a strong
 * password — see DEPLOYMENT.md §2.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Local dev convenience: auto-seed the demo accounts too so
        // `php artisan db:seed` in dev keeps working exactly as before.
        // In staging/prod this branch is skipped.
        if (app()->environment('local')) {
            $this->call(DemoAccountsSeeder::class);
        }

        // Core players + match history first - scouting seeders below depend on them.
        $this->call([
            PlayerSeeder::class,
            AppearanceSeeder::class,
            StaffSeeder::class,
            ArticleSeeder::class,
        ]);

        // Scouting cockpit demo data - order matters (DNA + needs first, then
        // matches, then reports/missions/shortlists, then risks/sources, and
        // finally the player patch so scores are recomputed against the full
        // demo state).
        $this->call([
            ClubDnaProfileSeeder::class,
            FootballMatchSeeder::class,
            RecruitmentNeedSeeder::class,
            ShortlistSeeder::class,
            ScoutingReportSeeder::class,
            ScoutAssignmentSeeder::class,
            PlayerRiskSeeder::class,
            PlayerSourceSeeder::class,
            ScoutingPlayerPatchSeeder::class,
        ]);

        // Reference marketing fiches - run AFTER the scouting patch so the
        // five reference players stay clean of demo-generated match stats /
        // scouting scores. Order matters: players first, presentations second.
        $this->call([
            FicheReferencePlayersSeeder::class,
            MarketingReferencePresentationSeeder::class,
        ]);
    }
}
