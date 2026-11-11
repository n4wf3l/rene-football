<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;

class PlayerController extends Controller
{
    /** Metrics ranked by the public profile percentile bars. lower_is_better=true inverts the rank. */
    private const RANKABLE_METRICS = [
        'matches_played'      => false,
        'goals'               => false,
        'assists'             => false,
        'minutes_played'      => false,
        'shots_on_target'     => false,
        'xg'                  => false,
        'xa'                  => false,
        'key_passes'          => false,
        'pass_accuracy'       => false,
        'dribbles_completed'  => false,
        'tackles'             => false,
        'interceptions'       => false,
        'duels_won'           => false,
        'clean_sheets'        => false,
        'saves'               => false,
        'yellow_cards'        => true,
        'red_cards'           => true,
    ];

    /**
     * Fields the public profile is allowed to expose - an allow-list, so a
     * column added later (scouting scores, internal notes, contact data…)
     * stays private unless it is added here on purpose. Mirrors what
     * PlayerProfilePage renders; the exact date of birth is deliberately
     * left out (only the age is shown, and many players are minors).
     */
    public const PUBLIC_PROFILE_FIELDS = [
        'id', 'slug', 'name', 'age', 'height', 'position', 'best_position', 'category',
        'club', 'club_logo_url', 'nationality', 'secondary_nationality', 'preferred_foot',
        'since', 'photo_url', 'bio',
        'matches_played', 'goals', 'assists', 'minutes_played', 'shots', 'shots_on_target',
        'xg', 'xa', 'key_passes', 'pass_accuracy', 'dribbles_completed', 'tackles',
        'interceptions', 'duels_won', 'yellow_cards', 'red_cards', 'clean_sheets', 'saves',
        'stats_updated_at',
        'heatmap_grid', 'comparisons', 'strengths', 'potential_rating', 'potential_label', 'scout_quote',
        'distance_avg_km', 'sprints_avg', 'top_speed_kmh', 'high_intensity_runs_avg',
    ];

    /** Match-log columns shown in the public table (internal notes excluded). */
    private const PUBLIC_APPEARANCE_FIELDS = [
        'id', 'player_id', 'match_date', 'competition', 'opponent', 'home', 'score_team',
        'score_opponent', 'minutes_played', 'goals', 'assists', 'shots', 'shots_on_target', 'rating',
    ];

    /** Clip columns shown in the public galleries (notes and raw annotations excluded). */
    public const PUBLIC_CLIP_FIELDS = ['id', 'player_id', 'image_path', 'title', 'timestamp_seconds', 'video_source_label'];

    /**
     * Public roster listing.
     *
     * Returns ONLY the fields the public list pages actually render
     * (HomePage roster preview, /joueurs grid, Header mega menu, MercatoTicker).
     * The big JSON columns (heatmap_grid, comparisons, strengths, scout_quote,
     * bio, …) are deliberately NOT selected - they belong to the detail
     * endpoint. Reduces the payload from ~14 KB to ~2 KB for 7 players.
     *
     * A 60-second public HTTP cache is set so a browser reload / a second tab
     * doesn't refetch - the roster is stable on this timescale.
     */
    public function index(): JsonResponse
    {
        $players = Player::query()
            ->where('is_published', true)
            ->orderBy('name')
            ->get([
                'id', 'slug', 'name', 'age', 'height', 'position', 'category',
                'club', 'nationality', 'preferred_foot', 'since', 'photo_url',
                'matches_played', 'goals', 'assists', 'minutes_played',
                'shots_on_target', 'xg', 'xa', 'key_passes', 'pass_accuracy',
                'dribbles_completed', 'tackles', 'interceptions', 'duels_won',
                'yellow_cards', 'red_cards', 'clean_sheets', 'saves',
                'updated_at',
            ]);

        return response()->json(['data' => $players])
            ->header('Cache-Control', 'public, max-age=60');
    }

    public function show(Player $player): JsonResponse
    {
        abort_unless($player->is_published, 404);

        // Percentile rank within same-category published players.
        // We only need the metric columns + id/category for ranking, so we
        // select() to avoid loading heatmap_grid / comparisons / scout_quote
        // for every peer.
        $peers = Player::query()
            ->where('is_published', true)
            ->where('category', $player->category)
            ->get([
                'id', 'category', 'matches_played', 'goals', 'assists',
                'minutes_played', 'shots_on_target', 'xg', 'xa', 'key_passes',
                'pass_accuracy', 'dribbles_completed', 'tackles', 'interceptions',
                'duels_won', 'clean_sheets', 'saves', 'yellow_cards', 'red_cards',
            ]);

        $percentiles = $this->computePercentiles($peers, $player);

        // Last 8 appearances (most recent first).
        $appearances = $player->appearances()->limit(8)->get(self::PUBLIC_APPEARANCE_FIELDS);
        // Annotated frame clips (most recent first), public-safe metadata only.
        $clips = $player->clips()->limit(20)->get(self::PUBLIC_CLIP_FIELDS);

        return response()->json([
            'data' => $player->setVisible(self::PUBLIC_PROFILE_FIELDS),
            'percentiles' => $percentiles,
            'peers_count' => $peers->count(),
            'appearances' => $appearances,
            'clips' => $clips,
        ])->header('Cache-Control', 'public, max-age=30');
    }

    private function computePercentiles($peers, Player $self): array
    {
        $count = $peers->count();
        $out = [];
        if ($count < 2) {
            // No comparison possible - every metric is 50 by convention.
            foreach (self::RANKABLE_METRICS as $metric => $_) {
                $out[$metric] = 50.0;
            }
            return $out;
        }

        foreach (self::RANKABLE_METRICS as $metric => $lowerIsBetter) {
            $selfVal = (float) ($self->{$metric} ?? 0);
            $beaten = 0;
            foreach ($peers as $peer) {
                if ($peer->id === $self->id) continue;
                $v = (float) ($peer->{$metric} ?? 0);
                $isBetter = $lowerIsBetter ? ($v > $selfVal) : ($v < $selfVal);
                if ($isBetter) $beaten++;
            }
            $out[$metric] = round(($beaten / ($count - 1)) * 100, 1);
        }
        return $out;
    }
}
