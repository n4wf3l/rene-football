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
     * raw URL fields (not the filtered map exposed to the public) plus the
     * legal + contact blocks the admin can now edit from the Réglages page.
     */
    public function show(): JsonResponse
    {
        $s = AppSetting::singleton();
        return response()->json([
            'data' => $this->present($s),
        ]);
    }

    /**
     * Updates the social URLs, legal identity and contact info. Empty strings
     * are normalised to null so the public endpoints filter / soft-fallback
     * cleanly on the frontend.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Social URLs (unchanged)
            'instagram_url' => ['nullable', 'string', 'max:500', 'url:http,https'],
            'facebook_url'  => ['nullable', 'string', 'max:500', 'url:http,https'],
            'linkedin_url'  => ['nullable', 'string', 'max:500', 'url:http,https'],
            'youtube_url'   => ['nullable', 'string', 'max:500', 'url:http,https'],
            'tiktok_url'    => ['nullable', 'string', 'max:500', 'url:http,https'],
            'x_url'         => ['nullable', 'string', 'max:500', 'url:http,https'],

            // Legal identity. Everything stays nullable so the admin can
            // populate progressively — the frontend has graceful placeholders
            // for empty values.
            'legal_form'                 => ['nullable', 'string', 'max:120'],
            'rcs_number'                 => ['nullable', 'string', 'max:60'],
            'vat_number'                 => ['nullable', 'string', 'max:40'],
            'registered_office_address'  => ['nullable', 'string', 'max:500'],
            'publication_director'       => ['nullable', 'string', 'max:160'],

            // Contact.
            'contact_email'  => ['nullable', 'email:rfc', 'max:160'],
            'contact_phone'  => ['nullable', 'string', 'max:40'],
            'office_city'    => ['nullable', 'string', 'max:200'],
        ]);

        // Normalise empty strings → null so filters/fallbacks behave sanely.
        foreach ($data as $k => $v) {
            if (is_string($v) && trim($v) === '') $data[$k] = null;
        }

        $s = AppSetting::singleton();
        $s->fill($data)->save();

        return response()->json([
            'data' => $this->present($s),
        ]);
    }

    private function present(AppSetting $s): array
    {
        return [
            // Social
            'instagram_url' => $s->instagram_url,
            'facebook_url'  => $s->facebook_url,
            'linkedin_url'  => $s->linkedin_url,
            'youtube_url'   => $s->youtube_url,
            'tiktok_url'    => $s->tiktok_url,
            'x_url'         => $s->x_url,
            // Legal
            'legal_form'                 => $s->legal_form,
            'rcs_number'                 => $s->rcs_number,
            'vat_number'                 => $s->vat_number,
            'registered_office_address'  => $s->registered_office_address,
            'publication_director'       => $s->publication_director,
            // Contact
            'contact_email'  => $s->contact_email,
            'contact_phone'  => $s->contact_phone,
            'office_city'    => $s->office_city,
        ];
    }
}
