<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use Illuminate\Http\JsonResponse;

class PartnerController extends Controller
{
    /**
     * Public list of published partners in display order. Never exposes
     * unpublished rows.
     */
    public function index(): JsonResponse
    {
        $rows = Partner::query()
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['slug', 'name', 'role', 'logo_url', 'website_url', 'country_code', 'country_label']);

        return response()->json(['data' => $rows]);
    }
}
