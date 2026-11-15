<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Player;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Public pages of the SPA, served with their own head tags.
 *
 * The React app sets each page's title and description with JavaScript,
 * so the HTML that Google (and WhatsApp, LinkedIn…) reads first only had
 * the home page's generic tags: every player showed up in Google as
 * "Agence de football au Luxembourg". Apache now sends these routes here
 * for every visitor; the response is the SPA's own index.html with the
 * page's title, description, canonical URL, Open Graph / Twitter tags and
 * schema.org data written in. Same HTML for people and robots.
 *
 * The injected tags carry data-rh="true" so react-helmet-async takes them
 * over once the app runs (no duplicates). Unknown or unpublished content
 * answers 404 (with noindex) instead of a "page not found" served as 200.
 */
class PublicPageController extends Controller
{
    private const SITE = 'Rene Football';
    private const DEFAULT_TITLE = 'Rene Football · Agence de football au Luxembourg';
    private const DEFAULT_DESCRIPTION = 'Agent FIFA licencié basé au Luxembourg. Représentation de joueurs, négociation de transferts, scouting et gestion de carrière, en activité depuis 2010.';

    /** Static pages: title (before " · Rene Football") and description, as the SPA sets them in French. */
    private const PAGES = [
        'joueurs' => ['Nos joueurs', 'La liste des joueurs qu\'on accompagne cette saison. Une sélection resserrée, suivie par une équipe dédiée du début à la fin de la saison.'],
        'actualites' => ['Actualités', 'Transferts, signatures, profils. Les nouvelles autour des joueurs qu\'on accompagne. Publié quand on a quelque chose à dire.'],
        'a-propos' => ['À propos', 'Rene Football, agence de football fondée par René Jacob Yougbaré en 2010 au Luxembourg. Représentation, scouting, accompagnement long terme.'],
        'contact' => ['Contact', 'Joueur, parent, club ou média : contactez Rene Football. Agence de football basée au Luxembourg, agent FIFA licencié depuis 2010.'],
        'mentions-legales' => ['Mentions légales', self::DEFAULT_DESCRIPTION],
        'confidentialite' => ['Politique de confidentialité', 'Ce que Rene Football collecte, pourquoi, combien de temps, et vos droits (RGPD, CNPD Luxembourg).'],
        'cookies' => ['Cookies & traceurs', 'Le stockage local utilisé par le site Rene Football, sans cookie de suivi ni publicitaire.'],
    ];

    public function page(Request $request, string $page): Response
    {
        [$title, $description] = self::PAGES[$page];
        return $this->render($request, [
            'title'       => $title.' · '.self::SITE,
            'description' => $description,
            'breadcrumb'  => [[$title, '/'.$page]],
        ]);
    }

    public function player(Request $request, string $slug): Response|RedirectResponse
    {
        try {
            $player = Player::where('slug', $slug)->where('is_published', true)->first();
            if (! $player && ($moved = $this->renamedPlayer($slug))) {
                return redirect('/joueurs/'.$moved, 301);
            }
        } catch (Throwable $e) {
            return $this->degraded($request, $e);
        }
        if (! $player) {
            return $this->notFound($request);
        }

        $facts = collect([$player->position, $player->club])->filter()->unique()->implode(' · ');
        $description = $player->bio
            ? Str::limit(Str::squish($player->bio), 155)
            : $player->name.', '.($player->position ?: $player->category).($player->club ? ' ('.$player->club.')' : '')
                .'. Profil complet, statistiques et scouting sur Rene Football.';

        $person = array_filter([
            '@type'       => 'Person',
            'name'        => $player->name,
            'url'         => $this->url($request, '/joueurs/'.$player->slug),
            'image'       => $this->absolute($request, $player->photo_url),
            'description' => $player->bio ? Str::squish($player->bio) : null,
            'jobTitle'    => 'Footballeur',
            'nationality' => $player->nationality ? ['@type' => 'Country', 'name' => $player->nationality] : null,
            'affiliation' => $player->club ? ['@type' => 'SportsTeam', 'name' => $player->club] : null,
            'agent'       => ['@type' => 'SportsOrganization', 'name' => self::SITE, 'url' => $this->url($request, '/')],
        ]);

        return $this->render($request, [
            'title'       => $player->name.($facts ? ' · '.$facts : '').' · '.self::SITE,
            'description' => $description,
            'image'       => $player->photo_url,
            'type'        => 'profile',
            'schema'      => [$person],
            'breadcrumb'  => [['Nos joueurs', '/joueurs'], [$player->name, '/joueurs/'.$player->slug]],
        ]);
    }

    public function article(Request $request, string $slug): Response|RedirectResponse
    {
        try {
            $article = Article::where('slug', $slug)->where('is_published', true)->first();
            if (! $article && ($moved = Article::publishedFormerlyAt($slug))) {
                return redirect('/actualites/'.$moved->slug, 301);
            }
        } catch (Throwable $e) {
            return $this->degraded($request, $e);
        }
        if (! $article) {
            return $this->notFound($request);
        }

        $description = $article->excerpt ?: Str::limit(Str::squish(strip_tags((string) $article->content)), 155);
        $published = $article->published_at;
        $news = array_filter([
            '@type'            => 'NewsArticle',
            'headline'         => Str::limit($article->title, 110, ''),
            'description'      => $description,
            'image'            => $this->absolute($request, $article->cover_url),
            'datePublished'    => $published?->toIso8601String(),
            'dateModified'     => ($article->updated_at ?? $published)?->toIso8601String(),
            'mainEntityOfPage' => $this->url($request, '/actualites/'.$article->slug),
            'author'           => ['@type' => 'Organization', 'name' => self::SITE, 'url' => $this->url($request, '/')],
            'publisher'        => [
                '@type' => 'Organization', 'name' => self::SITE,
                'logo'  => ['@type' => 'ImageObject', 'url' => $this->url($request, '/logo-black.png')],
            ],
        ]);

        return $this->render($request, [
            'title'       => $article->title.' · '.self::SITE,
            'description' => $description,
            'image'       => $article->cover_url,
            'type'        => 'article',
            'extra'       => $published ? ['article:published_time' => $published->toIso8601String()] : [],
            'schema'      => [$news],
            'breadcrumb'  => [['Actualités', '/actualites'], [$article->title, '/actualites/'.$article->slug]],
        ]);
    }

    // ------------------------------------------------------------------ helpers

    /**
     * A player whose name order changed keeps his old URL working: same
     * words, different order (e.g. tesfegabir-solomon-hanibal → hanibal-tesfegabir-solomon).
     */
    private function renamedPlayer(string $slug): ?string
    {
        $words = collect(explode('-', strtolower($slug)))->filter()->sort()->values()->all();
        if (count($words) < 2) {
            return null;
        }
        return Player::where('is_published', true)->pluck('slug')
            ->first(fn ($s) => collect(explode('-', $s))->filter()->sort()->values()->all() === $words);
    }

    private function notFound(Request $request): Response
    {
        return $this->render($request, [
            'title'       => 'Page introuvable · '.self::SITE,
            'description' => self::DEFAULT_DESCRIPTION,
            'robots'      => 'noindex, follow',
        ], 404);
    }

    /** Database or other failure: never break the page, serve the app with its generic tags. */
    private function degraded(Request $request, Throwable $e): Response
    {
        Log::warning('Public page meta unavailable', ['path' => $request->path(), 'error' => $e->getMessage()]);
        return $this->render($request, ['title' => self::DEFAULT_TITLE, 'description' => self::DEFAULT_DESCRIPTION]);
    }

    /**
     * @param array{title:string,description:string,image?:?string,type?:string,extra?:array<string,string>,schema?:array,breadcrumb?:array,robots?:string} $meta
     */
    private function render(Request $request, array $meta, int $status = 200): Response
    {
        $url = $this->url($request, '/'.ltrim($request->path(), '/'));
        $image = $this->absolute($request, $meta['image'] ?? null) ?? $this->url($request, '/logo-black.png');
        [$w, $h] = $this->dimensions($meta['image'] ?? null);

        $tags = [
            '<title data-rh="true">'.e($meta['title']).'</title>',
            $this->meta('name', 'description', Str::squish($meta['description'])),
            '<link data-rh="true" rel="canonical" href="'.e($url).'" />',
            $this->meta('property', 'og:type', $meta['type'] ?? 'website'),
            $this->meta('property', 'og:site_name', self::SITE),
            $this->meta('property', 'og:locale', 'fr_FR'),
            $this->meta('property', 'og:url', $url),
            $this->meta('property', 'og:title', $meta['title']),
            $this->meta('property', 'og:description', Str::squish($meta['description'])),
            $this->meta('property', 'og:image', $image),
            $w && $h ? $this->meta('property', 'og:image:width', (string) $w) : '',
            $w && $h ? $this->meta('property', 'og:image:height', (string) $h) : '',
            $this->meta('property', 'og:image:alt', $meta['title']),
            $this->meta('name', 'twitter:card', 'summary_large_image'),
            $this->meta('name', 'twitter:title', $meta['title']),
            $this->meta('name', 'twitter:description', Str::squish($meta['description'])),
            $this->meta('name', 'twitter:image', $image),
        ];
        foreach ($meta['extra'] ?? [] as $property => $content) {
            $tags[] = $this->meta('property', $property, $content);
        }
        if (isset($meta['robots'])) {
            $tags[] = $this->meta('name', 'robots', $meta['robots']);
        }

        $graph = $meta['schema'] ?? [];
        if (! empty($meta['breadcrumb'])) {
            $items = [['Accueil', '/'], ...$meta['breadcrumb']];
            $graph[] = [
                '@type'           => 'BreadcrumbList',
                'itemListElement' => array_map(fn ($item, $i) => [
                    '@type' => 'ListItem', 'position' => $i + 1, 'name' => $item[0], 'item' => $this->url($request, $item[1]),
                ], $items, array_keys($items)),
            ];
        }
        if ($graph) {
            $json = json_encode(['@context' => 'https://schema.org', '@graph' => $graph],
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);
            $tags[] = '<script type="application/ld+json" data-rh="true">'.$json.'</script>';
        }

        $head = implode("\n    ", array_filter($tags));
        $shell = $this->shell();
        $html = $shell !== null
            ? $this->inject($shell, $head)
            : "<!doctype html>\n<html lang=\"fr\">\n<head>\n    <meta charset=\"utf-8\" />\n    {$head}\n</head>\n<body>\n    <h1>".e($meta['title'])."</h1>\n    <p>".e($meta['description'])."</p>\n</body>\n</html>";

        return response($html, $status, [
            'Content-Type'  => 'text/html; charset=UTF-8',
            // The shell references hashed assets: keep it fresh after deploys.
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    /** Replaces the shell's generic head tags with the page's own. */
    private function inject(string $shell, string $head): string
    {
        $shell = preg_replace([
            '#\s*<title[^>]*>.*?</title>#is',
            '#\s*<meta\s+(?:name|property)="(?:description|robots|googlebot|og:[^"]+|twitter:[^"]+)"[^>]*>#i',
            '#\s*<link\s+rel="canonical"[^>]*>#i',
        ], '', $shell);
        return preg_replace('#</head>#i', "    {$head}\n  </head>", $shell, 1);
    }

    /** The built SPA entry point (public_html/index.html in production). */
    private function shell(): ?string
    {
        $candidates = array_filter([
            config('app.spa_index'),
            base_path('../public_html/index.html'),
            base_path('../frontend/dist/index.html'),
        ]);
        foreach ($candidates as $path) {
            if (is_file($path)) {
                return (string) file_get_contents($path);
            }
        }
        return null;
    }

    private function meta(string $attr, string $key, string $content): string
    {
        return '<meta data-rh="true" '.$attr.'="'.e($key).'" content="'.e($content).'" />';
    }

    private function url(Request $request, string $path): string
    {
        return $request->getSchemeAndHttpHost().($path === '/' ? '/' : '/'.ltrim($path, '/'));
    }

    private function absolute(Request $request, ?string $url): ?string
    {
        if (! $url) {
            return null;
        }
        return preg_match('#^https?://#i', $url) ? $url : $this->url($request, $url);
    }

    /** Real pixel size of an image stored on our public disk, if known. */
    private function dimensions(?string $url): array
    {
        if (! $url || ! str_starts_with($url, '/storage/')) {
            return [null, null];
        }
        $path = Storage::disk('public')->path(substr($url, strlen('/storage/')));
        $size = is_file($path) ? @getimagesize($path) : false;
        return $size ? [$size[0], $size[1]] : [null, null];
    }
}
