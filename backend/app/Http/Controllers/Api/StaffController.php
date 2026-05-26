<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use Illuminate\Http\JsonResponse;

class StaffController extends Controller
{
    /**
     * Public staff listing for the AProposPage block.
     *
     * The roster is tiny (typically 4-6 rows) and changes rarely, so we add
     * a 60-second public cache header — a reload or a navigation back to the
     * page no longer round-trips the DB.
     */
    public function index(): JsonResponse
    {
        $staff = StaffMember::query()
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get([
                'id', 'slug', 'name', 'role', 'bio', 'photo_url', 'sort_order',
            ]);

        return response()->json(['data' => $staff])
            ->header('Cache-Control', 'public, max-age=60');
    }
}
