<?php

namespace App\Services\Presentations;

use App\Services\Presentations\Templates\MarketingTemplate;
use RuntimeException;

/**
 * Only the Marketing v1 template ships - it reproduces the agency's real
 * marketing fiches (violet Zoran-Mawel, navy Camara, black-gold Destiny/
 * Saeed, black-yellow Hanibal) through its theme + photo_side + middle
 * variant knobs. The generic Classic/Magazine/Minimal/Signature/Stadium
 * templates that used to live here were placeholder demos that didn't
 * match the agency's identity and confused visitors, so they've been
 * removed.
 */
class PresentationTemplateRegistry
{
    /** @var array<class-string<PresentationTemplate>> */
    private const TEMPLATES = [
        MarketingTemplate::class,
    ];

    /** @return array<int, array{key:string,label:string,description:string,defaults:array,thumbnail:string}> */
    public static function catalogue(): array
    {
        return array_map(static fn ($cls) => [
            'key'         => $cls::key(),
            'label'       => $cls::label(),
            'description' => $cls::description(),
            'defaults'    => $cls::defaultOptions(),
            'thumbnail'   => $cls::thumbnailSvg(),
        ], self::TEMPLATES);
    }

    public static function keys(): array
    {
        return array_map(static fn ($cls) => $cls::key(), self::TEMPLATES);
    }

    public static function resolve(string $key): PresentationTemplate
    {
        foreach (self::TEMPLATES as $cls) {
            if ($cls::key() === $key) return new $cls();
        }
        // Historic presentations that were saved with a now-removed template
        // key (classic / magazine / minimal / signature / stadium) fall
        // through to Marketing so they at least render instead of throwing.
        // They can be re-saved through the admin editor to migrate to the
        // Marketing options schema.
        return new MarketingTemplate();
    }
}
