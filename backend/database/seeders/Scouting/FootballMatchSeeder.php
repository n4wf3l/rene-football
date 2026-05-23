<?php

namespace Database\Seeders\Scouting;

use App\Models\Scouting\FootballMatch;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class FootballMatchSeeder extends Seeder
{
    public function run(): void
    {
        $matches = [
            ['kickoff_at' => Carbon::now()->subDays(3)->setTime(20, 0), 'competition' => 'Bundesliga',  'season' => '2025-2026', 'home_team' => 'Borussia Dortmund', 'away_team' => 'RB Leipzig',       'category' => 'Pro', 'venue' => 'Signal Iduna Park, Dortmund', 'score_home' => 2, 'score_away' => 1, 'status' => 'played'],
            ['kickoff_at' => Carbon::now()->subDays(1)->setTime(18, 30),'competition' => 'Pro League',  'season' => '2025-2026', 'home_team' => 'KRC Genk',         'away_team' => 'Royal Antwerp',     'category' => 'Pro', 'venue' => 'Cegeka Arena, Genk',          'score_home' => 0, 'score_away' => 0, 'status' => 'played'],
            ['kickoff_at' => Carbon::now()->addDays(2)->setTime(20, 0), 'competition' => 'Eredivisie',  'season' => '2025-2026', 'home_team' => 'FC Twente',         'away_team' => 'AZ Alkmaar',        'category' => 'Pro', 'venue' => 'De Grolsch Veste, Enschede',  'status' => 'scheduled', 'notes' => 'Match Eredivisie de référence - benchmark Pro.'],
            ['kickoff_at' => Carbon::now()->addDays(5)->setTime(15, 0), 'competition' => 'Jupiler Pro Youth',  'season' => '2025-2026', 'home_team' => 'KV Mechelen U21',  'away_team' => 'Club Brugge U21',    'category' => 'U19', 'venue' => 'AFAS Stadion, Mechelen',      'status' => 'scheduled', 'notes' => 'Mission scout junior - observer Adams Saeed (ailier droit / pointe).'],
        ];

        foreach ($matches as $m) {
            FootballMatch::firstOrCreate(
                ['home_team' => $m['home_team'], 'away_team' => $m['away_team'], 'kickoff_at' => $m['kickoff_at']],
                $m,
            );
        }
    }
}
