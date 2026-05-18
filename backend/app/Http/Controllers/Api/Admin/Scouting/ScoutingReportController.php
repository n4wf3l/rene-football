<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ReportScore;
use App\Models\Scouting\ScoutingReport;
use App\Models\Scouting\ScoutingReportTransition;
use App\Services\Scouting\ScoutingRoutingService;
use App\Services\Scouting\ScoutingScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScoutingReportController extends Controller
{
    public function __construct(
        private ScoutingScoreService $scoreService,
        private ScoutingRoutingService $routing,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $q = ScoutingReport::query()
            ->with([
                'player:id,slug,name,position,photo_url',
                'match:id,slug,kickoff_at,home_team,away_team',
                'scout:id,name',
                'submittedTo:id,name',
            ])
            ->latest();

        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('player')) {
            $q->whereHas('player', fn ($qq) => $qq->where('slug', $request->string('player')));
        }
        // "Pour moi" filter - reports currently assigned to the calling user.
        if ($request->boolean('for_me')) {
            $userId = $request->user()?->id;
            $q->where(function ($qq) use ($userId) {
                $qq->where('submitted_to', $userId)
                   ->orWhere('scout_id', $userId);
            });
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
            'submittedTo:id,name',
            'scores',
            'transitions.fromUser:id,name',
            'transitions.toUser:id,name',
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
        $this->logTransition($report, null, $report->status ?? 'draft', $request->user()?->id, null, 'Rapport créé');
        $this->scoreService->refresh($report->player);

        return response()->json(['data' => $this->reloadDeep($report)], 201);
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

    /**
     * Soumettre - assigne le rapport à un validateur explicite (param `submitted_to`)
     * ou auto-route via ScoutingRoutingService selon la catégorie du joueur.
     * Optionnel : `comment` pour une note au validateur.
     */
    public function submit(Request $request, ScoutingReport $report): JsonResponse
    {
        $data = $request->validate([
            'submitted_to' => ['nullable', 'integer', 'exists:users,id'],
            'comment'      => ['nullable', 'string', 'max:2000'],
        ]);

        $targetUserId = $data['submitted_to']
            ?? $this->routing->pickValidatorIdFor($report->player);

        $oldStatus = $report->status;

        DB::transaction(function () use ($report, $targetUserId, $data, $request, $oldStatus) {
            $report->update([
                'status'        => 'submitted',
                'submitted_at'  => now(),
                'submitted_to'  => $targetUserId,
            ]);
            $this->logTransition($report, $oldStatus, 'submitted', $request->user()?->id, $targetUserId, $data['comment'] ?? null);
        });

        return response()->json(['data' => $this->reloadDeep($report)]);
    }

    public function validateReport(Request $request, ScoutingReport $report): JsonResponse
    {
        $data = $request->validate([
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);
        $oldStatus = $report->status;
        $actorId = $request->user()?->id;

        DB::transaction(function () use ($report, $oldStatus, $actorId, $data) {
            $report->update([
                'status'        => 'validated',
                'validated_by'  => $actorId,
                'validated_at'  => now(),
                'submitted_to'  => null,
            ]);
            $this->logTransition($report, $oldStatus, 'validated', $actorId, null, $data['comment'] ?? null);
        });
        $this->scoreService->refresh($report->player);
        return response()->json(['data' => $this->reloadDeep($report)]);
    }

    /**
     * Renvoie le rapport au scout pour corrections (ou à un destinataire choisi).
     * Le commentaire est fortement encouragé - c'est l'intérêt du flow.
     */
    public function requestChanges(Request $request, ScoutingReport $report): JsonResponse
    {
        $data = $request->validate([
            'comment'  => ['nullable', 'string', 'max:2000'],
            'to_user'  => ['nullable', 'integer', 'exists:users,id'],
        ]);
        $oldStatus = $report->status;
        $actorId = $request->user()?->id;
        // Par défaut on renvoie au scout original - la personne qui doit corriger.
        $recipientId = $data['to_user'] ?? $report->scout_id;

        DB::transaction(function () use ($report, $oldStatus, $actorId, $recipientId, $data) {
            $report->update([
                'status'       => 'needs_changes',
                'submitted_to' => $recipientId, // visible dans l'inbox du scout
            ]);
            $this->logTransition($report, $oldStatus, 'needs_changes', $actorId, $recipientId, $data['comment'] ?? null);
        });
        return response()->json(['data' => $this->reloadDeep($report)]);
    }

    public function archive(Request $request, ScoutingReport $report): JsonResponse
    {
        $oldStatus = $report->status;
        $actorId = $request->user()?->id;
        DB::transaction(function () use ($report, $oldStatus, $actorId) {
            $report->update(['status' => 'archived', 'submitted_to' => null]);
            $this->logTransition($report, $oldStatus, 'archived', $actorId, null, null);
        });
        return response()->json(['data' => $this->reloadDeep($report)]);
    }

    private function logTransition(
        ScoutingReport $report,
        ?string $from,
        string $to,
        ?int $fromUserId,
        ?int $toUserId,
        ?string $comment,
    ): void {
        ScoutingReportTransition::create([
            'scouting_report_id' => $report->id,
            'from_status'        => $from,
            'to_status'          => $to,
            'from_user_id'       => $fromUserId,
            'to_user_id'         => $toUserId,
            'comment'            => $comment,
            'created_at'         => now(),
        ]);
    }

    private function reloadDeep(ScoutingReport $report): ScoutingReport
    {
        $fresh = ScoutingReport::query()->with([
            'player:id,slug,name,position,club,photo_url,age,category',
            'match:id,slug,kickoff_at,home_team,away_team,competition,score_home,score_away',
            'scout:id,name',
            'validator:id,name',
            'submittedTo:id,name',
            'scores',
            'transitions.fromUser:id,name',
            'transitions.toUser:id,name',
        ])->find($report->id);
        return $fresh ?? $report;
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
