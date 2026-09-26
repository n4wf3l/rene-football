<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    /**
     * Returns the singleton settings row for the admin editor. Includes the
     * raw URL fields (not the filtered map exposed to the public) so the
     * form can bind directly to them.
     */
    public function show(): JsonResponse
    {
        $s = AppSetting::singleton();
        return response()->json([
            'data' => [
                'instagram_url' => $s->instagram_url,
                'facebook_url'  => $s->facebook_url,
                'linkedin_url'  => $s->linkedin_url,
                'youtube_url'   => $s->youtube_url,
                'tiktok_url'    => $s->tiktok_url,
                'x_url'         => $s->x_url,
            ],
        ]);
    }

    /**
     * Updates the social URLs. Empty strings are stored as null so the
     * public endpoint filters them out.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'instagram_url' => ['nullable', 'string', 'max:500', 'url:http,https'],
            'facebook_url'  => ['nullable', 'string', 'max:500', 'url:http,https'],
            'linkedin_url'  => ['nullable', 'string', 'max:500', 'url:http,https'],
            'youtube_url'   => ['nullable', 'string', 'max:500', 'url:http,https'],
            'tiktok_url'    => ['nullable', 'string', 'max:500', 'url:http,https'],
            'x_url'         => ['nullable', 'string', 'max:500', 'url:http,https'],
        ]);

        // Cast empty strings to null so socialLinks() filters them out.
        foreach ($data as $k => $v) {
            if (is_string($v) && trim($v) === '') $data[$k] = null;
        }

        $s = AppSetting::singleton();
        $s->fill($data)->save();

        return response()->json([
            'data' => [
                'instagram_url' => $s->instagram_url,
                'facebook_url'  => $s->facebook_url,
                'linkedin_url'  => $s->linkedin_url,
                'youtube_url'   => $s->youtube_url,
                'tiktok_url'    => $s->tiktok_url,
                'x_url'         => $s->x_url,
            ],
        ]);
    }
}
