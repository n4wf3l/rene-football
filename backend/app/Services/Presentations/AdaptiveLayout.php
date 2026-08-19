<?php

namespace App\Services\Presentations;

use App\Models\Player;

/**
 * Adaptive layout hints for the PDF templates.
 *
 * Each template renders the same recurring blocks (Points forts, Physique,
 * Comparaisons, Bio) but can pick different *variants* per block to keep
 * the whole document on one A4 page — never spilling to a page 2 (hard
 * requirement) and never leaving big empty vertical gaps.
 *
 * The service reads the player's content signals (bio length, strengths
 * count, physique data present, comparisons count) and returns a hint map
 * the template consumes. No JS, no rendering pass — pure heuristics that
 * work inside DomPDF.
 *
 * Variant vocabulary:
 *   row   — compact horizontal band (chips row, tuiles rangée). Small footprint.
 *   grid  — 2-3 column grid. Medium footprint.
 *   stack — vertical list with icons. Big footprint, fills empty column.
 *   skip  — nothing rendered (no data at all).
 *
 * The `richness` score (0-100) is exposed so templates can also tweak
 * global spacing / font sizes when the player is very sparse or packed.
 */
class AdaptiveLayout
{
    /**
     * @return array{
     *   richness:            int,
     *   bio_variant:         'compact'|'full'|'skip',
     *   strengths_variant:   'row'|'grid'|'stack'|'skip',
     *   physique_variant:    'row'|'grid2'|'stack'|'skip',
     *   comparisons_variant: 'row'|'stack'|'skip',
     * }
     */
    public static function hintsFor(Player $player): array
    {
        $bio               = trim((string) ($player->bio ?? ''));
        $bioLen            = mb_strlen($bio);
        $strengthsCount    = self::strengthsCount($player);
        $physiqueCount     = self::physiqueCount($player);
        $comparisonsCount  = self::comparisonsCount($player);

        // 0-100 fill score. Anchored so a "typical" filled dossier lands
        // around 55-65 and a nearly-empty one lands under 20.
        $richness = (int) round(min(100.0,
              ($bioLen           / 350) * 30
            + ($strengthsCount   * 5)
            + ($physiqueCount    * 6)
            + ($comparisonsCount * 8)
        ));

        // Base variants purely from cardinality of each block.
        $strengths = match (true) {
            $strengthsCount === 0     => 'skip',
            $strengthsCount <= 2      => 'row',
            $strengthsCount <= 5      => 'grid',
            default                   => 'stack',
        };

        $physique = match (true) {
            $physiqueCount === 0      => 'skip',
            $physiqueCount === 1      => 'row',
            $physiqueCount === 2      => 'row',
            $physiqueCount === 3      => 'row',
            default                   => 'row',   // 4 tiles fit a row nicely
        };

        $comparisons = match (true) {
            $comparisonsCount === 0   => 'skip',
            $comparisonsCount === 1   => 'row',
            $comparisonsCount === 2   => 'row',
            default                   => 'stack',
        };

        $bioVar = match (true) {
            $bioLen === 0             => 'skip',
            $bioLen <= 180            => 'compact',
            default                   => 'full',
        };

        // Second pass: when the dossier is sparse (richness < 35), we
        // *promote* the blocks we still have to their expanded variant so
        // they visually fill the page instead of leaving vertical gaps.
        if ($richness < 35) {
            if ($strengths === 'row' && $strengthsCount > 0)   $strengths   = 'stack';
            if ($strengths === 'grid' && $strengthsCount > 0)  $strengths   = 'stack';
            if ($physique  === 'row' && $physiqueCount >= 2)   $physique    = 'grid2';
            if ($comparisons === 'row' && $comparisonsCount > 0) $comparisons = 'stack';
            if ($bioVar === 'compact')                          $bioVar      = 'full';
        }

        // Third pass: when the dossier is packed (richness > 75), we
        // *demote* any variant back to its compact form so nothing spills
        // to a second page.
        if ($richness > 75) {
            if ($strengths === 'stack' && $strengthsCount <= 6)  $strengths   = 'grid';
            if ($comparisons === 'stack' && $comparisonsCount <= 2) $comparisons = 'row';
        }

        return [
            'richness'            => $richness,
            'bio_variant'         => $bioVar,
            'strengths_variant'   => $strengths,
            'physique_variant'    => $physique,
            'comparisons_variant' => $comparisons,
        ];
    }

    private static function strengthsCount(Player $player): int
    {
        if (! is_array($player->strengths)) return 0;
        $n = 0;
        foreach ($player->strengths as $s) {
            $label = is_array($s) && isset($s['label']) ? (string) $s['label'] : (is_string($s) ? $s : '');
            if (trim($label) !== '') $n++;
        }
        return $n;
    }

    private static function physiqueCount(Player $player): int
    {
        return (int) ($player->distance_avg_km         !== null)
             + (int) ($player->top_speed_kmh           !== null)
             + (int) ($player->sprints_avg             !== null)
             + (int) ($player->high_intensity_runs_avg !== null);
    }

    private static function comparisonsCount(Player $player): int
    {
        if (! is_array($player->comparisons)) return 0;
        $n = 0;
        foreach ($player->comparisons as $c) {
            $name = is_array($c) && isset($c['name']) ? (string) $c['name'] : (is_string($c) ? $c : '');
            if (trim($name) !== '') $n++;
        }
        return $n;
    }
}
