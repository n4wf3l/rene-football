<?php

namespace App\Services\Presentations\Fiche;

use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QROutputInterface;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Resolves every image the fiche embeds into a local, DomPDF-safe file:
 *
 *  - `/storage/...` and same-site URLs map to the public disk (path traversal
 *    is rejected);
 *  - remote http(s) URLs are fetched once with SSRF guards (public IPs only,
 *    pinned DNS, no redirects, size + time limits) and cached on disk;
 *  - flags come from the bundled `resources/flags` set (no network);
 *  - photos are cropped / fitted with GD at print resolution so DomPDF only
 *    ever receives an image whose pixel ratio equals its placed box — no
 *    stretching and no reliance on object-fit (which DomPDF ignores).
 *
 * Everything derived is cached under storage/app/fiche-cache.
 */
class FicheAssets
{
    private const REMOTE_TIMEOUT_S   = 5;
    private const REMOTE_MAX_BYTES   = 8 * 1024 * 1024;
    private const REMOTE_TTL_S       = 7 * 86400;
    private const REMOTE_FAIL_TTL_S  = 3600;
    /** Print resolution targeted when resampling photos (opaque / with alpha). */
    private const TARGET_DPI         = 220;
    /** DomPDF splits alpha PNGs pixel by pixel in PHP: keep cut-outs a bit lighter. */
    private const TARGET_DPI_ALPHA   = 170;

    /** @var array<string, ?FicheImage> */
    private array $memo = [];

    private string $cacheDir;

    public function __construct(?string $cacheDir = null)
    {
        $this->cacheDir = $cacheDir ?? storage_path('app/fiche-cache');
    }

    // ------------------------------------------------------------------ sources

    /** Resolve a stored URL / path (photo, logo, gallery item) to a local image. */
    public function image(?string $url): ?FicheImage
    {
        $url = trim((string) $url);
        if ($url === '') return null;
        if (array_key_exists($url, $this->memo)) return $this->memo[$url];

        $path = $this->localPathFor($url) ?? $this->fetchRemote($url);
        return $this->memo[$url] = $path ? $this->describe($path) : null;
    }

    /** Bundled flag for an ISO 3166-1 alpha-2 code (or gb-eng style sub-codes). */
    public function flag(?string $code): ?FicheImage
    {
        $code = strtolower(trim((string) $code));
        if (! preg_match('/^[a-z]{2}(-[a-z]{2,3})?$/', $code)) return null;
        $path = resource_path('flags/'.$code.'.png');
        return is_file($path) ? $this->describe($path) : null;
    }

    public function brandLogo(string $variant = 'white'): ?FicheImage
    {
        $path = public_path('branding/logo-'.($variant === 'black' ? 'black' : 'white').'.png');
        return is_file($path) ? $this->describe($path) : null;
    }

    /**
     * Best-effort ISO code for a nationality / country label as typed in the
     * player card ("Belge", "Dutch", "Pays-Bas"…). Unknown labels return null
     * and simply render without a flag.
     */
    public static function countryCode(?string $label): ?string
    {
        $k = mb_strtolower(trim((string) $label));
        if ($k === '') return null;
        $k = strtr($k, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'ï' => 'i', 'î' => 'i', 'ô' => 'o', 'ö' => 'o', 'ü' => 'u', 'û' => 'u', 'ç' => 'c', 'à' => 'a', 'â' => 'a', 'ä' => 'a', '’' => "'"]);
        foreach (self::COUNTRIES as $code => $names) {
            if (in_array($k, $names, true)) return $code;
        }
        return null;
    }

    /** @var array<string, string[]> lower-case, accent-stripped aliases (country + demonyms, FR/EN/NL/DE). */
    private const COUNTRIES = [
        'be' => ['belgique', 'belgium', 'belge', 'belgian', 'belgie', 'belgien', 'belgisch'],
        'fr' => ['france', 'francais', 'francaise', 'french', 'frankrijk', 'frankreich', 'frans', 'franzosisch'],
        'lu' => ['luxembourg', 'luxembourgeois', 'luxembourgeoise', 'luxembourger', 'luxemburg', 'luxemburgs', 'luxemburgisch'],
        'nl' => ['pays-bas', 'netherlands', 'nederland', 'niederlande', 'neerlandais', 'neerlandaise', 'hollandais', 'hollandaise', 'dutch', 'nederlands', 'niederlandisch', 'clubs neerlandais'],
        'de' => ['allemagne', 'germany', 'duitsland', 'deutschland', 'allemand', 'allemande', 'german', 'duits', 'deutsch'],
        'gb' => ['royaume-uni', 'united kingdom', 'uk', 'grande-bretagne', 'britannique', 'british', 'verenigd koninkrijk'],
        'gb-eng' => ['angleterre', 'england', 'anglais', 'anglaise', 'english', 'engeland', 'england (uk)'],
        'es' => ['espagne', 'spain', 'spanje', 'spanien', 'espagnol', 'espagnole', 'spanish', 'spaans', 'spanisch'],
        'pt' => ['portugal', 'portugais', 'portugaise', 'portuguese', 'portugees', 'portugiesisch'],
        'it' => ['italie', 'italy', 'italie', 'italien', 'italienne', 'italian', 'italiaans', 'italienisch', 'italia'],
        'ch' => ['suisse', 'switzerland', 'zwitserland', 'schweiz', 'swiss', 'zwitsers', 'schweizerisch'],
        'at' => ['autriche', 'austria', 'oostenrijk', 'osterreich', 'autrichien', 'autrichienne', 'austrian'],
        'ma' => ['maroc', 'morocco', 'marokko', 'marocain', 'marocaine', 'moroccan', 'marokkaans', 'marokkanisch'],
        'dz' => ['algerie', 'algeria', 'algerije', 'algerien', 'algerienne', 'algerian'],
        'tn' => ['tunisie', 'tunisia', 'tunesie', 'tunesien', 'tunisien', 'tunisienne', 'tunisian'],
        'sn' => ['senegal', 'senegalais', 'senegalaise', 'senegalese'],
        'ci' => ["cote d'ivoire", 'ivory coast', 'ivoirien', 'ivoirienne', 'ivorian'],
        'cm' => ['cameroun', 'cameroon', 'kameroen', 'kamerun', 'camerounais', 'camerounaise', 'cameroonian'],
        'cd' => ['rd congo', 'rdc', 'dr congo', 'congo-kinshasa', 'congolais (rdc)', 'republique democratique du congo'],
        'cg' => ['congo', 'congolais', 'congolaise', 'congolese', 'congo-brazzaville'],
        'ml' => ['mali', 'malien', 'malienne', 'malian'],
        'gn' => ['guinee', 'guinea', 'guineen', 'guineenne', 'guinean'],
        'gh' => ['ghana', 'ghanaian', 'ghaneen', 'ghaneenne', 'ghanees'],
        'ng' => ['nigeria', 'nigerian', 'nigerian(e)', 'nigeriaan'],
        'bf' => ['burkina faso', 'burkinabe'],
        'td' => ['tchad', 'chad', 'tchadien', 'tchadienne', 'chadian'],
        'er' => ['erythree', 'eritrea', 'erythreen', 'erythreenne', 'eritrean'],
        'et' => ['ethiopie', 'ethiopia', 'ethiopien', 'ethiopienne', 'ethiopian'],
        'tr' => ['turquie', 'turkey', 'turkije', 'turkei', 'turc', 'turque', 'turkish', 'turks'],
        'al' => ['albanie', 'albania', 'albanais', 'albanaise', 'albanian'],
        'xk' => ['kosovo', 'kosovar', 'kosovare'],
        'rs' => ['serbie', 'serbia', 'serbe', 'serbian'],
        'hr' => ['croatie', 'croatia', 'croate', 'croatian'],
        'pl' => ['pologne', 'poland', 'polen', 'polonais', 'polonaise', 'polish', 'pools'],
        'ro' => ['roumanie', 'romania', 'roumain', 'roumaine', 'romanian'],
        'br' => ['bresil', 'brazil', 'brazilie', 'brasilien', 'bresilien', 'bresilienne', 'brazilian'],
        'ar' => ['argentine', 'argentina', 'argentinie', 'argentinien', 'argentin', 'argentinian'],
        'us' => ['etats-unis', 'united states', 'usa', 'americain', 'americaine', 'american'],
        'cv' => ['cap-vert', 'cape verde', 'capverdien', 'capverdienne', 'cape verdean'],
        'ao' => ['angola', 'angolais', 'angolaise', 'angolan'],
        'ie' => ['irlande', 'ireland', 'irlandais', 'irlandaise', 'irish'],
        'gb-sct' => ['ecosse', 'scotland', 'ecossais', 'ecossaise', 'scottish'],
        'dk' => ['danemark', 'denmark', 'danois', 'danoise', 'danish'],
        'se' => ['suede', 'sweden', 'suedois', 'suedoise', 'swedish'],
        'no' => ['norvege', 'norway', 'norvegien', 'norvegienne', 'norwegian'],
        'gr' => ['grece', 'greece', 'grec', 'grecque', 'greek'],
    ];

    // ------------------------------------------------------------------ derived

    /**
     * Place an image in a w × h (mm) frame following the editor's framing
     * controls. Returns the visible part of the image already cropped and
     * resampled, plus its offset inside the frame — so the caller positions
     * an <img> with exactly the image's aspect ratio.
     *
     * - cover: fills the frame, cropping what overflows (focal point picks the crop)
     * - contain: whole image visible, letterboxed (focal point aligns it)
     * - zoom > 100 scales beyond the base fit, cropping around the focal point
     *
     * @return array{image:FicheImage,left:float,top:float,width:float,height:float}
     */
    public function frame(FicheImage $img, float $wMm, float $hMm, string $fit = 'cover', int $zoom = 100, int $focusX = 50, int $focusY = 50): array
    {
        $zoom   = max(100, min(250, $zoom)) / 100;
        $focusX = max(0, min(100, $focusX)) / 100;
        $focusY = max(0, min(100, $focusY)) / 100;

        $base  = $fit === 'contain'
            ? min($wMm / $img->width, $hMm / $img->height)
            : max($wMm / $img->width, $hMm / $img->height);
        $scale = $base * $zoom;                       // mm per source pixel
        $iw = $img->width * $scale;
        $ih = $img->height * $scale;
        $ox = ($wMm - $iw) * $focusX;                 // image offset inside frame (mm)
        $oy = ($hMm - $ih) * $focusY;

        // Visible intersection, in frame mm.
        $vx0 = max(0.0, $ox);
        $vy0 = max(0.0, $oy);
        $vx1 = min($wMm, $ox + $iw);
        $vy1 = min($hMm, $oy + $ih);
        $vw  = max(0.1, $vx1 - $vx0);
        $vh  = max(0.1, $vy1 - $vy0);

        // Same rectangle in source pixels.
        $sx = (int) floor(($vx0 - $ox) / $scale);
        $sy = (int) floor(($vy0 - $oy) / $scale);
        $sw = max(1, min($img->width - $sx, (int) round($vw / $scale)));
        $sh = max(1, min($img->height - $sy, (int) round($vh / $scale)));

        $ext  = $img->cutout ? 'png' : 'jpg';
        $dpi  = $ext === 'png' ? self::TARGET_DPI_ALPHA : self::TARGET_DPI;
        $outW = max(1, min($sw, (int) round($vw / 25.4 * $dpi)));
        $outH = max(1, (int) round($outW * $sh / $sw));

        $key  = sha1(implode('|', [$img->path, @filemtime($img->path), $sx, $sy, $sw, $sh, $outW, $outH]));
        $dest = $this->cachePath('framed', $key.'.'.$ext);

        if (! is_file($dest)) {
            $src = $this->load($img->path);
            if (! $src) {
                return ['image' => $img, 'left' => 0.0, 'top' => 0.0, 'width' => $wMm, 'height' => $wMm / $img->ratio()];
            }
            $dst = imagecreatetruecolor($outW, $outH);
            if ($ext === 'png') {
                imagealphablending($dst, false);
                imagesavealpha($dst, true);
                imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
            }
            imagecopyresampled($dst, $src, 0, 0, $sx, $sy, $outW, $outH, $sw, $sh);
            $ext === 'png' ? imagepng($dst, $dest, 6) : imagejpeg($dst, $dest, 88);
            imagedestroy($dst);
            imagedestroy($src);
        }

        return [
            'image'  => new FicheImage($dest, $outW, $outH, $img->cutout),
            'left'   => $vx0,
            'top'    => $vy0,
            'width'  => $vw,
            'height' => $vh,
        ];
    }

    /**
     * 1-px-wide PNG gradient from transparent to `$hex`, used as a fade over
     * photos (DomPDF has no CSS gradients). `$direction` is where the solid
     * colour ends up: bottom | top | left | right.
     */
    public function fade(string $hex, string $direction = 'bottom', float $maxAlpha = 1.0): string
    {
        $key  = sha1($hex.$direction.$maxAlpha);
        $dest = $this->cachePath('fades', $key.'.png');
        if (is_file($dest)) return $dest;

        [$r, $g, $b] = FicheTheme::rgb($hex);
        $vertical = in_array($direction, ['top', 'bottom'], true);
        $n = 256;
        $im = $vertical ? imagecreatetruecolor(4, $n) : imagecreatetruecolor($n, 4);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        for ($i = 0; $i < $n; $i++) {
            $t = $i / ($n - 1);
            if ($direction === 'top' || $direction === 'left') $t = 1 - $t;
            // Ease-in so the fade starts gently and lands fully opaque.
            $a = $maxAlpha * ($t * $t * (3 - 2 * $t));
            $col = imagecolorallocatealpha($im, $r, $g, $b, (int) round(127 - 127 * $a));
            $vertical ? imageline($im, 0, $i, 3, $i, $col) : imageline($im, $i, 0, $i, 3, $col);
        }
        imagepng($im, $dest);
        imagedestroy($im);
        return $dest;
    }

    /** QR code generated locally (no third-party service). */
    public function qr(string $url): ?FicheImage
    {
        if (! filter_var($url, FILTER_VALIDATE_URL) || ! preg_match('#^https?://#i', $url)) return null;
        $dest = $this->cachePath('qr', sha1($url).'.png');
        if (! is_file($dest)) {
            try {
                $opts = new QROptions([
                    'outputType'   => QROutputInterface::GDIMAGE_PNG,
                    'eccLevel'     => EccLevel::M,
                    'scale'        => 8,
                    'quietzoneSize'=> 1,
                    'outputBase64' => false,
                ]);
                file_put_contents($dest, (new QRCode($opts))->render($url));
            } catch (Throwable $e) {
                Log::warning('fiche.qr_failed', ['error' => $e->getMessage()]);
                return null;
            }
        }
        return $this->describe($dest);
    }

    // ------------------------------------------------------------------ internals

    private function localPathFor(string $url): ?string
    {
        $path = $url;
        if (preg_match('#^https?://#i', $url)) {
            $host    = strtolower((string) parse_url($url, PHP_URL_HOST));
            $appHost = strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST));
            if ($host === '' || $host !== $appHost) return null;
            $path = (string) parse_url($url, PHP_URL_PATH);
        }
        $path = rawurldecode($path);

        if (str_starts_with($path, '/storage/')) {
            return $this->inside(storage_path('app/public'), substr($path, 9));
        }
        if (str_starts_with($path, '/') && preg_match('/\.(png|jpe?g|webp|gif)$/i', $path)) {
            return $this->inside(public_path(), ltrim($path, '/'));
        }
        return null;
    }

    private function inside(string $root, string $relative): ?string
    {
        $rootReal = realpath($root);
        $real     = realpath($root.DIRECTORY_SEPARATOR.$relative);
        if (! $rootReal || ! $real || ! is_file($real)) return null;
        $norm = static fn (string $p) => strtolower(str_replace('\\', '/', $p));
        return str_starts_with($norm($real), rtrim($norm($rootReal), '/').'/') ? $real : null;
    }

    /** SSRF-guarded download of a remote image into the cache. */
    private function fetchRemote(string $url): ?string
    {
        $parts = parse_url($url);
        $scheme = strtolower($parts['scheme'] ?? '');
        $host   = $parts['host'] ?? '';
        if (! in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['user'])) return null;
        $port = (int) ($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
        if (! in_array($port, [80, 443], true)) return null;

        $key  = sha1($url);
        $fail = $this->cachePath('remote', $key.'.fail');
        foreach (['png', 'jpg', 'gif'] as $ext) {
            $cached = $this->cachePath('remote', $key.'.'.$ext);
            if (is_file($cached) && filemtime($cached) > time() - self::REMOTE_TTL_S) return $cached;
        }
        if (is_file($fail) && filemtime($fail) > time() - self::REMOTE_FAIL_TTL_S) return null;

        $ip = $this->publicIp($host);
        if (! $ip || ! function_exists('curl_init')) {
            @touch($fail);
            return null;
        }

        $buffer = '';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RESOLVE        => [$host.':'.$port.':'.$ip],
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => self::REMOTE_TIMEOUT_S,
            CURLOPT_TIMEOUT        => self::REMOTE_TIMEOUT_S,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_USERAGENT      => 'ReneFootball-Fiche/1.0',
            CURLOPT_WRITEFUNCTION  => function ($ch, string $chunk) use (&$buffer) {
                $buffer .= $chunk;
                return strlen($buffer) > self::REMOTE_MAX_BYTES ? 0 : strlen($chunk);
            },
        ]);
        $ok     = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if (! $ok || $status !== 200 || $buffer === '') {
            @touch($fail);
            return null;
        }
        $info = @getimagesizefromstring($buffer);
        $ext  = match ($info[2] ?? null) {
            IMAGETYPE_PNG  => 'png',
            IMAGETYPE_JPEG => 'jpg',
            IMAGETYPE_GIF  => 'gif',
            IMAGETYPE_WEBP => 'webp',
            default        => null,
        };
        if (! $ext) {
            @touch($fail);
            return null;
        }
        if ($ext === 'webp') {
            // DomPDF's WebP support depends on the GD build; normalise to PNG.
            $im = @imagecreatefromstring($buffer);
            if (! $im) { @touch($fail); return null; }
            imagesavealpha($im, true);
            $dest = $this->cachePath('remote', $key.'.png');
            imagepng($im, $dest);
            imagedestroy($im);
            return $dest;
        }
        $dest = $this->cachePath('remote', $key.'.'.$ext);
        file_put_contents($dest, $buffer);
        return $dest;
    }

    /** First resolved address of `$host`, only if every address is public. */
    private function publicIp(string $host): ?string
    {
        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (gethostbynamel($host) ?: []);
        if (! $ips) return null;
        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return null;
        }
        return $ips[0];
    }

    private function describe(string $path): ?FicheImage
    {
        $info = @getimagesize($path);
        if (! $info || $info[0] < 1 || $info[1] < 1) return null;
        if (! in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_GIF, IMAGETYPE_WEBP], true)) return null;
        if ($info[2] === IMAGETYPE_WEBP || $info[2] === IMAGETYPE_GIF) {
            $path = $this->normaliseToPng($path) ?? $path;
        }
        return new FicheImage($path, $info[0], $info[1], $info[2] === IMAGETYPE_PNG && $this->isCutout($path));
    }

    private function normaliseToPng(string $path): ?string
    {
        $dest = $this->cachePath('normalised', sha1($path.@filemtime($path)).'.png');
        if (is_file($dest)) return $dest;
        $im = $this->load($path);
        if (! $im) return null;
        imagesavealpha($im, true);
        imagepng($im, $dest);
        imagedestroy($im);
        return $dest;
    }

    /** A detoured photo: a majority of border pixels are (near) fully transparent. */
    private function isCutout(string $path): bool
    {
        if (! $this->hasAlphaChannel($path)) return false;
        $im = @imagecreatefrompng($path);
        if (! $im) return false;
        $w = imagesx($im);
        $h = imagesy($im);
        $samples = 0;
        $clear = 0;
        $step = 24;
        for ($i = 0; $i < $step; $i++) {
            foreach ([
                [(int) ($i * ($w - 1) / ($step - 1)), 0],
                [0, (int) ($i * ($h - 1) / ($step - 1))],
                [$w - 1, (int) ($i * ($h - 1) / ($step - 1))],
            ] as [$x, $y]) {
                $a = (imagecolorat($im, $x, $y) >> 24) & 0x7F;
                $samples++;
                if ($a > 110) $clear++;
            }
        }
        imagedestroy($im);
        return $samples > 0 && $clear / $samples >= 0.6;
    }

    private function hasAlphaChannel(string $path): bool
    {
        $fh = @fopen($path, 'rb');
        if (! $fh) return false;
        $head = fread($fh, 26);
        fclose($fh);
        // PNG colour type byte (offset 25): 4 = grey+alpha, 6 = RGBA; 3 = palette (may carry tRNS).
        return strlen($head) === 26 && str_starts_with($head, "\x89PNG") && in_array(ord($head[25]), [3, 4, 6], true);
    }

    private function load(string $path): \GdImage|false
    {
        $info = @getimagesize($path);
        return match ($info[2] ?? null) {
            IMAGETYPE_PNG  => @imagecreatefrompng($path),
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path),
            IMAGETYPE_GIF  => @imagecreatefromgif($path),
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            default        => false,
        };
    }

    private function cachePath(string $bucket, string $file): string
    {
        $dir = $this->cacheDir.DIRECTORY_SEPARATOR.$bucket;
        if (! is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir.DIRECTORY_SEPARATOR.$file;
    }
}
