<?php

namespace Database\Seeders;

use App\Models\StaffMember;
use Illuminate\Database\Seeder;

/**
 * Staff seeder — real team, in display order.
 *
 * Legacy demo profiles (Hélène Marchetti, Rénald Dubois, Jérôme Allègre,
 * Fatou Sow) are deleted defensively on every seed run so a legacy DB
 * gets cleaned up too.
 *
 * Bios are intentionally left null — the admin adds them via /admin/staff
 * so we don't invent copy for real people.
 */
class StaffSeeder extends Seeder
{
    private const LEGACY_DEMO_SLUGS = [
        'helene-marchetti',
        'renald-dubois',
        'jerome-allegre',
        'fatou-sow',
    ];

    public function run(): void
    {
        StaffMember::whereIn('slug', self::LEGACY_DEMO_SLUGS)->delete();

        // Career for the founder — real timeline verified with him.
        $reneCareer = [
            [
                'period'      => '2009 — 2016',
                'title'       => 'Championnat portugais',
                'description' => 'Grupo Desportivo de Ribeirã, Associação Desportiva Limianos, Sporting Clube de Espinho, FC Gandomar.',
            ],
            [
                'period'      => '2008 — 2010',
                'title'       => 'Compétitions internationales',
                'description' => 'Élimination CAN Junior, Jeux Olympiques à Beijing, CAN Junior.',
            ],
            [
                'period'      => '2008',
                'title'       => 'Prix AJSB',
                'description' => 'Élu meilleur sportif de l\'année 2008 au Burkina Faso par l\'Association des Journalistes Sportifs.',
            ],
        ];

        // Role-descriptive bios — deliberately generic (no invented years,
        // employers or credentials) so nothing on the public page misrepresents
        // real people. The admin edits these via /admin/staff to add
        // personal detail.
        $team = [
            [
                'slug'  => 'rene-jacob-yougbare',
                'name'  => 'René Jacob Yougbaré',
                'role'  => 'Fondateur',
                'bio'   => "Ancien footballeur passé par le championnat portugais (2009-2016) et les compétitions internationales (CAN Junior, Jeux Olympiques 2008), élu meilleur sportif de l'année 2008 au Burkina Faso. Il fonde Rene Football pour transformer son expérience du terrain en un accompagnement structuré au service des jeunes joueurs.",
                'career_entries' => $reneCareer,
            ],
            [
                'slug'  => 'benedicte-yougbare',
                'name'  => 'Bénédicte Yougbaré',
                'role'  => 'Coordinatrice Générale',
                'bio'   => "Coordonne l'activité quotidienne de l'agence : suivi des mandats, gestion administrative, planification des rendez-vous famille / club et lien entre les joueurs, leur entourage et le pôle sportif.",
                'career_entries' => null,
            ],
            [
                'slug'  => 'liman',
                'name'  => 'Liman',
                'role'  => 'Responsable médias',
                'bio'   => "En charge de la présence médiatique et de l'image des joueurs : relations presse, coordination des interviews, contenus réseaux sociaux et production vidéo autour du parcours de chaque profil.",
                'career_entries' => null,
            ],
            [
                'slug'  => 'patrick-raus',
                'name'  => 'Patrick Raus',
                'role'  => 'Préparateur physique',
                'bio'   => "Accompagne les joueurs sur leur préparation physique individualisée : programmes de reprise, développement de la puissance et de l'explosivité, prévention des blessures et suivi entre les cycles de compétition.",
                'career_entries' => null,
            ],
            [
                'slug'  => 'nawfel-ajari',
                'name'  => 'Nawfel Ajari',
                'role'  => 'Développeur fullstack',
                'bio'   => "Conçoit et maintient l'infrastructure digitale de Rene Football : site public, back-office admin, générateur de fiches PDF et outils internes de scouting.",
                'career_entries' => null,
            ],
        ];

        foreach ($team as $i => $row) {
            StaffMember::updateOrCreate(
                ['slug' => $row['slug']],
                array_merge($row, [
                    'sort_order'   => $i,
                    'is_published' => true,
                ]),
            );
        }
    }
}
