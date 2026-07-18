<?php

namespace App\Services\Analysis;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * Internal analysis dossier for a single player.
 *
 * Not to be confused with the marketing presentation PDFs (Signature /
 * Stadium / Classic / ...): this document is meant for internal use by the
 * agency's sporting direction — it's dense, sober, data-first. Content:
 *
 *   - Identity strip (photo + name + provenance)
 *   - Benchmark table (metric | value | avg | elite | vs_elite bar)
 *   - Physical tiles (distance, top speed, sprints, HIRs)
 *   - Heatmap (reuses the base template PNG generator)
 *   - Strengths + comparisons + scout bio
 *
 * The report reuses the same base helpers as the presentation templates
 * (photo frame, heatmap PNG, escape) via a lightweight sub-class of
 * PresentationTemplate so those routines stay in one place.
 */
class PlayerAnalysisReport extends PresentationTemplate
{
    public static function key(): string   { return 'analysis'; }
    public static function label(): string { return 'Dossier analyse'; }
    public static function description(): string { return 'Rapport interne dense pour la direction sportive.'; }

    public function render(Player $player, array $options = [], string $title = ''): string
    {
        $accent    = '#0f5132';
        $secondary = '#78716c';
        $text      = '#0c0a09';
        $bg        = '#fafaf9';

        $photo      = $this->pickPhoto($player, $options);
        $photoHtml  = $this->photoFrame($photo, $options + ['photo_fit' => 'cover'], $secondary);
        $benchmark  = Benchmarks::playerReport($player);
        $tier       = Benchmarks::tierForAge($player->age);
        $phyRows    = $this->physiqueRows($player);
        $strengths  = $this->strengthsList($player, 8);
        $comparisons = is_array($player->comparisons) ? array_slice($player->comparisons, 0, 3) : [];

        // ---------- Header + identity ----------
        $sourceLabels = [
            'manual' => 'Manuelle', 'csv' => 'CSV', 'xlsx' => 'Excel',
            'wyscout' => 'Wyscout', 'instat' => 'Instat',
            'club_official' => 'Club officiel', 'observed' => 'Scout',
            'seed' => 'Demo',
        ];
        $srcLabel = $sourceLabels[$player->stats_source ?? ''] ?? 'Non tracée';
        $srcDate  = $player->stats_updated_at
            ? $player->stats_updated_at->format('d/m/Y')
            : '—';
        $srcRel   = $player->stats_reliability ?? '—';

        $identityRows = [
            ['Âge',         ((int) $player->age).' ans'],
            ['Poste',       $player->position ?: '—'],
            ['Catégorie',   $player->category ?: '—'],
            ['Taille',      $player->height ?: '—'],
            ['Pied fort',   $player->preferred_foot ?: '—'],
            ['Club',        $player->club ?: '—'],
            ['Depuis',      $player->since ?: '—'],
            ['Nationalité', $player->nationality ?: '—'],
            ['Potentiel',   $player->potential_rating
                ? number_format((float) $player->potential_rating, 1, ',', '').'/10'.($player->potential_label ? ' · '.$player->potential_label : '')
                : '—'],
        ];
        $identityHtml = '';
        foreach ($identityRows as [$k, $v]) {
            $identityHtml .= '<tr><td class="ikey">'.$this->esc($k).'</td><td class="ival">'.$this->esc((string) $v).'</td></tr>';
        }

        // ---------- Benchmark table ----------
        $benchmarkHtml = '';
        if (empty($benchmark)) {
            $benchmarkHtml = '<p class="dim">Aucun profil de référence défini pour ce poste × tranche d\'âge.</p>';
        } else {
            $rows = '';
            $labels = [
                'goals' => 'Buts / match', 'assists' => 'P. déc. / match', 'xg' => 'xG / match', 'xa' => 'xA / match',
                'shots_on_target' => 'Tirs cadrés / match', 'key_passes' => 'Passes clés / match',
                'pass_accuracy' => '% passes', 'dribbles_completed' => 'Dribbles / match',
                'tackles' => 'Tacles / match', 'interceptions' => 'Interceptions / match',
                'duels_won' => 'Duels gagnés / match', 'clean_sheets' => 'Clean sheets / match',
                'saves' => 'Arrêts / match', 'distance_avg_km' => 'Km / match', 'top_speed_kmh' => 'Vitesse max',
            ];
            uasort($benchmark, fn ($a, $b) => $b['vs_elite'] <=> $a['vs_elite']);
            foreach ($benchmark as $metric => $m) {
                $pctElite = max(0.0, min(100.0, (float) $m['vs_elite']));
                $tone = $pctElite >= 85 ? $accent : ($pctElite >= 60 ? '#059669' : ($pctElite >= 30 ? '#d97706' : '#e11d48'));
                $vsAvgStr = ($m['vs_avg'] >= 0 ? '+' : '').number_format((float) $m['vs_avg'], 0, ',', '').'%';
                $rows .= '<tr>'
                    .'<td class="mkey">'.$this->esc($labels[$metric] ?? $metric).'</td>'
                    .'<td class="mval">'.$this->esc((string) $m['value']).'</td>'
                    .'<td class="mavg">'.$this->esc((string) $m['avg']).'</td>'
                    .'<td class="melite">'.$this->esc((string) $m['elite']).'</td>'
                    .'<td class="mbar"><div class="bar"><div class="bar-fill" style="width:'.$pctElite.'%; background:'.$tone.';"></div></div></td>'
                    .'<td class="mpct" style="color:'.$tone.';">'.$vsAvgStr.'</td>'
                    .'</tr>';
            }
            $benchmarkHtml = '<table class="bench">'
                .'<thead><tr>'
                .'<th class="mkey">Métrique</th>'
                .'<th class="mval">Joueur</th>'
                .'<th class="mavg">Moyenne</th>'
                .'<th class="melite">Elite</th>'
                .'<th class="mbar">Positionnement (vs elite)</th>'
                .'<th class="mpct">vs avg</th>'
                .'</tr></thead>'
                .'<tbody>'.$rows.'</tbody></table>';
        }

        // ---------- Physique ----------
        $physiqueHtml = '';
        if (! empty($phyRows)) {
            $tiles = '';
            $phyLabels = [
                'phy_distance' => 'Km / match', 'phy_top_speed' => 'Vitesse max',
                'phy_sprints' => 'Sprints / match', 'phy_hir' => 'Courses HI / match',
            ];
            foreach ($phyRows as [$key, $value]) {
                $tiles .= '<td class="phy-tile">'
                    .'<div class="phy-val">'.$this->esc($value).'</div>'
                    .'<div class="phy-lbl">'.$this->esc($phyLabels[$key] ?? $key).'</div>'
                    .'</td>';
            }
            $physiqueHtml = '<table class="phy"><tr>'.$tiles.'</tr></table>';
        }

        // ---------- Heatmap ----------
        $heatmap = $this->heatmapHtml($player, ['show_heatmap' => true]);

        // ---------- Strengths ----------
        $strengthsHtml = '';
        if (! empty($strengths)) {
            $items = '';
            foreach ($strengths as $s) {
                $items .= '<li>'.$this->esc($s).'</li>';
            }
            $strengthsHtml = '<ul class="chips">'.$items.'</ul>';
        }

        // ---------- Comparisons ----------
        $comparisonsHtml = '';
        if (! empty($comparisons)) {
            $rows = '';
            foreach ($comparisons as $c) {
                if (! is_array($c)) continue;
                $cname = trim((string) ($c['name'] ?? ''));
                if ($cname === '') continue;
                $cclub = trim((string) ($c['club'] ?? ''));
                $rows .= '<tr><td class="cname">'.$this->esc($cname).'</td><td class="cclub">'.$this->esc($cclub).'</td></tr>';
            }
            if ($rows !== '') {
                $comparisonsHtml = '<table class="cmp">'.$rows.'</table>';
            }
        }

        // ---------- Bio ----------
        $bio = trim((string) $player->bio) !== ''
            ? nl2br($this->esc($player->bio))
            : (trim((string) $player->scout_quote) !== ''
                ? '« '.$this->esc($player->scout_quote).' »'
                : '<span class="dim">Aucune bio scout renseignée.</span>');

        $tierLabel = [
            'u18'=>'U18 (< 18)', 'u21'=>'U21 (18-20)', 'young'=>'Jeune (21-25)',
            'prime'=>'Prime (26-30)', 'vet'=>'Vétéran (31+)',
        ][$tier] ?? $tier;

        return <<<HTML
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><style>
  @page { margin: 12mm; }
  body { font-family: 'Helvetica', 'DejaVu Sans', sans-serif; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: 10pt; }

  /* Header */
  .head { border-bottom: 3px solid {$accent}; padding-bottom: 4mm; margin-bottom: 6mm; }
  .eyebrow { font-size: 7pt; letter-spacing: 3px; text-transform: uppercase; color: {$secondary}; }
  .title { font-size: 16pt; font-weight: 700; margin-top: 1mm; }
  .subtitle { font-size: 9pt; color: {$secondary}; margin-top: 1mm; }

  /* Provenance strip */
  .prov { display: table; width: 100%; margin-bottom: 6mm; border-collapse: collapse; }
  .prov-chip { display: table-cell; padding: 2mm 4mm; background: #ffffff; border: 1px solid #e7e5e4; font-size: 7.5pt; }
  .prov-chip strong { color: {$secondary}; letter-spacing: 1.5px; text-transform: uppercase; font-size: 6.5pt; display: block; margin-bottom: 0.5mm; }
  .prov-chip + .prov-chip { border-left: none; }

  /* Two-column top: photo + identity */
  .top { display: table; width: 100%; margin-bottom: 6mm; }
  .top-photo { display: table-cell; width: 40%; padding-right: 6mm; vertical-align: top; }
  .top-info  { display: table-cell; vertical-align: top; }
  .photo-box { position: relative; width: 100%; height: 70mm; overflow: hidden; border-radius: 3mm; background: {$secondary}; }
  .id-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .id-table td { padding: 1.5mm 0; border-bottom: 0.5px solid #e7e5e4; }
  .id-table td.ikey { color: {$secondary}; font-size: 7.5pt; letter-spacing: 1px; text-transform: uppercase; width: 40%; }
  .id-table td.ival { font-weight: 700; }

  /* Section titles */
  .sec-title { font-size: 7pt; letter-spacing: 3px; text-transform: uppercase; color: {$secondary}; margin: 6mm 0 2mm 0; font-weight: 700; }

  /* Benchmark table */
  .bench { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .bench th, .bench td { padding: 2mm 3mm; text-align: left; border-bottom: 0.5px solid #e7e5e4; }
  .bench th { font-size: 6.5pt; letter-spacing: 1.5px; text-transform: uppercase; color: {$secondary}; font-weight: 700; }
  .bench td.mval { font-weight: 700; font-size: 10pt; color: {$accent}; }
  .bench td.mavg, .bench td.melite { color: {$secondary}; font-size: 8pt; }
  .bench td.mpct { text-align: right; font-weight: 700; font-family: 'Courier New', monospace; }
  .bench td.mbar { width: 30mm; }
  .bar { width: 100%; height: 3mm; background: #e7e5e4; border-radius: 1.5mm; overflow: hidden; }
  .bar-fill { height: 100%; }

  /* Physique */
  .phy { width: 100%; border-collapse: separate; border-spacing: 2mm 0; margin-bottom: 4mm; }
  .phy-tile { text-align: center; padding: 3mm; background: #ffffff; border: 1px solid #e7e5e4; border-left: 3px solid {$accent}; }
  .phy-val { font-size: 14pt; font-weight: 700; color: {$accent}; line-height: 1; }
  .phy-lbl { font-size: 6.5pt; color: {$secondary}; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 1.5mm; }

  /* Heatmap */
  .heatmap-wrap { width: 100%; }

  /* Bottom grid: strengths | comparisons | bio */
  .bot { display: table; width: 100%; margin-top: 6mm; }
  .bot-col { display: table-cell; vertical-align: top; padding-right: 5mm; }
  .bot-col:last-child { padding-right: 0; }
  .chips { list-style: none; padding: 0; margin: 0; }
  .chips li { padding: 1.5mm 0; border-bottom: 0.5px solid #e7e5e4; font-size: 8.5pt; }
  .chips li:before { content: '• '; color: {$accent}; font-weight: 700; }
  .cmp { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .cmp td { padding: 1.5mm 0; border-bottom: 0.5px solid #e7e5e4; }
  .cmp .cname { font-weight: 600; }
  .cmp .cclub { text-align: right; color: {$secondary}; font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; }
  .bio { font-size: 9pt; line-height: 1.55; text-align: justify; }
  .dim { color: {$secondary}; font-style: italic; }

  .footer { border-top: 1px solid #e7e5e4; margin-top: 8mm; padding-top: 2mm; font-size: 6.5pt; color: {$secondary}; text-align: center; letter-spacing: 2px; text-transform: uppercase; }
</style></head><body>

<div class="head">
  <div class="eyebrow">Rene Football · Dossier analyse joueur · Interne</div>
  <div class="title">{$this->esc($player->name)}</div>
  <div class="subtitle">{$this->esc($player->position ?? '—')}{$this->esc($player->club ? ' · '.$player->club : '')}</div>
</div>

<table class="prov"><tr>
  <td class="prov-chip"><strong>Source stats</strong>{$this->esc($srcLabel)}</td>
  <td class="prov-chip"><strong>Dernière maj</strong>{$this->esc((string) $srcDate)}</td>
  <td class="prov-chip"><strong>Fiabilité</strong>{$this->esc((string) $srcRel)}/5</td>
  <td class="prov-chip"><strong>Profil de référence</strong>{$this->esc(($player->category ?? '').' · '.$tierLabel)}</td>
</tr></table>

<div class="top">
  <div class="top-photo">
    <div class="photo-box">{$photoHtml}</div>
  </div>
  <div class="top-info">
    <table class="id-table"><tbody>{$identityHtml}</tbody></table>
  </div>
</div>

<div class="sec-title">Benchmark position × âge</div>
{$benchmarkHtml}

HTML
        .($physiqueHtml !== ''
            ? '<div class="sec-title">Physique</div>'.$physiqueHtml
            : '')
        .($heatmap !== ''
            ? '<div class="sec-title">Zones d\'influence</div><div class="heatmap-wrap">'.$heatmap.'</div>'
            : '')
        .'
<div class="bot">
  <div class="bot-col" style="width:33%;">
    <div class="sec-title" style="margin-top:0;">Points forts</div>
    '.($strengthsHtml !== '' ? $strengthsHtml : '<p class="dim">Aucun point fort renseigné.</p>').'
  </div>
  <div class="bot-col" style="width:33%;">
    <div class="sec-title" style="margin-top:0;">Comparaisons</div>
    '.($comparisonsHtml !== '' ? $comparisonsHtml : '<p class="dim">Aucune comparaison renseignée.</p>').'
  </div>
  <div class="bot-col">
    <div class="sec-title" style="margin-top:0;">Bio scout</div>
    <div class="bio">'.$bio.'</div>
  </div>
</div>

<div class="footer">Rene Football · Confidentiel · '.now()->format('d/m/Y H:i').'</div>

</body></html>';
    }
}
