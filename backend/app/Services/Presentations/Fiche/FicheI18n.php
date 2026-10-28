<?php

namespace App\Services\Presentations\Fiche;

/**
 * Fixed labels printed on the premium fiches, in the four document
 * languages the editor offers. Free-form content typed by the agency (bio,
 * tagline, project intro, club names…) is printed as entered.
 */
final class FicheI18n
{
    public const LANGUAGES = ['fr', 'en', 'de', 'nl'];

    private const L = [
        // Identity
        'born'            => ['fr' => 'Né le',            'en' => 'Born',             'de' => 'Geboren',          'nl' => 'Geboren'],
        'age'             => ['fr' => 'Âge',              'en' => 'Age',              'de' => 'Alter',            'nl' => 'Leeftijd'],
        'years_old'       => ['fr' => '%d ans',           'en' => '%d yrs',           'de' => '%d Jahre',         'nl' => '%d jaar'],
        'nationality'     => ['fr' => 'Nationalité',      'en' => 'Nationality',      'de' => 'Nationalität',     'nl' => 'Nationaliteit'],
        'position'        => ['fr' => 'Poste',            'en' => 'Position',         'de' => 'Position',         'nl' => 'Positie'],
        'club'            => ['fr' => 'Club actuel',      'en' => 'Current club',     'de' => 'Aktueller Verein', 'nl' => 'Huidige club'],
        'foot'            => ['fr' => 'Pied fort',        'en' => 'Preferred foot',   'de' => 'Starker Fuß',      'nl' => 'Voorkeursvoet'],
        'height'          => ['fr' => 'Taille',           'en' => 'Height',           'de' => 'Größe',            'nl' => 'Lengte'],
        'languages'       => ['fr' => 'Langues',          'en' => 'Languages',        'de' => 'Sprachen',         'nl' => 'Talen'],
        'agency'          => ['fr' => 'Agence',           'en' => 'Agency',           'de' => 'Agentur',          'nl' => 'Agentschap'],
        'came_from'       => ['fr' => 'Vient de',         'en' => 'Joined from',      'de' => 'Kam von',          'nl' => 'Kwam van'],
        'current'         => ['fr' => 'Actuel',           'en' => 'Current',          'de' => 'Aktuell',          'nl' => 'Huidig'],

        // Sections
        'profile'         => ['fr' => 'Profil du joueur', 'en' => 'Player profile',   'de' => 'Spielerprofil',    'nl' => 'Spelersprofiel'],
        'analysis'        => ['fr' => 'Analyse',          'en' => 'Analysis',         'de' => 'Analyse',          'nl' => 'Analyse'],
        'strengths'       => ['fr' => 'Points forts',     'en' => 'Strengths',        'de' => 'Stärken',          'nl' => 'Sterke punten'],
        'qualities'       => ['fr' => 'Qualités',         'en' => 'Qualities',        'de' => 'Qualitäten',       'nl' => 'Kwaliteiten'],
        'characteristics' => ['fr' => 'Caractéristiques', 'en' => 'Characteristics',  'de' => 'Merkmale',         'nl' => 'Kenmerken'],
        'playing_style'   => ['fr' => 'Style de jeu',     'en' => 'Playing style',    'de' => 'Spielstil',        'nl' => 'Speelstijl'],
        'best_position'   => ['fr' => 'Meilleur poste',   'en' => 'Best position',    'de' => 'Beste Position',   'nl' => 'Beste positie'],
        'mental'          => ['fr' => 'Mental',           'en' => 'Mentality',        'de' => 'Mentalität',       'nl' => 'Mentaliteit'],
        'objective'       => ['fr' => 'Objectif',         'en' => 'Ambition',         'de' => 'Ziel',             'nl' => 'Doel'],
        'career'          => ['fr' => 'Parcours',         'en' => 'Career path',      'de' => 'Werdegang',        'nl' => 'Loopbaan'],
        'project'         => ['fr' => 'Projet sportif',   'en' => 'Sporting project', 'de' => 'Sportliches Projekt', 'nl' => 'Sportief project'],
        'targets'         => ['fr' => 'Objectifs',        'en' => 'Targets',          'de' => 'Ziele',            'nl' => 'Doelen'],
        'supervised_by'   => ['fr' => 'Supervisé par',    'en' => 'Supervised by',    'de' => 'Betreut von',      'nl' => 'Begeleid door'],
        'partner'         => ['fr' => 'En collaboration avec', 'en' => 'In partnership with', 'de' => 'In Zusammenarbeit mit', 'nl' => 'In samenwerking met'],
        'player_profile'  => ['fr' => 'Profil athlétique', 'en' => 'Athletic profile', 'de' => 'Athletisches Profil', 'nl' => 'Atletisch profiel'],
        'key_stats'       => ['fr' => 'Statistiques',     'en' => 'Statistics',       'de' => 'Statistiken',      'nl' => 'Statistieken'],
        'physical'        => ['fr' => 'Données physiques', 'en' => 'Physical data',   'de' => 'Athletikdaten',    'nl' => 'Fysieke data'],
        'heatmap'         => ['fr' => "Zones d'influence", 'en' => 'Areas of influence', 'de' => 'Einflusszonen', 'nl' => 'Invloedszones'],
        'comparisons'     => ['fr' => 'Profil comparable', 'en' => 'Comparable profile', 'de' => 'Vergleichbares Profil', 'nl' => 'Vergelijkbaar profiel'],
        'potential'       => ['fr' => 'Potentiel',        'en' => 'Potential',        'de' => 'Potenzial',        'nl' => 'Potentieel'],
        'gallery'         => ['fr' => 'En images',        'en' => 'In pictures',      'de' => 'In Bildern',       'nl' => 'In beeld'],
        'scan'            => ['fr' => 'Scannez',          'en' => 'Scan',             'de' => 'Scannen',          'nl' => 'Scan'],
        'more'            => ['fr' => '+%d autres',       'en' => '+%d more',         'de' => '+%d weitere',      'nl' => '+%d meer'],
        'source'          => ['fr' => 'Source : %s',      'en' => 'Source: %s',       'de' => 'Quelle: %s',       'nl' => 'Bron: %s'],

        // Document eyebrows
        'doc_signature'   => ['fr' => 'Présentation joueur', 'en' => 'Player presentation', 'de' => 'Spielerpräsentation', 'nl' => 'Spelerspresentatie'],
        'doc_scouting'    => ['fr' => 'Rapport de scouting', 'en' => 'Scouting report',     'de' => 'Scouting-Bericht',    'nl' => 'Scoutingrapport'],
        'doc_career'      => ['fr' => 'Parcours & potentiel', 'en' => 'Career & potential', 'de' => 'Werdegang & Potenzial', 'nl' => 'Loopbaan & potentieel'],
        'edited_on'       => ['fr' => 'Édité le %s',      'en' => 'Issued %s',        'de' => 'Erstellt am %s',   'nl' => 'Opgesteld op %s'],
        'confidential'    => ['fr' => 'Document confidentiel', 'en' => 'Confidential document', 'de' => 'Vertrauliches Dokument', 'nl' => 'Vertrouwelijk document'],

        // Values
        'foot_droit'      => ['fr' => 'Droit',            'en' => 'Right',            'de' => 'Rechts',           'nl' => 'Rechts'],
        'foot_gauche'     => ['fr' => 'Gauche',           'en' => 'Left',             'de' => 'Links',            'nl' => 'Links'],
        'foot_ambidextre' => ['fr' => 'Ambidextre',       'en' => 'Two-footed',       'de' => 'Beidfüßig',        'nl' => 'Tweebenig'],
        'cat_gardien'     => ['fr' => 'Gardien',          'en' => 'Goalkeeper',       'de' => 'Torwart',          'nl' => 'Doelman'],
        'cat_defenseur'   => ['fr' => 'Défenseur',        'en' => 'Defender',         'de' => 'Verteidiger',      'nl' => 'Verdediger'],
        'cat_milieu'      => ['fr' => 'Milieu',           'en' => 'Midfielder',       'de' => 'Mittelfeldspieler', 'nl' => 'Middenvelder'],
        'cat_attaquant'   => ['fr' => 'Attaquant',        'en' => 'Forward',          'de' => 'Stürmer',          'nl' => 'Aanvaller'],

        // Stats
        'st_matches_played'     => ['fr' => 'Matchs',            'en' => 'Matches',         'de' => 'Spiele',           'nl' => 'Wedstrijden'],
        'st_minutes_played'     => ['fr' => 'Minutes',           'en' => 'Minutes',         'de' => 'Minuten',          'nl' => 'Minuten'],
        'st_goals'              => ['fr' => 'Buts',              'en' => 'Goals',           'de' => 'Tore',             'nl' => 'Doelpunten'],
        'st_assists'            => ['fr' => 'Passes décisives',  'en' => 'Assists',         'de' => 'Vorlagen',         'nl' => 'Assists'],
        'st_xg'                 => ['fr' => 'xG',                'en' => 'xG',              'de' => 'xG',               'nl' => 'xG'],
        'st_xa'                 => ['fr' => 'xA',                'en' => 'xA',              'de' => 'xA',               'nl' => 'xA'],
        'st_key_passes'         => ['fr' => 'Passes clés',       'en' => 'Key passes',      'de' => 'Schlüsselpässe',   'nl' => 'Sleutelpasses'],
        'st_pass_accuracy'      => ['fr' => '% passes',          'en' => 'Pass %',          'de' => 'Pass %',           'nl' => 'Pass %'],
        'st_shots_on_target'    => ['fr' => 'Tirs cadrés',       'en' => 'Shots on target', 'de' => 'Schüsse aufs Tor', 'nl' => 'Schoten op doel'],
        'st_dribbles_completed' => ['fr' => 'Dribbles réussis',  'en' => 'Dribbles',        'de' => 'Dribblings',       'nl' => 'Dribbels'],
        'st_tackles'            => ['fr' => 'Tacles',            'en' => 'Tackles',         'de' => 'Tacklings',        'nl' => 'Tackles'],
        'st_interceptions'      => ['fr' => 'Interceptions',     'en' => 'Interceptions',   'de' => 'Abfangaktionen',   'nl' => 'Onderscheppingen'],
        'st_duels_won'          => ['fr' => 'Duels gagnés',      'en' => 'Duels won',       'de' => 'Gewonnene Duelle', 'nl' => 'Duels gewonnen'],
        'st_yellow_cards'       => ['fr' => 'Cartons jaunes',    'en' => 'Yellow cards',    'de' => 'Gelbe Karten',     'nl' => 'Gele kaarten'],
        'st_clean_sheets'       => ['fr' => 'Clean sheets',      'en' => 'Clean sheets',    'de' => 'Zu-null-Spiele',   'nl' => 'Clean sheets'],
        'st_saves'              => ['fr' => 'Arrêts',            'en' => 'Saves',           'de' => 'Paraden',          'nl' => 'Reddingen'],

        // Physical
        'phy_distance'    => ['fr' => 'Km / match',        'en' => 'Km / match',       'de' => 'Km / Spiel',       'nl' => 'Km / wedstrijd'],
        'phy_top_speed'   => ['fr' => 'Vitesse max',       'en' => 'Top speed',        'de' => 'Topspeed',         'nl' => 'Topsnelheid'],
        'phy_sprints'     => ['fr' => 'Sprints / match',   'en' => 'Sprints / match',  'de' => 'Sprints / Spiel',  'nl' => 'Sprints / wedstrijd'],
        'phy_hir'         => ['fr' => 'Courses intenses',  'en' => 'High-intensity runs', 'de' => 'Intensivläufe', 'nl' => 'Intensieve runs'],
    ];

    private const MONTHS = [
        'fr' => ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        'en' => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'de' => ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        'nl' => ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    ];

    public function __construct(public readonly string $lang = 'fr')
    {
    }

    public static function for(?string $lang): self
    {
        return new self(in_array($lang, self::LANGUAGES, true) ? $lang : 'fr');
    }

    public function t(string $key, mixed ...$args): string
    {
        $s = self::L[$key][$this->lang] ?? self::L[$key]['fr'] ?? $key;
        return $args ? sprintf($s, ...$args) : $s;
    }

    public function has(string $key): bool
    {
        return isset(self::L[$key]);
    }

    public function date(\DateTimeInterface $d): string
    {
        $day   = (int) $d->format('j');
        $month = self::MONTHS[$this->lang][(int) $d->format('n') - 1];
        $year  = $d->format('Y');
        return match ($this->lang) {
            'en'    => "$day $month $year",
            'de'    => "$day. $month $year",
            default => "$day $month $year",
        };
    }

    public function number(float $value, int $decimals = 0): string
    {
        return $this->lang === 'en'
            ? number_format($value, $decimals, '.', ',')
            : number_format($value, $decimals, ',', "\u{202F}");
    }

    public function foot(?string $raw): ?string
    {
        return match ($raw) {
            'Droit'      => $this->t('foot_droit'),
            'Gauche'     => $this->t('foot_gauche'),
            'Ambidextre' => $this->t('foot_ambidextre'),
            null, ''     => null,
            default      => $raw,
        };
    }

    public function category(?string $raw): ?string
    {
        return match ($raw) {
            'Gardien'                => $this->t('cat_gardien'),
            'Defenseur', 'Défenseur' => $this->t('cat_defenseur'),
            'Milieu'                 => $this->t('cat_milieu'),
            'Attaquant'              => $this->t('cat_attaquant'),
            null, ''                 => null,
            default                  => $raw,
        };
    }
}
