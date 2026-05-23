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
        // Owner / super-admin - covers everything, default fallback for routing.
        User::updateOrCreate(
            ['email' => 'admin@rene-football.test'],
            [
                'name' => 'Admin Rene',
                'password' => Hash::make('admin1234'),
                'is_admin' => true,
                'is_head_of_scouting' => false,
                'scouting_scope' => null,
            ]
        );

        // Chef de recrutement - destinataire par défaut des rapports Pro.
        // Mot de passe : chef1234
        User::updateOrCreate(
            ['email' => 'chef@rene-football.test'],
            [
                'name' => 'Léa Chef-Recrutement',
                'password' => Hash::make('chef1234'),
                'is_admin' => true,
                'is_head_of_scouting' => true,
                'scouting_scope' => ['Pro'],
            ]
        );

        // Responsable jeunes - destinataire des rapports U19 et U23.
        // Mot de passe : youth1234
        User::updateOrCreate(
            ['email' => 'jeunes@rene-football.test'],
            [
                'name' => 'Marc Resp-Jeunes',
                'password' => Hash::make('youth1234'),
                'is_admin' => true,
                'is_head_of_scouting' => true,
                'scouting_scope' => ['U19', 'U23'],
            ]
        );

        // Scout terrain - auteur des rapports, pas validateur.
        // Mot de passe : scout1234
        User::updateOrCreate(
            ['email' => 'scout@rene-football.test'],
            [
                'name' => 'Sam Scout',
                'password' => Hash::make('scout1234'),
                'is_admin' => true,
                'is_head_of_scouting' => false,
                'scouting_scope' => null,
            ]
        );

        // Core players + match history first - scouting seeders below depend on them.
        $this->call([
            PlayerSeeder::class,
            AppearanceSeeder::class,
            StaffSeeder::class,
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
    }
}
