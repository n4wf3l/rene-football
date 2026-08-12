<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Player;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Populate the /actualites page with plausible agency-style content.
 *
 * Idempotent: each article is upserted by slug so re-running the seeder
 * doesn't create duplicates. When a player slug is present in the roster,
 * the article is linked via `player_id`; otherwise the reference stays
 * standalone (the schema tolerates a null player_id).
 */
class ArticleSeeder extends Seeder
{
    public function run(): void
    {
        // Slug lookup so authors can reference existing roster players.
        // If a slug is missing (fresh install seeded with a different roster),
        // the article stays player-less rather than failing hard.
        $players = Player::query()->get(['id', 'slug'])->keyBy('slug');

        $now = Carbon::now();

        $articles = [
            [
                'slug'         => 'mercato-hiver-batomi-anderlecht',
                'title'        => "Mercato d'hiver : Batomi Zoran-Mawel, l'étincelle Anderlechtoise",
                'excerpt'      => "Notre jeune attaquant sous les couleurs du Sporting a marqué les esprits en pré-formation. Retour sur trois mois d'accélération.",
                'category'     => 'Mercato',
                'featured'     => true,
                'player_slug'  => 'batomi-zoran-mawel',
                'published_at' => $now->copy()->subDays(3),
                'cover_url'    => 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Trois mois. C'est le temps qu'il aura fallu à Batomi pour s'imposer comme l'une des révélations les plus scrutées du centre de formation d'Anderlecht. Notre équipe d'accompagnement a suivi de près chaque étape.

**Ce qui a changé** : après un travail spécifique sur le jeu dos au but et la conduite serrée, Batomi enchaîne aujourd'hui débordement, une-deux et frappe piquée avec une propreté rare pour son âge. Les cellules recruteuses des grands clubs d'Europe centrale sont à l'affût.

Notre rôle chez Rene Football : structurer sa progression sans brûler les étapes, choisir les partenaires d'entraînement, et préparer la prochaine échéance en toute sérénité avec sa famille.
MD,
            ],
            [
                'slug'         => 'talents-a-suivre-hiver-2026',
                'title'        => 'Cinq talents à suivre cet hiver dans notre roster',
                'excerpt'      => "Sélection maison : les jeunes que nos scouts ont mis en avant sur les trois derniers mois. Profils, tendances, projections.",
                'category'     => 'Talents',
                'featured'     => true,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(9),
                'cover_url'    => 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
La sélection tourne autour d'un principe simple : croiser régularité en compétition, marge de progression physique, et mentalité en dehors du terrain. Voici les cinq noms qui remontent le plus souvent dans les échanges avec nos partenaires clubs.

Chaque profil est présenté avec ses forces, son cadre familial, et la prochaine étape prévue par la cellule de recrutement. La liste évoluera semaine après semaine — l'objectif n'est pas de figer un classement mais d'ouvrir la discussion.
MD,
            ],
            [
                'slug'         => 'coulisses-suivi-familial-anderlecht',
                'title'        => 'Coulisses : comment on suit une famille sur toute une saison',
                'excerpt'      => "Ce que fait vraiment un agent pour une famille de jeune joueur, au-delà des projecteurs. Une semaine type détaillée.",
                'category'     => 'Coulisses',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(14),
                'cover_url'    => 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Un lundi de janvier commence rarement sur le terrain. Il commence au téléphone : point médical avec le staff, coordination scolaire, brief famille sur la semaine à venir. Le foot vient après.

Ce que nous mesurons chez Rene Football : quantité et qualité du sommeil, charge d'entraînement, ambiance familiale, rythme de croissance. Autant de facteurs qui pèsent bien plus que les statistiques du week-end sur la trajectoire d'un jeune joueur.
MD,
            ],
            [
                'slug'         => 'profils-milieu-relais-marche-europeen',
                'title'        => "Profils : le milieu relais, poste sous-coté du marché européen",
                'excerpt'      => "Analyse froide : le n°8 boîte-à-tout-faire reste sous-évalué financièrement alors que sa demande explose côté DS.",
                'category'     => 'Profils',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(21),
                'cover_url'    => 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Sur les vingt derniers mercatos de top 5, le milieu box-to-box reste le poste où le décalage prix / impact est le plus favorable pour les acheteurs. Notre lecture croise les données Wyscout et les remontées terrain de notre réseau.

Trois profils qui pourraient bouger cet été sont détaillés en fin d'article. Le fil rouge : capacité à couvrir 12 km / match, propreté technique sous pression, et intelligence défensive dans les demi-espaces.
MD,
            ],
            [
                'slug'         => 'agence-rentree-2026-methode',
                'title'        => "Rentrée 2026 : notre méthode d'accompagnement, expliquée simplement",
                'excerpt'      => "Trois piliers, une équipe, zéro promesse creuse. Ce que vous pouvez vraiment attendre de nous côté joueur, côté famille, côté club.",
                'category'     => 'Agence',
                'featured'     => true,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(31),
                'cover_url'    => 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Notre méthode tient en trois piliers. **1. Un accompagnement à quatre mains** — l'agent principal + un membre de la cellule éducative — parce qu'un jeune joueur n'est jamais qu'un athlète. **2. Une intelligence data en interne** — nos scouts croisent leur œil terrain avec des benchmarks position × âge — pour éviter les biais. **3. Un réseau club maîtrisé** — pas de mise en concurrence tapageuse, mais un dialogue direct avec les DS que nous connaissons personnellement.

L'objectif reste le même depuis le premier jour : construire une trajectoire durable. Aucune promesse chiffrée avant validation de la famille et du club actuel.
MD,
            ],
            [
                'slug'         => 'mercato-anticipations-ete-2026',
                'title'        => 'Mercato été 2026 : ce que nos partenaires clubs nous demandent déjà',
                'excerpt'      => "Retour sur les postes prioritaires exprimés par nos DS partenaires pour la fenêtre estivale : ce qui monte, ce qui saute.",
                'category'     => 'Mercato',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(42),
                'cover_url'    => 'https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Sur les douze demandes formalisées par nos DS partenaires pour l'été à venir, trois postes reviennent quasi systématiquement : latéral gauche moderne (offensif), n°6 récupérateur / relanceur, avant-centre pivot 21-24 ans. Le marché des ailiers rapides se refroidit — trop de dossiers concurrents, prix qui explosent.

Notre lecture : privilégier les shortlists qualitatives (max 6 noms par poste) plutôt que la mise en concurrence de vingt profils. Un DS n'a pas plus de temps qu'avant, il a moins.
MD,
            ],
            [
                'slug'         => 'talents-defense-jeunesse-belge',
                'title'        => 'La défense belge en pleine relève : un état des lieux',
                'excerpt'      => "Cinq centraux belges de moins de 21 ans ont fait exploser leur temps de jeu en Pro League cette saison. Que faut-il en retenir ?",
                'category'     => 'Talents',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(58),
                'cover_url'    => 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Les profils récurrents partagent trois traits : impact aérien précoce, vitesse de replacement au-dessus de la moyenne ligue, capacité à jouer les lignes de passe adverses. Le débat de la relance sous pression, lui, reste ouvert — trop tôt pour trancher.

Notre suivi terrain se concentre sur trois centraux qui, à notre sens, gagneraient à être associés à un mentor expérimenté dans leur prochain club.
MD,
            ],
            [
                'slug'         => 'coulisses-transition-club-agent',
                'title'        => "Coulisses : la transition club → agent d'un jeune, sans casse",
                'excerpt'      => "Rejoindre une agence à 16 ans n'est pas anodin. Trois précautions que nous prenons pour que la famille reste au centre.",
                'category'     => 'Coulisses',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(70),
                'cover_url'    => 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Trois précautions maison. **Un** : jamais de contrat avant une rencontre en présentiel avec les parents. **Deux** : période d'observation de trois mois sans mandat exclusif — le joueur et sa famille testent la relation. **Trois** : un point trimestriel obligatoire pour reconfirmer la trajectoire, avec option de sortie sans frais.

Cette approche coûte plus de temps qu'un signature-first à l'américaine, mais elle protège la famille sur le long terme — et c'est la seule chose qui compte.
MD,
            ],
            [
                'slug'         => 'agence-partenariat-club-formation',
                'title'        => "Partenariat renouvelé avec un club formateur de première division",
                'excerpt'      => "Trois ans de plus. Ce que ce partenariat change concrètement pour les jeunes que nous accompagnons.",
                'category'     => 'Agence',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(89),
                'cover_url'    => 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Le partenariat couvre l'accès prioritaire à des stages d'observation pour nos jeunes, un dialogue formalisé avec le staff pédagogique du club, et un cadre juridique adapté aux mineurs sous mandat.

Aucune contrepartie financière n'a été négociée. Le partenariat est structuré autour d'un objectif partagé : professionnaliser l'accompagnement des jeunes profils sur la période 15-19 ans, considérée comme la plus déterminante pour la construction d'une carrière durable.
MD,
            ],
            [
                'slug'         => 'profils-lecture-heatmap-attaquants',
                'title'        => 'Profils : comment lire vraiment une heatmap d\'attaquant',
                'excerpt'      => "Une heatmap n'est pas une image, c'est une lecture. Trois erreurs classiques que nous voyons souvent, et comment les éviter.",
                'category'     => 'Profils',
                'featured'     => false,
                'player_slug'  => null,
                'published_at' => $now->copy()->subDays(102),
                'cover_url'    => 'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?auto=format&fit=crop&w=1400&q=80',
                'content'      => <<<'MD'
Erreur 1 : conclure sur l'intensité d'une zone sans regarder la fréquence des matchs observés. Une heatmap n'est fiable qu'à partir de dix matchs sur poste stable.

Erreur 2 : confondre zone de touches et zone de finition. Un attaquant peut toucher souvent le ballon dans le demi-espace gauche et scorer surtout dans l'axe — la heatmap seule ne le dit pas.

Erreur 3 : ignorer le contexte tactique. Le même joueur dans un 4-3-3 et dans un 3-5-2 produit deux heatmaps radicalement différentes. Cross-referencing avec les données xG et xA reste indispensable.
MD,
            ],
        ];

        foreach ($articles as $row) {
            $playerId = null;
            if (! empty($row['player_slug']) && isset($players[$row['player_slug']])) {
                $playerId = $players[$row['player_slug']]->id;
            }

            Article::updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'title'        => $row['title'],
                    'excerpt'      => $row['excerpt'],
                    'content'      => $row['content'],
                    'category'     => $row['category'],
                    'cover_url'    => $row['cover_url'],
                    'featured'     => $row['featured'],
                    'player_id'    => $playerId,
                    'is_published' => true,
                    'published_at' => $row['published_at'],
                ],
            );
        }
    }
}
