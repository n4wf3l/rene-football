<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Content migration: publishes the news article about Abakar Mahamat-Abba
 * playing with the Standard de Liège U23 (SL16 FC) against Union
 * Saint-Gilloise on 15/11/2026. No cover photo yet: the site shows the RF
 * mark until the agency adds one from the admin.
 *
 * Idempotent (created once) and skipped under tests.
 */
return new class extends Migration
{
    private const SLUG = 'abakar-mahamat-abba-u23-standard-de-liege';
    private const PLAYER = 'abakar-abba';

    public function up(): void
    {
        if (app()->environment('testing')) return;
        if (DB::table('articles')->where('slug', self::SLUG)->exists()) return;

        $content = implode("\n\n", [
            'Né le 6 novembre 2009, Abakar Mahamat-Abba poursuit sa formation au sein de l\'académie du Standard de Liège. Évoluant principalement avec les U18, il participe régulièrement au championnat national de sa catégorie. Lors de la saison 2026-2027, le jeune attaquant dispute notamment sept rencontres de championnat, cumulant 630 minutes de jeu avant cette nouvelle étape dans son parcours.',
            'Ce dimanche 15 novembre, Mahamat-Abba a l\'occasion de se mesurer à un niveau supérieur en intégrant les U23 du Standard pour leur confrontation avec l\'Union Saint-Gilloise. Disputée au SL16 Football Campus, à Angleur, cette rencontre de la treizième journée de Division 1 ACFF se solde par une défaite des Liégeois (0-3). Les Unionistes, deuxièmes du championnat à l\'issue de la journée, confirment leur bonne dynamique.',
            'Au-delà du résultat collectif, cette opportunité représente une étape dans la progression de Mahamat-Abba, qui découvre les exigences d\'un championnat disputé face à des joueurs plus âgés et expérimentés. Son intégration ponctuelle au groupe U23 lui permet de poursuivre son apprentissage au sein de la structure de formation du Standard, avec l\'objectif de progresser vers les niveaux supérieurs du football belge.',
        ]);

        DB::table('articles')->insert([
            'slug'         => self::SLUG,
            'title'        => 'À seulement 17 ans, Abakar Mahamat-Abba franchit une nouvelle étape avec les U23 du Standard de Liège',
            'excerpt'      => 'Habituellement pensionnaire des U18 du Standard de Liège, le jeune attaquant Abakar Mahamat-Abba a été appelé à évoluer avec le SL16 FC, l\'équipe U23 du club liégeois, à l\'occasion de la rencontre face à l\'Union Saint-Gilloise disputée ce dimanche 15 novembre 2026. Une étape importante dans le parcours du jeune joueur.',
            'content'      => $content,
            'category'     => 'Talents',
            'cover_url'    => null,
            'featured'     => false,
            'player_id'    => DB::table('players')->where('slug', self::PLAYER)->value('id'),
            'is_published' => true,
            'published_at' => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        // Only removes the article if nobody has touched it since.
        DB::table('articles')->where('slug', self::SLUG)->whereNull('cover_url')->delete();
    }
};
