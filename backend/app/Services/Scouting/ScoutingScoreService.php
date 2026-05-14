<?php

namespace App\Services\Scouting;

use App\Models\Player;

/**
 * Recompute the family of "scouting scores" that summarise a player file.
 *
 * Strategy : when an explicit score (current/potential/club_fit/market/risk/
 * confidence) hasn't been set yet, fall back to a sensible default derived
 * from the existing stats so the cockpit always shows numbers (the user can
 * override later). `score_global` is a weighted blend with the risk score
 * inverted (= "low risk is good").
 */
class ScoutingScoreService
{
    public function __construct(private PlayerCompletenessService $completeness) {}

    /** Refresh and persist all scouting scores + completeness. */
    public function refresh(Player $player): void
    {
        $player->score_current     = $player->score_current     ?? $this->defaultCurrent($player);
        $player->score_potential   = $player->score_potential   ?? $this->defaultPotential($player);
        $player->score_club_fit    = $player->score_club_fit    ?? 60.0;
        $player->score_market      = $player->score_market      ?? 60.0;
        $player->score_risk        = $player->score_risk        ?? $this->defaultRisk($player);
        $player->score_confidence  = $player->score_confidence  ?? $this->defaultConfidence($player);
        $player->score_global      = $this->global($player);

        $check = $this->completeness->checklist($player);
        $player->completeness_pct = $check['percent'];

        $player->saveQuietly();
    }

    private function defaultCurrent(Player $p): float
    {
        // Loose proxy: pass_accuracy + match minutes density + cards penalty
        $base = (float) ($p->pass_accuracy ?? 0);
        $minutesBoost = min(20, ($p->minutes_played ?? 0) / 150);
        $penalty = ($p->yellow_cards ?? 0) * 0.5 + ($p->red_cards ?? 0) * 2;
        return max(0, min(100, $base + $minutesBoost - $penalty));
    }

    private function defaultPotential(Player $p): float
    {
        // From the manual potential_rating (0..10) → 0..100, plus a small youth bonus.
        $base = ((float) ($p->potential_rating ?? 7)) * 10;
        $youth = $p->age && $p->age < 23 ? 5 : 0;
        return max(0, min(100, $base + $youth));
    }

    private function defaultRisk(Player $p): float
    {
        // Higher is RISKIER. Aggregates risk rows + discipline.
        $rows = $p->risks()->count();
        $high = $p->risks()->where('impact', 'eleve')->count();
        $cards = ($p->yellow_cards ?? 0) + ($p->red_cards ?? 0) * 3;
        return max(0, min(100, ($rows * 8) + ($high * 12) + ($cards * 1.5) + 15));
    }

    private function defaultConfidence(Player $p): float
    {
        // Reports + scouts diversity + reliability_score baseline.
        $reports = $p->scoutingReports()->count();
        $scouts = $p->scoutingReports()->whereNotNull('scout_id')->distinct('scout_id')->count('scout_id');
        $baseline = (float) ($p->reliability_score ?? 35);
        return max(0, min(100, $baseline + ($reports * 6) + ($scouts * 7)));
    }

    private function global(Player $p): float
    {
        $current    = (float) $p->score_current;
        $potential  = (float) $p->score_potential;
        $clubFit    = (float) $p->score_club_fit;
        $market     = (float) $p->score_market;
        $confidence = (float) $p->score_confidence;
        // Risk inverted: 0 risk -> +100, 100 risk -> 0
        $riskInverse = 100 - (float) $p->score_risk;

        // Weights: current 0.28, potential 0.22, club_fit 0.18, market 0.10, confidence 0.12, risk_inv 0.10
        $blend = $current * 0.28
            + $potential * 0.22
            + $clubFit   * 0.18
            + $market    * 0.10
            + $confidence * 0.12
            + $riskInverse * 0.10;

        return round(max(0, min(100, $blend)), 1);
    }
}
