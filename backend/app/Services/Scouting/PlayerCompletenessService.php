<?php

namespace App\Services\Scouting;

use App\Models\Player;

/**
 * Dossier-completeness checklist + missing-requirements reasoner.
 *
 * Each rule returns true when the data point is in place. We return both the
 * raw boolean map (so the frontend can render a tick-list) and a human label,
 * plus a "to_shortlist_a" summary that the cockpit shows on the player drawer.
 */
class PlayerCompletenessService
{
    /**
     * @return array{
     *   items: array<int, array{key:string, label:string, done:bool}>,
     *   percent: int,
     * }
     */
    public function checklist(Player $player): array
    {
        $reportsCount = $player->scoutingReports()->count();
        $distinctScouts = $player->scoutingReports()->whereNotNull('scout_id')->distinct('scout_id')->count('scout_id');
        $clipsCount = $player->clips()->count();
        $risksEvaluated = $player->risks()->count() > 0;
        $seniorValidation = $player->scoutingReports()->where('status', 'validated')->exists();

        $items = [
            ['key' => 'identity',       'label' => 'Identité confirmée',           'done' => filled($player->name) && filled($player->position)],
            ['key' => 'club',           'label' => 'Club actuel renseigné',         'done' => filled($player->club)],
            ['key' => 'position',       'label' => 'Poste principal renseigné',    'done' => filled($player->position)],
            ['key' => 'height',         'label' => 'Taille renseignée',            'done' => filled($player->height)],
            ['key' => 'foot',           'label' => 'Pied fort renseigné',          'done' => filled($player->preferred_foot)],
            ['key' => 'reports_2',      'label' => 'Au moins 2 rapports',          'done' => $reportsCount >= 2],
            ['key' => 'scouts_2',       'label' => 'Au moins 2 scouts différents', 'done' => $distinctScouts >= 2],
            ['key' => 'video_full',     'label' => 'Vidéo complète disponible',    'done' => $clipsCount > 0],
            ['key' => 'clips_3',        'label' => 'Au moins 3 clips',             'done' => $clipsCount >= 3],
            ['key' => 'risks',          'label' => 'Risques évalués',              'done' => $risksEvaluated],
            ['key' => 'source_contract','label' => 'Source contrat renseignée',    'done' => filled($player->source_label)],
            ['key' => 'senior_valid',   'label' => 'Validation scout senior',      'done' => $seniorValidation],
            ['key' => 'next_action',    'label' => 'Prochaine action renseignée',  'done' => filled($player->next_action)],
        ];

        $done = count(array_filter($items, fn ($i) => $i['done']));
        $percent = (int) round(($done / max(count($items), 1)) * 100);

        return ['items' => $items, 'percent' => $percent];
    }

    /** Labels of missing checklist items, for the "ce qu'il manque" message. */
    public function missing(Player $player): array
    {
        $check = $this->checklist($player);
        return array_values(array_map(
            fn ($i) => $i['label'],
            array_filter($check['items'], fn ($i) => ! $i['done']),
        ));
    }

    /**
     * Hard-gate eligibility for Shortlist A. Returns ['ok'=>bool, 'reasons'=>string[]].
     */
    public function canMoveToShortlistA(Player $player): array
    {
        $reasons = [];

        if ($player->scoutingReports()->count() < 3) {
            $reasons[] = 'Minimum 3 rapports requis.';
        }
        if ($player->scoutingReports()->whereNotNull('scout_id')->distinct('scout_id')->count('scout_id') < 2) {
            $reasons[] = 'Minimum 2 scouts différents.';
        }
        if ((float) $player->score_global < 75) {
            $reasons[] = 'Score global doit être > 75.';
        }
        if ((float) $player->score_confidence < 60) {
            $reasons[] = 'Score confiance doit être > 60.';
        }
        if ($player->clips()->count() < 3) {
            $reasons[] = 'Au moins 3 clips ou 1 vidéo complète.';
        }
        if ($player->risks()->count() === 0) {
            $reasons[] = 'Risques non évalués.';
        }
        if (blank($player->next_action)) {
            $reasons[] = 'Prochaine action manquante.';
        }

        return ['ok' => empty($reasons), 'reasons' => $reasons];
    }
}
