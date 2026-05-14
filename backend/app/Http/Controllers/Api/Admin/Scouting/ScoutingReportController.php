<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ReportScore;
use App\Models\Scouting\ScoutingReport;
use App\Services\Scouting\ScoutingScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScoutingReportController extends Controller
{
    public function __construct(private ScoutingScoreService $scoreService) {}

    public function index(Request $request): JsonResponse
    {
        $q = ScoutingReport::query()
            ->with([
                'player:id,slug,name,position,photo_url',
                'match:id,slug,kickoff_at,home_team,away_team',
                'scout:id,name',
            ])
            ->latest();

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('player')) {
            $q->whereHas('player', fn ($qq) => $qq->where('slug', $request->string('player')));
        }

        return response()->json(['data' => $q->get()]);
    }

    public function show(ScoutingReport $report): JsonResponse
    {
        $report->load([
            'player:id,slug,name,position,club,photo_url,age,category',
            'match:id,slug,kickoff_at,home_team,away_team,competition,score_home,score_away',
            'scout:id,name',
            'validator:id,name',
            'scores',
        ]);
        return response()->json(['data' => $report]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateData($request);
        $scoresPayload = $data['scores'] ?? [];
        unset($data['scores']);

        $data['scout_id'] = $request->user()?->id;
        $report = ScoutingReport::create($data);
        $this->syncScores($report, $scoresPayload);
        $this->scoreService->refresh($report->player);

        return response()->json(['data' => $report->fresh(['player', 'match', 'scores'])], 201);
    }

    public function update(Request $request, ScoutingReport $report): JsonResponse
    {
        $data = $this->validateData($request, $report);
        $scoresPayload = $data['scores'] ?? null;
        unset($data['scores']);
        $report->update($data);

        if ($scoresPayload !== null) {
            $this->syncScores($report, $scoresPayload);
        }
        $this->scoreService->refresh($report->player);

        return response()->json(['data' => $report->fresh(['player', 'match', 'scores'])]);
    }

    public function submit(ScoutingReport $report): JsonResponse
    {
        $report->update(['status' => 'submitted', 'submitted_at' => now()]);
        return response()->json(['data' => $report->fresh()]);
    }

    public function validateReport(Request $request, ScoutingReport $report): JsonResponse
    {
        $report->update([
            'status'       => 'validated',
            'validated_by' => $request->user()?->id,
            'validated_at' => now(),
        ]);
        $this->scoreService->refresh($report->player);
        return response()->json(['data' => $report->fresh()]);
    }

    public function requestChanges(Request $request, ScoutingReport $report): JsonResponse
    {
        $report->update(['status' => 'needs_changes']);
        return response()->json(['data' => $report->fresh()]);
    }

    public function archive(ScoutingReport $report): JsonResponse
    {
        $report->update(['status' => 'archived']);
        return response()->json(['data' => $report->fresh()]);
    }

    public function destroy(ScoutingReport $report): JsonResponse
    {
        $player = $report->player;
        $report->delete();
        if ($player) $this->scoreService->refresh($player);
        return response()->json(['ok' => true]);
    }

    private function syncScores(ScoutingReport $report, array $scores): void
    {
        // Wipe + re-create per call. Reports are small (max ~20 criteria).
        $report->scores()->delete();
        foreach ($scores as $row) {
            if (! isset($row['category'], $row['criterion'], $row['score'])) continue;
            ReportScore::create([
                'scouting_report_id' => $report->id,
                'category'  => $row['category'],
                'criterion' => $row['criterion'],
                'score'     => (int) $row['score'],
                'comment'   => $row['comment'] ?? null,
            ]);
        }
    }

    private function validateData(Request $request, ?ScoutingReport $report = null): array
    {
        return $request->validate([
            'player_id'        => ['required', 'integer', 'exists:players,id'],
            'football_match_id'=> ['nullable', 'integer', 'exists:football_matches,id'],
            'observed_position'=> ['nullable', 'string', 'max:80'],
            'minutes_observed' => ['nullable', 'integer', 'min:0', 'max:200'],
            'context'          => ['nullable', 'string', 'max:60'],
            'tactical_role'    => ['nullable', 'string', 'max:120'],
            'strengths'        => ['nullable', 'string'],
            'weaknesses'       => ['nullable', 'string'],
            'key_actions'      => ['nullable', 'array'],
            'global_rating'    => ['nullable', 'numeric', 'min:0', 'max:10'],
            'current_level'    => ['nullable', 'numeric', 'min:0', 'max:10'],
            'potential_level'  => ['nullable', 'numeric', 'min:0', 'max:10'],
            'recommendation'   => ['nullable', 'string', 'in:' . implode(',', ScoutingReport::RECOMMENDATIONS)],
            'next_action'      => ['nullable', 'string', 'max:255'],
            'status'           => ['nullable', 'string', 'in:' . implode(',', ScoutingReport::STATUSES)],
            'scores'           => ['nullable', 'array'],
            'scores.*.category'  => ['required_with:scores', 'string', 'in:' . implode(',', ReportScore::CATEGORIES)],
            'scores.*.criterion' => ['required_with:scores', 'string', 'max:120'],
            'scores.*.score'     => ['required_with:scores', 'integer', 'min:1', 'max:10'],
            'scores.*.comment'   => ['nullable', 'string'],
        ]);
    }
}
