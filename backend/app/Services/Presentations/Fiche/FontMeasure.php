<?php

namespace App\Services\Presentations\Fiche;

use FontLib\Font;
use Throwable;

/**
 * Exact advance-width measurement from the embedded TTF files (via
 * php-font-lib, already a DomPDF dependency). Lets compositions size display
 * type — the monumental player names — to the physical width available
 * instead of guessing from character counts.
 */
final class FontMeasure
{
    public const DISPLAY   = 'BebasNeue-Regular.ttf';
    public const DISPLAY_X = 'BarlowCondensed-ExtraBold.ttf';
    public const COND      = 'BarlowCondensed-SemiBold.ttf';
    public const COND_BOLD = 'BarlowCondensed-Bold.ttf';
    public const BODY      = 'Barlow-Regular.ttf';
    public const BODY_SEMI = 'Barlow-SemiBold.ttf';

    /** @var array<string, array{upm:int, widths:array<int,int>, fallback:int}> */
    private static array $fonts = [];

    public static function dir(): string
    {
        return resource_path('fonts/fiche');
    }

    /** Width in mm of `$text` set in `$file` at `$sizePt` with extra tracking (pt). */
    public static function width(string $text, string $file, float $sizePt, float $trackingPt = 0.0): float
    {
        $f = self::load($file);
        $units = 0;
        $chars = mb_str_split($text);
        foreach ($chars as $ch) {
            $units += $f['widths'][mb_ord($ch)] ?? $f['fallback'];
        }
        $pt = $units / $f['upm'] * $sizePt + max(0, count($chars) - 1) * $trackingPt;
        return FichePage::ptToMm($pt);
    }

    /** Largest size (pt, 0.5 steps) between min and max at which `$text` fits `$maxWidthMm`. */
    public static function fit(string $text, string $file, float $maxWidthMm, float $maxPt, float $minPt, float $trackingEm = 0.0): float
    {
        for ($size = $maxPt; $size > $minPt; $size -= 0.5) {
            if (self::width($text, $file, $size, $trackingEm * $size) <= $maxWidthMm) return $size;
        }
        return $minPt;
    }

    private static function load(string $file): array
    {
        if (isset(self::$fonts[$file])) return self::$fonts[$file];

        $widths = [];
        $upm = 1000;
        $fallback = 600;
        try {
            $font = Font::load(self::dir().DIRECTORY_SEPARATOR.$file);
            $font->parse();
            $upm  = (int) ($font->getData('head', 'unitsPerEm') ?: 1000);
            $hmtx = (array) $font->getData('hmtx');
            $map  = [];
            foreach ((array) ($font->getData('cmap', 'subtables') ?? []) as $sub) {
                if (! empty($sub['glyphIndexArray'])) $map += $sub['glyphIndexArray'];
            }
            foreach ($map as $code => $glyph) {
                if (isset($hmtx[$glyph])) $widths[(int) $code] = (int) (is_array($hmtx[$glyph]) ? $hmtx[$glyph][0] : $hmtx[$glyph]);
            }
            $fallback = $widths[ord('n')] ?? (int) ($upm * 0.55);
            $font->close();
        } catch (Throwable) {
            // Conservative fallback: assume wide glyphs so fitted type errs smaller.
            $fallback = (int) ($upm * 0.62);
        }

        return self::$fonts[$file] = ['upm' => $upm, 'widths' => $widths, 'fallback' => $fallback];
    }
}
