<?php

namespace App\Services\Presentations\Fiche;

/**
 * Physical page geometry shared by every part of the fiche pipeline
 * (compositions, measurement, validation). One A4 portrait page, no margins:
 * compositions place their own safe area.
 */
final class FichePage
{
    public const WIDTH_MM  = 210.0;
    public const HEIGHT_MM = 297.0;

    /** PDF user units (points) — what DomPDF lays out in and what the MediaBox stores. */
    public const WIDTH_PT  = 595.28;
    public const HEIGHT_PT = 841.89;

    /** Tolerance used when comparing a PDF MediaBox to A4 (≈0.35 mm). */
    public const SIZE_TOLERANCE_PT = 1.0;

    /** Outer margin used by the premium compositions for text content. */
    public const MARGIN_MM = 12.0;

    public static function ptToMm(float $pt): float
    {
        return $pt * 25.4 / 72;
    }

    public static function mmToPt(float $mm): float
    {
        return $mm * 72 / 25.4;
    }
}
