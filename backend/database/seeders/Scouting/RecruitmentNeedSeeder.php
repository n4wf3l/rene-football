<?php

namespace Database\Seeders\Scouting;

use App\Models\Scouting\RecruitmentNeed;
use App\Models\User;
use Illuminate\Database\Seeder;

class RecruitmentNeedSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('is_admin', true)->value('id');

        $needs = [
            [
                'title' => 'Ailier droit Pro été 2026',
                'position' => 'Ailier droit',
                'priority' => 'haute',
                'season' => '2026-2027',
                'category' => 'Pro',
                'budget_min' => 800000,
                'budget_max' => 2500000,
                'age_min' => 18, 'age_max' => 25,
                'preferred_foot' => 'Gauche',
                'profile_description' => 'Ailier droit pied gauche, capable de rentrer dans l\'axe et de finir. Bon dans le pressing haut.',
                'required_attributes' => [
                    ['key' => 'dribble', 'label' => 'Dribble en 1v1', 'weight' => 3],
                    ['key' => 'finition', 'label' => 'Finition coup de patte', 'weight' => 3],
                    ['key' => 'pressing', 'label' => 'Pressing offensif', 'weight' => 2],
                ],
                'status' => 'actif',
            ],
            [
                'title' => 'Milieu défensif U23 fin de mercato',
                'position' => 'Milieu défensif',
                'priority' => 'moyenne',
                'season' => '2026-2027',
                'category' => 'U23',
                'budget_min' => 200000,
                'budget_max' => 800000,
                'age_min' => 17, 'age_max' => 22,
                'preferred_foot' => 'Droit',
                'profile_description' => 'Sentinelle moderne, jeu de relance court et long, lecture défensive.',
                'required_attributes' => [
                    ['key' => 'relance', 'label' => 'Relance sous pression', 'weight' => 3],
                    ['key' => 'lecture', 'label' => 'Lecture du jeu', 'weight' => 2],
                ],
                'status' => 'actif',
            ],
            [
                'title' => 'Gardien backup expérimenté',
                'position' => 'Gardien',
                'priority' => 'basse',
                'season' => '2026-2027',
                'category' => 'Pro',
                'budget_min' => 100000,
                'budget_max' => 500000,
                'age_min' => 28, 'age_max' => 35,
                'preferred_foot' => 'Droit',
                'profile_description' => 'Profil expérimenté, leader vestiaire, jeu au pied solide.',
                'status' => 'en_pause',
            ],
        ];

        foreach ($needs as $n) {
            RecruitmentNeed::updateOrCreate(
                ['title' => $n['title']],
                array_merge($n, ['created_by' => $adminId]),
            );
        }
    }
}
