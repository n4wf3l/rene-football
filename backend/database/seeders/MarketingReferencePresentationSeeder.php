<?php

namespace Database\Seeders;

use App\Models\Player;
use App\Models\Presentation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Seeds one "Marketing v1" presentation per reference player so the demo
 * roster ships with the exact same fiches the agency uses in production.
 * Options mirror what's visible on each PNG (theme, photo side, motto,
 * partner blocks, academies grid, gallery, etc.) so the generator can
 * reproduce the printed fiches identically.
 */
class MarketingReferencePresentationSeeder extends Seeder
{
    public function run(): void
    {
        $author = User::where('email', 'admin@rene-football.test')->first();
        $authorId = $author?->id;

        $academiesFour = [
            ['country' => 'Angleterre', 'country_code' => 'gb', 'clubs' => [
                ['name' => 'Arsenal'], ['name' => 'Chelsea'],
                ['name' => 'Manchester City'], ['name' => 'Manchester United'],
            ]],
            ['country' => 'Pays-Bas', 'country_code' => 'nl', 'clubs' => [
                ['name' => 'PSV Eindhoven'], ['name' => 'Ajax Amsterdam'],
                ['name' => 'Feyenoord'],
            ]],
            ['country' => 'Allemagne', 'country_code' => 'de', 'clubs' => [
                ['name' => 'Borussia Dortmund'], ['name' => 'Bayern Munich'],
                ['name' => 'Bayer Leverkusen'],
            ]],
            ['country' => 'Portugal', 'country_code' => 'pt', 'clubs' => [
                ['name' => 'Benfica'], ['name' => 'Sporting CP'], ['name' => 'FC Porto'],
            ]],
        ];

        $academiesFive = array_merge(
            [$academiesFour[0]],
            [[
                'country' => 'Espagne', 'country_code' => 'es', 'clubs' => [
                    ['name' => 'FC Barcelona'], ['name' => 'Real Madrid'],
                    ['name' => 'Atlético Madrid'], ['name' => 'Sevilla FC'], ['name' => 'Valencia CF'],
                ],
            ]],
            array_slice($academiesFour, 1),
        );

        $wnrsUk = ['name' => 'WNRS Sport', 'country' => 'Angleterre', 'country_code' => 'gb'];
        $wnrsAgencyDest = ['name' => 'RENEFOOTBALL', 'description' => 'Un accompagnement global : gestion de carrière, suivi sportif, scolaire et personnel pour faire émerger le meilleur potentiel.'];

        $fiches = [
            //
            // 1. Zoran-Mawel Batomi (violet — photo right, Caractéristiques)
            //
            'zoran-mawel-batomi' => [
                'title'   => 'Fiche Zoran-Mawel Batomi',
                'options' => [
                    'theme'            => 'violet',
                    'photo_side'       => 'right',
                    'tagline'          => 'PROPULSEUR DE TALENTS',
                    'middle_variant'   => 'profile-caracteristiques',
                    'show_watermark'   => false,
                    'slogan_cursive'   => "L'AVENIR S'ÉCRIT MAINTENANT",
                    'motto'            => 'Le talent fait la différence, le travail réalise les rêves',
                    'contact' => [
                        'instagram' => 'RENEFOOTBALL.COM',
                        'email'     => 'renefootball.p@gmail.com',
                        'phone'     => '+352 691 712 574',
                    ],
                ],
            ],

            //
            // 2. Camara Philan (navy — photo right, Projet sportif dominant)
            //
            'camara-philan' => [
                'title'   => 'Fiche Camara Philan',
                'options' => [
                    'theme'          => 'navy',
                    'photo_side'     => 'right',
                    'tagline'        => 'PROPULSEUR DE TALENTS',
                    'middle_variant' => 'profile-strengths',
                    'show_watermark' => false,
                    'projet_intro'   => "Représenté par l'agence RENEFOOTBALL en collaboration avec l'agence WNRS SPORT basé en Angleterre. Ouverture & accompagnement vers les plus grandes académies européennes.",
                    'partner_academies' => [
                        ['country' => 'Angleterre', 'country_code' => 'gb', 'clubs' => [
                            ['name' => 'Arsenal'], ['name' => 'Chelsea'],
                            ['name' => 'Manchester City'], ['name' => 'Manchester United'],
                        ]],
                        ['country' => 'Pays-Bas', 'country_code' => 'nl', 'clubs' => [
                            ['name' => 'PSV Eindhoven'], ['name' => 'Ajax Amsterdam'], ['name' => 'Feyenoord'],
                        ]],
                        ['country' => 'Allemagne', 'country_code' => 'de', 'clubs' => [
                            ['name' => 'Borussia Dortmund'], ['name' => 'Bayern Munich'], ['name' => 'Bayer Leverkusen'],
                        ]],
                        ['country' => 'Portugal', 'country_code' => 'pt', 'clubs' => [
                            ['name' => 'Benfica'], ['name' => 'Sporting CP'], ['name' => 'FC Porto'],
                        ]],
                    ],
                    'supervised_by' => $wnrsUk,
                    'contact' => [
                        'instagram' => 'renefootball.com',
                        'email'     => 'renefootball.p@gmail.com',
                        'phone'     => '+352 691 712 574',
                    ],
                ],
            ],

            //
            // 3. Saeed Adams (black-gold — English, player profile bars)
            //
            'saeed-adams' => [
                'title'   => 'Saeed Adams marketing fiche',
                'options' => [
                    'theme'          => 'black-gold',
                    'photo_side'     => 'right',
                    'language'       => 'en',
                    'tagline'        => 'PROPULSEUR DE TALENT',
                    'middle_variant' => 'profile-strengths',
                    'show_watermark' => true,
                    'projet_intro'   => 'Represented by RENEFOOTBALL in collaboration with WNRS SPORT (UK). Opportunities in top academies across Europe.',
                    'partner_academies' => [
                        ['country' => 'England',     'country_code' => 'gb', 'clubs' => [
                            ['name' => 'Arsenal'], ['name' => 'Chelsea'],
                            ['name' => 'Manchester City'], ['name' => 'Manchester United'],
                        ]],
                        ['country' => 'Netherlands', 'country_code' => 'nl', 'clubs' => [
                            ['name' => 'PSV Eindhoven'], ['name' => 'Ajax Amsterdam'], ['name' => 'Feyenoord'],
                        ]],
                        ['country' => 'Germany',     'country_code' => 'de', 'clubs' => [
                            ['name' => 'Borussia Dortmund'], ['name' => 'Bayern Munich'], ['name' => 'Bayer Leverkusen'],
                        ]],
                        ['country' => 'Portugal',    'country_code' => 'pt', 'clubs' => [
                            ['name' => 'Benfica'], ['name' => 'Sporting CP'], ['name' => 'FC Porto'],
                        ]],
                    ],
                    'player_profile_bars' => [
                        ['label' => 'Speed',     'pct' => 90],
                        ['label' => 'Technique', 'pct' => 85],
                        ['label' => 'Finishing', 'pct' => 88],
                        ['label' => 'Dribbling', 'pct' => 87],
                        ['label' => 'Strength',  'pct' => 83],
                        ['label' => 'Work rate', 'pct' => 92],
                    ],
                    'motto' => 'Discipline · Work · Passion · Success',
                    'contact' => [
                        'instagram' => 'www.renefootball.com',
                        'email'     => 'renefootball.p@gmail.com',
                        'phone'     => '+32 691 712 574',
                    ],
                ],
            ],

            //
            // 4. Destiny Megogo (black-gold — French, 5 country grid)
            //
            'destiny-megogo' => [
                'title'   => 'Fiche Destiny Megogo',
                'options' => [
                    'theme'          => 'black-gold',
                    'photo_side'     => 'left',
                    'tagline'        => 'AGENCE DE JOUEURS',
                    'middle_variant' => 'profile-strengths',
                    'show_watermark' => true,
                    'projet_intro'   => "Supervisé par l'agence WNRS SPORT (Angleterre) en collaboration avec l'agence RENEFOOTBALL, Destiny bénéficie d'un accompagnement personnalisé pour atteindre le plus haut niveau. Ouvertures vers les plus grandes académies et clubs en Europe :",
                    'partner_academies' => $academiesFive,
                    'supervised_by'  => $wnrsUk,
                    'partner_agency' => $wnrsAgencyDest,
                    'slogan_cursive' => "Notre vision, ton avenir. Ensemble vers l'élite.",
                    'contact' => [
                        'instagram' => 'RENEFOOTBALL',
                        'email'     => 'info@renefootball.com',
                        'phone'     => '+352 691 44 24 61',
                    ],
                ],
            ],

            //
            // 5. Hanibal Tesfegabir Solomon (black-yellow — Parcours + Qualités)
            //
            'hanibal-tesfegabir-solomon' => [
                'title'   => 'Fiche Hanibal Tesfegabir Solomon',
                'options' => [
                    'theme'          => 'black-yellow',
                    'photo_side'     => 'right',
                    'tagline'        => '',
                    'header_motto'   => 'Respect · Ambition · Excellence',
                    'middle_variant' => 'parcours-strengths',
                    'show_watermark' => false,
                    'projet_intro'   => "Chez RENEFOOTBALL, notre mission est d'accompagner Hanibal dans son développement et de l'ouvrir aux plus grands clubs européens.",
                    'partner_academies' => [
                        ['country' => "Intégration dans des académies d'élite", 'country_code' => 'gb', 'clubs' => [
                            ['name' => 'Arsenal'], ['name' => 'Chelsea'],
                            ['name' => 'Manchester City'], ['name' => 'Manchester United'],
                        ]],
                        ['country' => 'Clubs Néerlandais', 'country_code' => 'nl', 'clubs' => [
                            ['name' => 'PSV Eindhoven'], ['name' => 'Ajax Amsterdam'], ['name' => 'Feyenoord'],
                        ]],
                        ['country' => 'Allemagne', 'country_code' => 'de', 'clubs' => [
                            ['name' => 'Borussia Dortmund'], ['name' => 'Bayern Munich'], ['name' => 'Bayer Leverkusen'],
                        ]],
                        ['country' => 'Portugal', 'country_code' => 'pt', 'clubs' => [
                            ['name' => 'Benfica'], ['name' => 'Sporting CP'], ['name' => 'FC Porto'],
                        ]],
                    ],
                    'partner_agency' => ['name' => 'WNRS Sport', 'description' => 'Partenariat stratégique - notre partenaire exclusif en Angleterre.'],
                    'contact' => [
                        'instagram' => '@renefootball',
                        'email'     => 'renefootball.agency@gmail.com',
                        'phone'     => '+352 621 640 640',
                    ],
                ],
            ],
        ];

        foreach ($fiches as $slug => $data) {
            $player = Player::where('slug', $slug)->first();
            if (! $player) continue;

            Presentation::updateOrCreate(
                ['player_id' => $player->id, 'template_key' => 'marketing'],
                [
                    'title'        => $data['title'],
                    'options'      => $data['options'],
                    'is_published' => true,
                    'public_token' => Str::random(40),
                    'generated_at' => now(),
                    'created_by'   => $authorId,
                ],
            );
        }
    }
}
