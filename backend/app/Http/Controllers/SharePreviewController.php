<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Player;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Link previews for social apps (WhatsApp, Facebook, LinkedIn, X, Slack,
 * Telegram, iMessage…). Their scrapers don't run JavaScript, so the React
 * SPA only ever showed them the generic agency tags of index.html.
 *
 * Apache routes ONLY those scrapers here (User-Agent match in .htaccess);
 * visitors keep getting the SPA. The page is a small standalone HTML with
 * the article / player tags and a readable summary - no Blade, same inline
 * heredoc approach as the rest of the backend.
 */
class SharePreviewController extends Controller
{
    private const SITE = 'Rene Football';
    private const DEFAULT_DESCRIPTION = 'Agent FIFA licencié basé au Luxembourg. Représentation, transferts, scouting et gestion de carrière depuis 2010.';

    public function article(Request $request, string $slug): Response
    {
        $article = Article::where('slug', $slug)->where('is_published', true)->first();
        if (! $article) return $this->fallback($request);

        $published = $article->published_at;
        return $this->page($request, [
            'title'       => $article->title,
            'description' => $article->excerpt ?: Str::limit(strip_tags((string) $article->content), 200),
            'image'       => $article->cover_url,
            'type'        => 'article',
            'extra'       => $published
                ? '<meta property="article:published_time" content="'.e($published->toIso8601String()).'" />'
                : '',
        ]);
    }

    public function player(Request $request, string $slug): Response
    {
        $player = Player::where('slug', $slug)->where('is_published', true)->first();
        if (! $player) return $this->fallback($request);

        $facts = collect([$player->position, $player->club])->filter()->unique()->implode(' · ');
        return $this->page($request, [
            'title'       => $player->name.($facts ? ' · '.$facts : ''),
            'description' => $player->bio ? Str::limit($player->bio, 200) : ($facts ?: self::DEFAULT_DESCRIPTION),
            'image'       => $player->photo_url,
            'type'        => 'profile',
            'extra'       => '',
        ]);
    }

    /** Unknown or unpublished slug: the generic agency preview. */
    private function fallback(Request $request): Response
    {
        return $this->page($request, [
            'title'       => self::SITE.' · Agence de football au Luxembourg',
            'description' => self::DEFAULT_DESCRIPTION,
            'image'       => null,
            'type'        => 'website',
            'extra'       => '',
        ]);
    }

    /** @param array{title:string,description:string,image:?string,type:string,extra:string} $meta */
    private function page(Request $request, array $meta): Response
    {
        $root  = $request->getSchemeAndHttpHost();
        $url   = $root.'/'.ltrim($request->path(), '/');
        $image = $this->absolute($root, $meta['image']) ?? $root.'/logo-black.png';
        [$w, $h] = $this->dimensions($meta['image']);

        $title = e($meta['title']);
        $desc  = e(Str::squish($meta['description']));
        $site  = e(self::SITE);
        $type  = e($meta['type']);
        $img   = e($image);
        $href  = e($url);
        $size  = $w && $h
            ? '<meta property="og:image:width" content="'.$w.'" />'."\n    ".'<meta property="og:image:height" content="'.$h.'" />'
            : '';

        $html = <<<HTML
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8" />
    <title>{$title} · {$site}</title>
    <meta name="description" content="{$desc}" />
    <link rel="canonical" href="{$href}" />
    <meta property="og:type" content="{$type}" />
    <meta property="og:site_name" content="{$site}" />
    <meta property="og:url" content="{$href}" />
    <meta property="og:title" content="{$title}" />
    <meta property="og:description" content="{$desc}" />
    <meta property="og:image" content="{$img}" />
    <meta property="og:image:secure_url" content="{$img}" />
    {$size}
    <meta property="og:image:alt" content="{$title}" />
    {$meta['extra']}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{$title}" />
    <meta name="twitter:description" content="{$desc}" />
    <meta name="twitter:image" content="{$img}" />
</head>
<body>
    <h1>{$title}</h1>
    <p>{$desc}</p>
    <p><a href="{$href}">{$href}</a></p>
</body>
</html>
HTML;

        return response($html, 200, [
            'Content-Type'  => 'text/html; charset=UTF-8',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    private function absolute(string $root, ?string $url): ?string
    {
        if (! $url) return null;
        if (preg_match('#^https?://#i', $url)) return $url;
        return $root.'/'.ltrim($url, '/');
    }

    /** Real pixel size of an image stored on our public disk, if known. */
    private function dimensions(?string $url): array
    {
        if (! $url || ! str_starts_with($url, '/storage/')) return [null, null];
        $path = Storage::disk('public')->path(substr($url, strlen('/storage/')));
        $size = is_file($path) ? @getimagesize($path) : false;
        return $size ? [$size[0], $size[1]] : [null, null];
    }
}
