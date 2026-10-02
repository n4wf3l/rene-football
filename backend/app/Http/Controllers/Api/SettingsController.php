<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;

class SettingsController extends Controller
{
    /**
     * Public settings endpoint. Returns :
     *   - `social_links` : the filtered social URL map (empty entries dropped)
     *   - `contact`      : email, phone and office city for the footer /
     *                      contact page sidebar / legal pages
     *   - `legal`        : forme juridique, RCS, TVA, siège, directeur de
     *                      publication — rendered on /mentions-legales with
     *                      a soft fallback for null values
     *
     * No admin-only field is ever exposed here.
     */
    public function show(): JsonResponse
    {
        $s = AppSetting::singleton();
        return response()->json([
            'data' => [
                'social_links' => $s->socialLinks(),
                'contact'      => $s->publicContact(),
                'legal'        => $s->publicLegal(),
            ],
        ]);
    }
}
