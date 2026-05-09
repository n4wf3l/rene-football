<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AnalysisController extends Controller
{
    public function metrics(): JsonResponse
    {
        return response()->json([
            'numeric' => [
                ['key' => 'age',                 'label' => 'Age'],
                ['key' => 'matches_played',      'label' => 'Matchs joues'],
                ['key' => 'goals',               'label' => 'Buts'],
                ['key' => 'assists',             'label' => 'Passes decisives'],
                ['key' => 'minutes_played',      'label' => 'Minutes jouees'],
                ['key' => 'shots',               'label' => 'Tirs'],
                ['key' => 'shots_on_target',     'label' => 'Tirs cadres'],
                ['key' => 'xg',                  'label' => 'xG'],
                ['key' => 'xa',                  'label' => 'xA'],
                ['key' => 'key_passes',          'label' => 'Passes cles'],
                ['key' => 'pass_accuracy',       'label' => '% passes reussies'],
                ['key' => 'dribbles_completed',  'label' => 'Dribbles reussis'],
                ['key' => 'tackles',             'label' => 'Tacles'],
                ['key' => 'interceptions',       'label' => 'Interceptions'],
                ['key' => 'duels_won',           'label' => 'Duels gagnes'],
                ['key' => 'yellow_cards',        'label' => 'Cartons jaunes'],
                ['key' => 'red_cards',           'label' => 'Cartons rouges'],
                ['key' => 'clean_sheets',        'label' => 'Clean sheets'],
                ['key' => 'saves',               'label' => 'Arrets'],
            ],
            'categorical' => [
                ['key' => 'category',       'label' => 'Categorie'],
                ['key' => 'position',       'label' => 'Poste'],
                ['key' => 'nationality',    'label' => 'Nationalite'],
                ['key' => 'preferred_foot', 'label' => 'Pied fort'],
                ['key' => 'club',           'label' => 'Club'],
            ],
        ]);
    }
}
