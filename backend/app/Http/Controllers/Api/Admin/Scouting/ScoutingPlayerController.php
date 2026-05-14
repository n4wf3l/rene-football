<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Player;
use App\Models\Scouting\PlayerStatusHistory;
use App\Services\Scouting\PlayerCompletenessService;
use App\Services\Scouting\ScoutingScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Scouting-flavoured Player API. The main /admin/players controller still
 * handles the editorial/CMS-style edits (full stats CRUD). This controller
 * focuses on scout workflow: list with scouting fields, status transitions,
 * score refresh, completeness, full file with relations.
 */
class ScoutingPlayerController extends Controller
{
    public function __construct(
        private ScoutingScoreService $scoreService,
        private PlayerCompletenessService $completenessService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $q = Player::query()
            ->select([
                'id', 'slug', 'name', 'age', 'position', 'category', 'club',
                'photo_url', 'is_published',
                'scouting_status', 'score_current', 'score_potential', 'score_global',
                'score_confidence', 'score_risk', 'completeness_pct', 'next_action',
                'tags', 'potential_rating', 'updated_at',
            ])
            ->orderBy('name');

        // Optional filters
        if ($request->filled('status')) {
            $q->where('scouting_status', $request->string('status'));
        }
        if ($request->filled('category')) {
            $q->where('category', $request->string('category'));
        }

        return response()->json(['data' => $q->get()]);
    }

    public function show(Player $player): JsonResponse
    {
        $player->load([
            'scoutingReports' => fn ($q) => $q->latest()->take(20),
            'scoutingReports.scout:id,name',
            'scoutingReports.match:id,slug,home_team,away_team,kickoff_at',
            'risks' => fn ($q) => $q->latest()->take(20),
            'risks.creator:id,name',
            'statusHistory' => fn ($q) => $q->latest()->take(20),
            'statusHistory.author:id,name',
            'aliases',
            'sources' => fn ($q) => $q->latest()->take(50),
            'sources.author:id,name',
            'clips' => fn ($q) => $q->latest()->take(20),
            'appearances' => fn ($q) => $q->latest('match_date')->take(10),
            'shortlistEntries.shortlist:id,slug,name,recruitment_need_id',
        ]);

        $checklist = $this->completenessService->checklist($player);
        $missing = $this->completenessService->missing($player);
        $shortlistA = $this->completenessService->canMoveToShortlistA($player);

        return response()->json([
            'data' => $player,
            'checklist' => $checklist['items'],
            'completeness_pct' => $checklist['percent'],
            'missing' => $missing,
            'shortlist_a_gate' => $shortlistA,
        ]);
    }

    public function update(Request $request, Player $player): JsonResponse
    {
        $data = $request->validate([
            'scouting_status'   => ['nullable', 'string', 'in:' . implode(',', Player::SCOUTING_STATUSES)],
            'next_action'       => ['nullable', 'string', 'max:255'],
            'scout_summary'     => ['nullable', 'string'],
            'source_label'      => ['nullable', 'string', 'max:120'],
            'reliability_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'score_current'     => ['nullable', 'numeric', 'min:0', 'max:100'],
            'score_potential'   => ['nullable', 'numeric', 'min:0', 'max:100'],
            'score_club_fit'    => ['nullable', 'numeric', 'min:0', 'max:100'],
            'score_market'      => ['nullable', 'numeric', 'min:0', 'max:100'],
            'score_risk'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'score_confidence'  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'change_reason'     => ['nullable', 'string', 'max:255'],
        ]);

        $oldStatus = $player->scouting_status;
        $changeReason = $data['change_reason'] ?? null;
        unset($data['change_reason']);

        $player->fill($data);
        $player->save();

        if (array_key_exists('scouting_status', $data) && $data['scouting_status'] !== $oldStatus) {
            PlayerStatusHistory::create([
                'player_id'   => $player->id,
                'old_status'  => $oldStatus,
                'new_status'  => $data['scouting_status'],
                'reason'      => $changeReason,
                'changed_by'  => $request->user()?->id,
                'created_at'  => now(),
            ]);
        }

        $this->scoreService->refresh($player);

        return $this->show($player);
    }

    /** Recompute scores + completeness on demand (button "Recalculer" on the drawer). */
    public function refreshScores(Player $player): JsonResponse
    {
        $this->scoreService->refresh($player);
        return $this->show($player);
    }
}
