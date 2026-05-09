<?php

namespace Database\Seeders;

use App\Models\Appearance;
use App\Models\Player;
use Illuminate\Database\Seeder;

class AppearanceSeeder extends Seeder
{
    private const COMPETITIONS_BY_CLUB = [
        'Borussia Dortmund' => ['Bundesliga', 'DFB-Pokal', 'UEFA Champions League'],
        'Standard Liege'    => ['Jupiler Pro League', 'Coupe de Belgique'],
        'OGC Nice'          => ['Ligue 1', 'Coupe de France', 'UEFA Conference League'],
        'Servette FC'       => ['Super League', 'Coupe de Suisse'],
        'KRC Genk'          => ['Jupiler Pro League', 'Coupe de Belgique'],
        'Royal Antwerp'     => ['Jupiler Pro League', 'Coupe de Belgique'],
        'AS Monaco'         => ['Ligue 1', 'Coupe de France'],
        'FC Twente'         => ['Eredivisie', 'KNVB Beker'],
        'KAS Eupen'         => ['Challenger Pro League', 'Coupe de Belgique'],
        'RC Lens'           => ['Ligue 1', 'Coupe de France'],
        'Royale Union SG'   => ['Jupiler Pro League', 'UEFA Europa League'],
        'FC Bale'           => ['Super League', 'Coupe de Suisse'],
        'FC Metz'           => ['Ligue 1', 'Coupe de France'],
    ];

    private const OPPONENTS = [
        'Bundesliga'              => ['Bayern Munich', 'RB Leipzig', 'Bayer Leverkusen', 'VfB Stuttgart', 'Eintracht Francfort', 'Mönchengladbach', 'Werder Brême'],
        'Ligue 1'                 => ['PSG', 'Olympique Marseille', 'Olympique Lyonnais', 'LOSC Lille', 'Stade Rennais', 'Stade Brestois', 'RC Strasbourg'],
        'Jupiler Pro League'      => ['Club Bruges', 'Anderlecht', 'KAA Gent', 'Antwerp', 'Cercle Bruges', 'Westerlo', 'OH Leuven'],
        'Eredivisie'              => ['Ajax', 'PSV', 'Feyenoord', 'AZ Alkmaar', 'Utrecht', 'Heerenveen'],
        'Super League'            => ['Young Boys', 'FC Zurich', 'FC Lugano', 'FC Lucerne', 'Grasshopper', 'St-Gall'],
        'UEFA Champions League'   => ['Real Madrid', 'Manchester City', 'Inter Milan', 'PSG', 'Atletico Madrid'],
        'UEFA Europa League'      => ['Roma', 'Sporting CP', 'Olympiakos', 'Brighton'],
        'UEFA Conference League'  => ['Fiorentina', 'Aston Villa', 'PAOK Salonique'],
        'DFB-Pokal'               => ['VfL Bochum', 'FC Heidenheim', 'Karlsruher SC', 'St. Pauli'],
        'Coupe de Belgique'       => ['Beerschot', 'KV Mechelen', 'Standard B'],
        'Coupe de France'         => ['FC Annecy', 'Pau FC', 'Le Mans'],
        'KNVB Beker'              => ['ADO La Haye', 'NAC Breda'],
        'Coupe de Suisse'         => ['FC Sion', 'FC Aarau', 'FC Thoune'],
        'Challenger Pro League'   => ['Lommel', 'RWDM', 'Patro Eisden', 'Lierse'],
    ];

    public function run(): void
    {
        $players = Player::all();

        foreach ($players as $player) {
            // Wipe existing appearances for this player so reseeding is idempotent.
            $player->appearances()->delete();

            $count = max(5, min(8, intval($player->matches_played / 4)));
            $club = $player->club ?? 'FC Andrézieux';
            $competitions = self::COMPETITIONS_BY_CLUB[$club] ?? ['Ligue 1', 'Coupe de France'];

            $isKeeper = $player->category === 'Gardien';
            $isAttacker = $player->category === 'Attaquant';

            // Pseudo-random but stable per slug so reseeding gives the same data.
            $seed = crc32($player->slug);
            mt_srand($seed);

            $today = now();
            for ($i = 0; $i < $count; $i++) {
                $daysAgo = ($i * 7) + mt_rand(0, 3); // weekly cadence with jitter
                $matchDate = $today->copy()->subDays($daysAgo);

                $competition = $competitions[mt_rand(0, count($competitions) - 1)];
                $opponents = self::OPPONENTS[$competition] ?? ['Adversaire'];
                $opponent = $opponents[mt_rand(0, count($opponents) - 1)];
                $home = mt_rand(0, 1) === 1;

                $minutes = mt_rand(0, 100) < 80 ? mt_rand(75, 95) : mt_rand(15, 60);

                $goals = 0; $assists = 0; $shots = 0; $shotsOnTarget = 0;
                if (! $isKeeper) {
                    if ($isAttacker) {
                        $goals = mt_rand(0, 100) < 40 ? mt_rand(0, 2) : 0;
                        $shots = mt_rand(1, 5);
                    } else {
                        $goals = mt_rand(0, 100) < 12 ? 1 : 0;
                        $shots = mt_rand(0, 3);
                    }
                    $shotsOnTarget = max($goals, intval($shots * 0.45));
                    $assists = mt_rand(0, 100) < 25 ? mt_rand(0, 1) : 0;
                }

                $rating = round(6.0 + mt_rand(0, 30) / 10.0, 1); // 6.0 - 9.0
                if ($goals > 0) $rating = min(10.0, $rating + 0.5);
                if ($goals >= 2) $rating = min(10.0, $rating + 0.5);

                $scoreTeam = mt_rand(0, 4);
                $scoreOpp  = mt_rand(0, 4);

                Appearance::create([
                    'player_id'        => $player->id,
                    'match_date'       => $matchDate->toDateString(),
                    'competition'      => $competition,
                    'opponent'         => $opponent,
                    'home'             => $home,
                    'score_team'       => $scoreTeam,
                    'score_opponent'   => $scoreOpp,
                    'minutes_played'   => $minutes,
                    'goals'            => $goals,
                    'assists'          => $assists,
                    'shots'            => $shots,
                    'shots_on_target'  => $shotsOnTarget,
                    'yellow_card'      => mt_rand(0, 100) < 12,
                    'red_card'         => mt_rand(0, 100) < 2,
                    'rating'           => $rating,
                    'notes'            => null,
                ]);
            }
        }

        mt_srand(); // restore default randomness
    }
}
