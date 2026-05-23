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

        // sl1 - ailiers droits (les demo pros nabil-sangare, ousmane-camara,
        // karim-toure ont été retirés du roster — seul Adams Saeed reste).
        $entries1 = [
            ['slug' => 'adams-saeed',    'stage' => 'shortlist_a', 'reason' => 'Bi-national Ghana / Pays-Bas - passeport UE - polyvalence striker / ailes', 'estimated_price' => 750000, 'risk_level' => 'moyen', 'confidence_score' => 66, 'next_action' => 'Observer en U21 vs Club Brugge'],
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
            ['slug' => 'ativie-megogo',  'stage' => 'shortlist_a', 'reason' => 'CB U17 espagnol trilingue - prêt Genk → Mönchengladbach', 'estimated_price' => 950000, 'risk_level' => 'moyen','confidence_score' => 68],
            ['slug' => 'abakar-abba',    'stage' => 'shortlist_b', 'reason' => 'Sentinelle U19 belge Standard - profil moderne à confirmer', 'estimated_price' => 800000,  'risk_level' => 'moyen', 'confidence_score' => 60],
            ['slug' => 'camara-philan',  'stage' => 'watchlist',   'reason' => 'Joueur U13 belge - projet long terme, à suivre 2-3 saisons',  'estimated_price' => 0,       'risk_level' => 'eleve', 'confidence_score' => 48],
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
