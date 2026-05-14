<?php

namespace Database\Seeders;

use App\Models\User;
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
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@rene-football.test'],
            [
                'name' => 'Admin Rene',
                'password' => Hash::make('admin1234'),
                'is_admin' => true,
            ]
        );

        // Core players + match history first — scouting seeders below depend on them.
        $this->call([
            PlayerSeeder::class,
            AppearanceSeeder::class,
        ]);

        // Scouting cockpit demo data — order matters (DNA + needs first, then
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
    }
}
