<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Models\Scouting\ScoutingReport;
use App\Services\Scouting\ScoutingRoutingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Returns the counts used by the sidebar badge + the "Pour moi" tab.
 * Lightweight on purpose so it can be polled cheaply (mounted on the admin layout).
 */
class ScoutingInboxController extends Controller
{
    public function __construct(private ScoutingRoutingService $routing) {}

    public function show(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        $toValidate = ScoutingReport::query()
            ->where('status', 'submitted')
            ->where('submitted_to', $userId)
            ->count();

        $myNeedingChanges = ScoutingReport::query()
            ->where('status', 'needs_changes')
            ->where('scout_id', $userId)
            ->count();

        $waitingValidationGlobal = ScoutingReport::query()
            ->where('status', 'submitted')
            ->count();

        return response()->json([
            'user_id'                    => $userId,
            'to_validate'                => $toValidate,
            'my_reports_needing_changes' => $myNeedingChanges,
            'waiting_validation_global'  => $waitingValidationGlobal,
            'validators'                 => $this->routing->listValidators(),
        ]);
    }
}
