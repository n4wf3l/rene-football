<?php

namespace App\Services\Presentations\Fiche;

use App\Services\Presentations\Fiche\Compositions\CareerComposition;
use App\Services\Presentations\Fiche\Compositions\ClassicComposition;
use App\Services\Presentations\Fiche\Compositions\FicheComposition;
use App\Services\Presentations\Fiche\Compositions\ScoutingComposition;
use App\Services\Presentations\Fiche\Compositions\SignatureComposition;

/**
 * Registry + single source of truth for composition defaults and for the
 * option groups each composition actually renders. The admin editor reads
 * this through the catalogue endpoint: it only shows controls listed in
 * `supports`, and shows effective values from `defaults` when an option is
 * unset — so the editor can never advertise a setting the PDF ignores.
 */
final class FicheCompositions
{
    public const SIGNATURE = 'signature';
    public const SCOUTING  = 'scouting';
    public const CAREER    = 'career';
    /** Pre-2026-10 Marketing v1 layout, kept for presentations saved before the redesign. */
    public const CLASSIC   = 'classic';

    /** Composition given to new presentations. */
    public const DEFAULT_NEW = self::SIGNATURE;

    public const CONTACT_DEFAULTS = [
        'instagram' => '@renefootball',
        'email'     => 'renefootball.agency@gmail.com',
        'phone'     => '+352 621 640 640',
    ];

    private const COMMON_DEFAULTS = [
        'theme'            => FicheTheme::DEFAULT,
        'photo_source'     => 'player',
        'photo_side'       => 'right',
        'photo_fit'        => 'cover',
        'photo_zoom'       => 100,
        'photo_position_x' => 50,
        'photo_position_y' => 30,
        'font_family'      => 'sans',
        'font_scale'       => 'normal',
        'language'         => 'fr',
        'tagline'          => 'Agence de joueurs',
        'show_watermark'   => true,
        'show_heatmap'     => true,
        'middle_variant'   => 'profile-strengths',
    ];

    /** Option groups (UI sections) a premium composition renders. */
    private const PREMIUM_SUPPORTS = [
        'theme', 'photo', 'photo_side', 'photo_framing', 'typography', 'language',
        'tagline', 'header_motto', 'motto', 'slogan', 'watermark', 'contact', 'qr', 'project',
    ];

    /** @return class-string<FicheComposition>[] */
    private static function classes(): array
    {
        return [
            self::SIGNATURE => SignatureComposition::class,
            self::SCOUTING  => ScoutingComposition::class,
            self::CAREER    => CareerComposition::class,
            self::CLASSIC   => ClassicComposition::class,
        ];
    }

    public static function make(string $key): FicheComposition
    {
        $cls = self::classes()[$key] ?? self::classes()[self::DEFAULT_NEW];
        return new $cls();
    }

    /**
     * Composition key for a stored options array. Rows saved before the
     * redesign have no `composition` and keep their historic layout.
     */
    public static function keyFor(array $options): string
    {
        $key = (string) ($options['composition'] ?? '');
        return array_key_exists($key, self::classes()) ? $key : self::CLASSIC;
    }

    public static function keys(): array
    {
        return array_keys(self::classes());
    }

    /** @return array<string,mixed> */
    public static function defaults(string $key): array
    {
        $defaults = self::COMMON_DEFAULTS + ['contact' => self::CONTACT_DEFAULTS];
        if ($key === self::CLASSIC) {
            // What the historic Marketing v1 renderer does when options are unset.
            $defaults['photo_side']  = 'left';
            $defaults['font_family'] = 'editorial';
            $defaults['tagline']     = 'AGENCE DE JOUEURS';
        }
        return ['composition' => $key] + $defaults;
    }

    /** @return string[] */
    public static function supports(string $key): array
    {
        return match ($key) {
            self::SIGNATURE => [...self::PREMIUM_SUPPORTS, 'middle_variant', 'bars'],
            self::SCOUTING  => [...self::PREMIUM_SUPPORTS, 'stats', 'heatmap', 'bars'],
            self::CAREER    => [...self::PREMIUM_SUPPORTS, 'bars'],
            // Historic layout: no framing, no translation, no QR, no font scale.
            default         => ['theme', 'photo', 'photo_side', 'font_family', 'tagline', 'header_motto', 'motto', 'slogan', 'watermark', 'middle_variant', 'bars', 'contact', 'project'],
        };
    }

    public static function catalogue(): array
    {
        $out = [];
        foreach (self::classes() as $key => $cls) {
            $out[] = [
                'key'         => $key,
                'label'       => $cls::label(),
                'description' => $cls::description(),
                'legacy'      => $key === self::CLASSIC,
                'supports'    => self::supports($key),
                'defaults'    => self::defaults($key),
                'thumbnail'   => $cls::thumbnailSvg(),
            ];
        }
        return $out;
    }
}
