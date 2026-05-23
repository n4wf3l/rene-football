<?php

namespace Database\Seeders;

use App\Models\StaffMember;
use Illuminate\Database\Seeder;

class StaffSeeder extends Seeder
{
    /**
     * Seed the 4 default team members that used to live hardcoded in
     * AProposPage.tsx. updateOrCreate by slug so re-seeding doesn't dup rows.
     */
    public function run(): void
    {
        $rows = [
            [
                'slug' => 'helene-marchetti',
                'name' => 'Hélène Marchetti',
                'role' => 'Fondatrice · Agent FIFA',
                'bio'  => "Passée par la direction sportive d'un club professionnel belge avant de fonder l'agence à Luxembourg en 2010.",
            ],
            [
                'slug' => 'renald-dubois',
                'name' => 'Rénald Dubois',
                'role' => 'Conseiller juridique · Droit du sport',
                'bio'  => "Avocat spécialisé en droit du sport. Sécurise transferts, prolongations et droits à l'image.",
            ],
            [
                'slug' => 'jerome-allegre',
                'name' => 'Jérôme Allègre',
                'role' => 'Responsable scouting',
                'bio'  => "20 ans dans le scouting professionnel. Coordonne un réseau de 12 scouts à travers l'Europe.",
            ],
            [
                'slug' => 'fatou-sow',
                'name' => 'Fatou Sow',
                'role' => 'Communication & relations médias',
                'bio'  => "Encadre la communication des joueurs, forme à la prise de parole et gère les relations presse.",
            ],
        ];

        foreach ($rows as $i => $row) {
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
