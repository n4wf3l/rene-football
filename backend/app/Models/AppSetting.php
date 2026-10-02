<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Singleton row holding agency-wide config (social URLs, and any future
 * global switch). Always access via {@see AppSetting::singleton()} — never
 * `AppSetting::first()` — so a fresh DB gets a valid row lazily.
 */
class AppSetting extends Model
{
    protected $fillable = [
        // Social URLs — footer / contact page icons.
        'instagram_url',
        'facebook_url',
        'linkedin_url',
        'youtube_url',
        'tiktok_url',
        'x_url',
        // Legal identity — mentions légales (admin-editable to avoid code
        // changes every time RCS/TVA/forme juridique are received).
        'legal_form',
        'rcs_number',
        'vat_number',
        'registered_office_address',
        'publication_director',
        // Contact info — footer, contact page sidebar, legal pages, SEO
        // JSON-LD. Single source of truth so a phone/email change propagates
        // everywhere without a code deploy.
        'contact_email',
        'contact_phone',
        'office_city',
    ];

    /** Lazy-creates the settings row on first access. */
    public static function singleton(): self
    {
        return static::firstOrCreate(['id' => 1], []);
    }

    /**
     * Returns the social URLs as a keyed array, filtering out empty values.
     * Used by the public API so the frontend gets only the entries it should
     * actually render.
     */
    public function socialLinks(): array
    {
        $raw = [
            'instagram' => $this->instagram_url,
            'facebook'  => $this->facebook_url,
            'linkedin'  => $this->linkedin_url,
            'youtube'   => $this->youtube_url,
            'tiktok'    => $this->tiktok_url,
            'x'         => $this->x_url,
        ];
        return array_filter($raw, static fn ($v) => is_string($v) && trim($v) !== '');
    }

    /**
     * Minimal contact block exposed to the public frontend (footer, contact
     * page sidebar, legal pages). Nullable fields come back as `null` so the
     * React code can soft-fall-back on a sensible default when nothing is
     * saved yet.
     */
    public function publicContact(): array
    {
        return [
            'email'       => $this->contact_email,
            'phone'       => $this->contact_phone,
            'office_city' => $this->office_city,
        ];
    }

    /**
     * Legal identity block used by the public /mentions-legales page. Each
     * field is nullable — the React page shows "En cours d'enregistrement"
     * as a soft fallback when a value isn't set yet.
     */
    public function publicLegal(): array
    {
        return [
            'legal_form'                 => $this->legal_form,
            'rcs_number'                 => $this->rcs_number,
            'vat_number'                 => $this->vat_number,
            'registered_office_address'  => $this->registered_office_address,
            'publication_director'       => $this->publication_director,
        ];
    }
}
