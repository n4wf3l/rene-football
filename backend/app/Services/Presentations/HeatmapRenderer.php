<?php

namespace App\Services\Presentations;

/**
 * Rasterises a player's 4×6 `heatmap_grid` into a football-pitch PNG:
 * turf gradient, pitch markings, then smooth radial blobs per cell. Shared
 * by the legacy template helpers and the premium fiche compositions.
 */
final class HeatmapRenderer
{
    /** True when the grid has the expected 4×6 shape and at least one visible cell. */
    public static function isRenderable(mixed $grid): bool
    {
        if (! is_array($grid) || count($grid) !== 4) return false;
        foreach ($grid as $row) {
            if (! is_array($row)) return false;
            foreach ($row as $v) {
                if ((int) $v >= 5) return true;
            }
        }
        return false;
    }

    /** PNG bytes (600×400). */
    public static function png(array $grid): string
    {
        $W = 600;
        $H = 400;
        $img = imagecreatetruecolor($W, $H);
        imagealphablending($img, true);
        imagesavealpha($img, true);
        imageantialias($img, true);

        for ($y = 0; $y < $H; $y++) {
            $t = $y / $H;
            $c = imagecolorallocate(
                $img,
                (int) round(14 + (8 - 14) * $t),
                (int) round(63 + (38 - 63) * $t),
                (int) round(34 + (22 - 34) * $t),
            );
            imageline($img, 0, $y, $W, $y, $c);
        }

        $stroke = imagecolorallocatealpha($img, 255, 255, 255, 99);
        imagesetthickness($img, 2);
        imagerectangle($img, 4, 4, $W - 4, $H - 4, $stroke);
        imageline($img, (int) ($W / 2), 4, (int) ($W / 2), $H - 4, $stroke);
        imageellipse($img, (int) ($W / 2), (int) ($H / 2), 130, 130, $stroke);
        imagefilledellipse($img, (int) ($W / 2), (int) ($H / 2), 7, 7, $stroke);
        imagerectangle($img, 4, (int) ($H * 0.275), (int) ($W * 0.14), (int) ($H * 0.725), $stroke);
        imagerectangle($img, 4, (int) ($H * 0.4), (int) ($W * 0.047), (int) ($H * 0.6), $stroke);
        imagefilledellipse($img, (int) ($W * 0.10), (int) ($H / 2), 7, 7, $stroke);
        imagerectangle($img, (int) ($W * 0.86), (int) ($H * 0.275), $W - 4, (int) ($H * 0.725), $stroke);
        imagerectangle($img, (int) ($W * 0.953), (int) ($H * 0.4), $W - 4, (int) ($H * 0.6), $stroke);
        imagefilledellipse($img, (int) ($W * 0.90), (int) ($H / 2), 7, 7, $stroke);

        $blobs = [];
        foreach ($grid as $rowI => $row) {
            foreach ((array) $row as $colI => $raw) {
                $v = max(0, min(100, (int) $raw));
                if ($v < 5) continue;
                [$r, $g, $b] = self::heatColor($v);
                $blobs[] = [
                    (int) round($colI * ($W / 6) + $W / 12),
                    (int) round($rowI * ($H / 4) + $H / 8),
                    75 + ($v / 100) * 30,
                    $r, $g, $b,
                    min(0.9, 0.35 + ($v / 100) * 0.55),
                ];
            }
        }

        foreach ($blobs as [$cx, $cy, $maxR, $br, $bg, $bb, $peak]) {
            $rSq = $maxR * $maxR;
            $x0 = max(0, (int) floor($cx - $maxR));
            $x1 = min($W - 1, (int) ceil($cx + $maxR));
            $y0 = max(0, (int) floor($cy - $maxR));
            $y1 = min($H - 1, (int) ceil($cy + $maxR));
            for ($py = $y0; $py <= $y1; $py++) {
                $dy2 = ($py - $cy) ** 2;
                for ($px = $x0; $px <= $x1; $px++) {
                    $d2 = ($px - $cx) ** 2 + $dy2;
                    if ($d2 > $rSq) continue;
                    $t = sqrt($d2) / $maxR;
                    $falloff = $t < 0.55 ? 1 - 0.3 * ($t / 0.55) : 0.7 * (1 - ($t - 0.55) / 0.45);
                    $a = $peak * $falloff;
                    if ($a <= 0.005) continue;
                    $e = imagecolorat($img, $px, $py);
                    $nr = (int) round($br * $a + (($e >> 16) & 0xFF) * (1 - $a));
                    $ng = (int) round($bg * $a + (($e >> 8) & 0xFF) * (1 - $a));
                    $nb = (int) round($bb * $a + ($e & 0xFF) * (1 - $a));
                    imagesetpixel($img, $px, $py, ($nr << 16) | ($ng << 8) | $nb);
                }
            }
        }

        ob_start();
        imagepng($img);
        $data = (string) ob_get_clean();
        imagedestroy($img);
        return $data;
    }

    /**
     * 0-100 intensity on the standard heatmap ramp (yellow → orange → red → crimson).
     *
     * @return array{0:int,1:int,2:int}
     */
    public static function heatColor(int $v): array
    {
        $stops = [
            [0.00, 250, 204, 21],
            [0.33, 249, 115, 22],
            [0.66, 239, 68, 68],
            [1.00, 190, 18, 60],
        ];
        $t = max(0, min(100, $v)) / 100;
        for ($i = 0; $i < count($stops) - 1; $i++) {
            [$t0, $r0, $g0, $b0] = $stops[$i];
            [$t1, $r1, $g1, $b1] = $stops[$i + 1];
            if ($t >= $t0 && $t <= $t1) {
                $k = $t1 === $t0 ? 0 : ($t - $t0) / ($t1 - $t0);
                return [(int) round($r0 + ($r1 - $r0) * $k), (int) round($g0 + ($g1 - $g0) * $k), (int) round($b0 + ($b1 - $b0) * $k)];
            }
        }
        return [190, 18, 60];
    }
}
