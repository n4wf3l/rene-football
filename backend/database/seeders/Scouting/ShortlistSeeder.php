<?php

namespace Database\Seeders\Scouting;

use App\Models\Player;
use App\Models\Scouting\RecruitmentNeed;
use App\Models\Scouting\Shortlist;
use App\Models\Scouting\ShortlistPlayer;
use App\Models\User;
use Illuminate\Database\Seeder;

class ShortlistSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('is_admin', true)->value('id');
        $needAilier = RecruitmentNeed::where('title', 'Ailier droit Pro été 2026')->first();
        $needMilieu = RecruitmentNeed::where('title', 'Milieu défensif U23 fin de mercato')->first();

        $sl1 = Shortlist::updateOrCreate(
            ['name' => 'Ailiers droits - pied gauche'],
            [
                'recruitment_need_id' => $needAilier?->id,
                'description' => 'Cibles ailiers droits pied gauche pour la fenêtre estivale.',
                'season' => '2026-2027',
                'status' => 'active',
                'created_by' => $adminId,
            ],
        );
        $sl2 = Shortlist::updateOrCreate(
            ['name' => 'Talents milieu défensif'],
            [
                'recruitment_need_id' => $needMilieu?->id,
                'description' => 'Profils prometteurs à coup de patte gauche.',
                'season' => '2026-2027',
                'status' => 'active',
                'created_by' => $adminId,
            ],
        );

        // sl1 - ailiers droits
        $entries1 = [
            ['slug' => 'nabil-sangare',  'stage' => 'shortlist_a', 'reason' => 'Profil cible - gauche dévastateur',                    'estimated_price' => 1800000, 'risk_level' => 'moyen', 'confidence_score' => 72, 'next_action' => 'Approche officielle'],
            ['slug' => 'ousmane-camara', 'stage' => 'shortlist_b', 'reason' => 'Bonus polyvalence couloirs',                            'estimated_price' => 1200000, 'risk_level' => 'moyen', 'confidence_score' => 64, 'next_action' => 'Compléter dossier médical'],
            ['slug' => 'hamzath-mohamadou','stage' => 'watchlist', 'reason' => 'Pari long terme, à suivre 2 saisons',                  'estimated_price' => 400000,  'risk_level' => 'eleve', 'confidence_score' => 58, 'next_action' => 'Observer en U19 internationale'],
            ['slug' => 'karim-toure',    'stage' => 'valide',      'reason' => 'Sécurité - déjà sous mandat agence',                  'estimated_price' => 2500000, 'risk_level' => 'faible','confidence_score' => 86, 'next_action' => 'Activer plan B si transfert OK'],
        ];

        foreach ($entries1 as $i => $e) {
            $player = Player::where('slug', $e['slug'])->first();
            if (! $player) continue;
            ShortlistPlayer::updateOrCreate(
                ['shortlist_id' => $sl1->id, 'player_id' => $player->id],
                [
                    'rank' => $i,
                    'stage' => $e['stage'],
                    'reason' => $e['reason'],
                    'next_action' => $e['next_action'],
                    'estimated_price' => $e['estimated_price'],
                    'risk_level' => $e['risk_level'],
                    'confidence_score' => $e['confidence_score'],
                ],
            );
        }

        // sl2 - milieux défensifs
        $entries2 = [
            ['slug' => 'adil-berkane',   'stage' => 'shortlist_a', 'reason' => 'Sentinelle confirmée Pro League',                     'estimated_price' => 1200000, 'risk_level' => 'faible','confidence_score' => 70],
            ['slug' => 'yanis-lefevre',  'stage' => 'shortlist_b', 'reason' => 'Jeune profil luxembourgeois en progression',           'estimated_price' => 600000,  'risk_level' => 'moyen', 'confidence_score' => 54],
            ['slug' => 'ayoub-el-bahri', 'stage' => 'watchlist',   'reason' => 'Profil intéressant à confirmer en équipe première',  'estimated_price' => 350000,  'risk_level' => 'moyen', 'confidence_score' => 50],
        ];

        foreach ($entries2 as $i => $e) {
            $player = Player::where('slug', $e['slug'])->first();
            if (! $player) continue;
            ShortlistPlayer::updateOrCreate(
                ['shortlist_id' => $sl2->id, 'player_id' => $player->id],
                [
                    'rank' => $i,
                    'stage' => $e['stage'],
                    'reason' => $e['reason'],
                    'estimated_price' => $e['estimated_price'],
                    'risk_level' => $e['risk_level'],
                    'confidence_score' => $e['confidence_score'],
                ],
            );
        }
    }
}
