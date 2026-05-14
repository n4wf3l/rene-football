<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Services\Scouting\ScoutingDashboardService;
use Illuminate\Http\JsonResponse;

class ScoutingIntelligenceController extends Controller
{
    public function __construct(private ScoutingDashboardService $service) {}

    public function index(): JsonResponse
    {
        return response()->json(['alerts' => $this->service->alerts()]);
    }
}
