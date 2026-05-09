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

    public function index(): JsonResponse
    {
        $players = Player::query()
            ->where('is_published', true)
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $players]);
    }

    public function show(Player $player): JsonResponse
    {
        abort_unless($player->is_published, 404);

        // Percentile rank within same-category published players.
        $peers = Player::query()
            ->where('is_published', true)
            ->where('category', $player->category)
            ->get();

        $percentiles = $this->computePercentiles($peers, $player);

        // Last 8 appearances (most recent first).
        $appearances = $player->appearances()->limit(8)->get();
        // Annotated frame clips (most recent first), public-safe metadata only.
        $clips = $player->clips()->limit(20)->get();

        return response()->json([
            'data' => $player,
            'percentiles' => $percentiles,
            'peers_count' => $peers->count(),
            'appearances' => $appearances,
            'clips' => $clips,
        ]);
    }

    private function computePercentiles($peers, Player $self): array
    {
        $count = $peers->count();
        $out = [];
        if ($count < 2) {
            // No comparison possible — every metric is 50 by convention.
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
