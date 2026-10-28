<?php

namespace App\Services\Presentations\Fiche;

/**
 * Single source of truth for the fiche palettes. The four presets reproduce
 * the agency's reference fiches; `custom` derives a full palette from the
 * four colours picked in the editor. Exposed to the admin through the
 * presentation catalogue so the editor never hard-codes its own copy.
 */
final class FicheTheme
{
    public const PRESETS = [
        'violet' => [
            'label' => 'Violet', 'bg' => '#1a0f2e', 'accent' => '#8b5cf6', 'secondary' => '#c4b5fd', 'text' => '#ffffff',
        ],
        'navy' => [
            'label' => 'Navy · bleu', 'bg' => '#0a1f3d', 'accent' => '#3b82f6', 'secondary' => '#93c5fd', 'text' => '#ffffff',
        ],
        'black-gold' => [
            'label' => 'Noir & or', 'bg' => '#0a0a0a', 'accent' => '#d4a017', 'secondary' => '#a89570', 'text' => '#ffffff',
        ],
        'black-yellow' => [
            'label' => 'Noir & jaune', 'bg' => '#0d0d0d', 'accent' => '#facc15', 'secondary' => '#e5e5e5', 'text' => '#ffffff',
        ],
    ];

    public const DEFAULT = 'black-gold';

    /** @return array<int, array{key:string,label:string,bg:string,accent:string,secondary:string,text:string}> */
    public static function catalogue(): array
    {
        $out = [];
        foreach (self::PRESETS as $key => $p) {
            $out[] = ['key' => $key] + $p;
        }
        $out[] = [
            'key' => 'custom', 'label' => 'Personnalisé',
            'bg' => '#0a0a0a', 'accent' => '#d4a017', 'secondary' => '#a89570', 'text' => '#ffffff',
        ];
        return $out;
    }

    /**
     * Full palette for the given options. Derived tones (panel, rule, muted,
     * ink) are computed rather than stored so custom colours get the same
     * tonal system as the presets.
     *
     * @return array{key:string,bg:string,panel:string,panel2:string,accent:string,secondary:string,text:string,muted:string,rule:string,ink:string}
     */
    public static function resolve(array $options): array
    {
        $key = (string) ($options['theme'] ?? self::DEFAULT);
        if (isset(self::PRESETS[$key])) {
            $base = self::PRESETS[$key];
        } elseif ($key === 'custom') {
            $base = [
                'bg'        => self::hex($options['background_color'] ?? null, '#0a0a0a'),
                'accent'    => self::hex($options['accent_color'] ?? null, '#d4a017'),
                'secondary' => self::hex($options['secondary_color'] ?? null, '#a89570'),
                'text'      => self::hex($options['text_color'] ?? null, '#ffffff'),
            ];
        } else {
            $key  = self::DEFAULT;
            $base = self::PRESETS[self::DEFAULT];
        }

        $bg   = $base['bg'];
        $text = $base['text'];

        return [
            'key'       => $key,
            'bg'        => $bg,
            'panel'     => self::mix($bg, $text, 0.06),
            'panel2'    => self::mix($bg, $text, 0.11),
            'accent'    => $base['accent'],
            'secondary' => $base['secondary'],
            'text'      => $text,
            'muted'     => self::mix($text, $bg, 0.42),
            'rule'      => self::mix($bg, $text, 0.22),
            // Text colour used on accent-filled surfaces: whichever of bg / white contrasts best.
            'ink'       => self::luminance($base['accent']) > 0.45 ? $bg : '#ffffff',
        ];
    }

    public static function mix(string $a, string $b, float $t): string
    {
        [$r1, $g1, $b1] = self::rgb($a);
        [$r2, $g2, $b2] = self::rgb($b);
        return sprintf(
            '#%02x%02x%02x',
            (int) round($r1 + ($r2 - $r1) * $t),
            (int) round($g1 + ($g2 - $g1) * $t),
            (int) round($b1 + ($b2 - $b1) * $t),
        );
    }

    public static function rgba(string $hex, float $alpha): string
    {
        [$r, $g, $b] = self::rgb($hex);
        return "rgba($r,$g,$b,".number_format($alpha, 3, '.', '').')';
    }

    /** @return array{0:int,1:int,2:int} */
    public static function rgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
        }
        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    public static function luminance(string $hex): float
    {
        [$r, $g, $b] = self::rgb($hex);
        return (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255;
    }

    private static function hex(mixed $value, string $fallback): string
    {
        return is_string($value) && preg_match('/^#([0-9a-fA-F]{3}){1,2}$/', $value) ? $value : $fallback;
    }
}
