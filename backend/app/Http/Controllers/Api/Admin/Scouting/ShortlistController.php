<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\Shortlist;
use App\Models\Scouting\ShortlistPlayer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShortlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Shortlist::query()
            ->with(['need:id,slug,title,position,priority', 'creator:id,name'])
            ->withCount('entries')
            ->orderByDesc('created_at');

        if ($request->filled('status')) $q->where('status', $request->string('status'));
        if ($request->filled('need'))   $q->whereHas('need', fn ($qq) => $qq->where('slug', $request->string('need')));

        return response()->json(['data' => $q->get()]);
    }

    public function show(Shortlist $shortlist): JsonResponse
    {
        $shortlist->load([
            'need:id,slug,title,position,priority',
            'creator:id,name',
            'players' => fn ($q) => $q->select(
                'players.id', 'players.slug', 'players.name', 'players.position', 'players.club',
                'players.photo_url', 'players.age', 'players.score_global', 'players.score_confidence',
                'players.scouting_status', 'players.next_action',
            ),
        ]);
        return response()->json(['data' => $shortlist]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                => ['required', 'string', 'max:160'],
            'recruitment_need_id' => ['nullable', 'integer', 'exists:recruitment_needs,id'],
            'description'         => ['nullable', 'string'],
            'season'              => ['nullable', 'string', 'max:20'],
            'status'              => ['nullable', 'string', 'in:' . implode(',', Shortlist::STATUSES)],
        ]);
        $data['created_by'] = $request->user()?->id;
        $shortlist = Shortlist::create($data);
        return response()->json(['data' => $shortlist], 201);
    }

    public function update(Request $request, Shortlist $shortlist): JsonResponse
    {
        $data = $request->validate([
            'name'                => ['sometimes', 'required', 'string', 'max:160'],
            'recruitment_need_id' => ['nullable', 'integer', 'exists:recruitment_needs,id'],
            'description'         => ['nullable', 'string'],
            'season'              => ['nullable', 'string', 'max:20'],
            'status'              => ['nullable', 'string', 'in:' . implode(',', Shortlist::STATUSES)],
        ]);
        $shortlist->update($data);
        return response()->json(['data' => $shortlist->fresh()]);
    }

    public function destroy(Shortlist $shortlist): JsonResponse
    {
        $shortlist->delete();
        return response()->json(['ok' => true]);
    }

    /** Add or upsert a player into the shortlist. */
    public function addPlayer(Request $request, Shortlist $shortlist): JsonResponse
    {
        $data = $request->validate([
            'player_id'        => ['required', 'integer', 'exists:players,id'],
            'stage'            => ['nullable', 'string', 'in:' . implode(',', Shortlist::STAGES)],
            'reason'           => ['nullable', 'string'],
            'next_action'      => ['nullable', 'string', 'max:255'],
            'estimated_price'  => ['nullable', 'integer', 'min:0'],
            'risk_level'       => ['nullable', 'string', 'in:faible,moyen,eleve'],
            'confidence_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);
        $data['shortlist_id'] = $shortlist->id;
        $data['stage'] = $data['stage'] ?? 'watchlist';

        $entry = ShortlistPlayer::updateOrCreate(
            ['shortlist_id' => $shortlist->id, 'player_id' => $data['player_id']],
            $data,
        );
        return response()->json(['data' => $entry->load('player:id,slug,name,position,photo_url')], 201);
    }

    /** Patch a single shortlist entry - typically the kanban move. */
    public function updateEntry(Request $request, Shortlist $shortlist, ShortlistPlayer $entry): JsonResponse
    {
        abort_unless($entry->shortlist_id === $shortlist->id, 404);
        $data = $request->validate([
            'stage'            => ['nullable', 'string', 'in:' . implode(',', Shortlist::STAGES)],
            'rank'             => ['nullable', 'integer', 'min:0'],
            'reason'           => ['nullable', 'string'],
            'next_action'      => ['nullable', 'string', 'max:255'],
            'estimated_price'  => ['nullable', 'integer', 'min:0'],
            'risk_level'       => ['nullable', 'string', 'in:faible,moyen,eleve'],
            'confidence_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);
        $entry->update($data);
        return response()->json(['data' => $entry->fresh()]);
    }

    public function removePlayer(Shortlist $shortlist, ShortlistPlayer $entry): JsonResponse
    {
        abort_unless($entry->shortlist_id === $shortlist->id, 404);
        $entry->delete();
        return response()->json(['ok' => true]);
    }
}
