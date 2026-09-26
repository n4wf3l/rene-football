<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Public settings endpoint. Returns only what the frontend needs on the
     * public site (social URLs, filtered to non-empty). Never exposes admin
     * / internal fields.
     */
    public function show(): JsonResponse
    {
        $s = AppSetting::singleton();
        return response()->json([
            'data' => [
                'social_links' => $s->socialLinks(),
            ],
        ]);
    }
}
