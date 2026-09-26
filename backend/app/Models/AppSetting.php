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
        'instagram_url',
        'facebook_url',
        'linkedin_url',
        'youtube_url',
        'tiktok_url',
        'x_url',
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
}
