<?php

namespace App\Http\Controllers\Api\Admin\Scouting;

use App\Http\Controllers\Controller;
use App\Services\Scouting\ScoutingDashboardService;
use Illuminate\Http\JsonResponse;

class ScoutingDashboardController extends Controller
{
    public function __construct(private ScoutingDashboardService $service) {}

    public function show(): JsonResponse
    {
        return response()->json($this->service->snapshot());
    }
}
