<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use Illuminate\Http\JsonResponse;

class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = StaffMember::query()
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $staff]);
    }
}
