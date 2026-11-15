<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Lightweight display version of a player's photo for the website.
 *
 * Uploaded portraits are often 1-2 MB PNG cut-outs; the home hero waited for
 * them. The display version is a WebP of at most 960 x 1200 px (alpha kept,
 * so cut-outs stay transparent), usually 10-20 times lighter. The original
 * file is untouched and still used for the PDF fiches.
 *
 * Only local /storage photos are processed. Without GD/WebP support, or
 * when the WebP would not be smaller, no display version is made and the
 * site keeps using the original.
 */
class PlayerPhoto
{
    public const MAX_WIDTH = 960;
    public const MAX_HEIGHT = 1200;
    private const QUALITY = 80;
    private const DIR = 'players/display';

    /** Builds the display version of `$photoUrl` and returns its URL, or null. */
    public static function displayFor(?string $photoUrl): ?string
    {
        if (! $photoUrl || ! Str::startsWith($photoUrl, '/storage/')) {
            return null;
        }
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagewebp')) {
            return null;
        }

        $disk = Storage::disk('public');
        $relative = Str::after($photoUrl, '/storage/');
        if (! $disk->exists($relative)) {
            return null;
        }

        try {
            $bytes = $disk->get($relative);
            $source = @imagecreatefromstring($bytes);
            if (! $source) {
                return null;
            }

            $width = imagesx($source);
            $height = imagesy($source);
            $scale = min(1, self::MAX_WIDTH / $width, self::MAX_HEIGHT / $height);
            $w = max(1, (int) round($width * $scale));
            $h = max(1, (int) round($height * $scale));

            $target = imagecreatetruecolor($w, $h);
            imagealphablending($target, false);
            imagesavealpha($target, true);
            imagefill($target, 0, 0, imagecolorallocatealpha($target, 0, 0, 0, 127));
            imagecopyresampled($target, $source, 0, 0, 0, 0, $w, $h, $width, $height);

            ob_start();
            imagewebp($target, null, self::QUALITY);
            $webp = (string) ob_get_clean();
            imagedestroy($source);
            imagedestroy($target);
        } catch (Throwable) {
            return null;
        }

        if ($webp === '' || strlen($webp) >= strlen($bytes)) {
            return null;
        }

        $path = self::DIR.'/'.pathinfo($relative, PATHINFO_FILENAME).'-'.substr(sha1($bytes), 0, 8).'.webp';
        $disk->put($path, $webp);

        return '/storage/'.$path;
    }

    /** Removes a display version made by displayFor(). */
    public static function delete(?string $displayUrl): void
    {
        if ($displayUrl && Str::startsWith($displayUrl, '/storage/'.self::DIR.'/')) {
            Storage::disk('public')->delete(Str::after($displayUrl, '/storage/'));
        }
    }
}
