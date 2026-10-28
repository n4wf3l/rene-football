<?php

namespace App\Services\Presentations\Fiche;

use App\Models\Article;
use App\Models\Player;
use App\Services\Presentations\HeatmapRenderer;
use Carbon\Carbon;
use Throwable;

/**
 * Builds the FicheData for a player + presentation options. This is where
 * the business rules live:
 *
 *  - defaults come from FicheCompositions (same values the editor shows);
 *  - stats are only printed when they are real (a stats source is recorded
 *    or the player has played matches), updated within the last month, and
 *    the value exists — never zeros standing in for missing data;
 *  - QR target priority: custom URL > YouTube > published article;
 *  - `$overrides` lets the editor preview unsaved player edits (bio) without
 *    writing them to the database.
 */
class FicheDataFactory
{
    /** Stats older than this are left out of the fiche (mirrors frontend lib/playerDisplay). */
    public const STATS_FRESH_DAYS = 31;

    public function __construct(private readonly FicheAssets $assets)
    {
    }

    public function build(Player $player, array $options, array $overrides = []): FicheData
    {
        $composition = FicheCompositions::keyFor($options);
        // Unset or null options fall back to the composition defaults.
        $o    = array_filter($options, static fn ($v) => $v !== null) + FicheCompositions::defaults($composition);
        $i18n = FicheI18n::for($o['language'] ?? 'fr');
        $d    = new FicheData();

        $d->composition   = $composition;
        $d->lang          = $i18n->lang;
        $d->palette       = FicheTheme::resolve($o);
        $d->fontFamily    = in_array($o['font_family'], ['sans', 'grotesque', 'editorial'], true) ? $o['font_family'] : 'sans';
        $d->fontScale     = match ($o['font_scale']) { 'small' => 0.92, 'large' => 1.08, default => 1.0 };
        $d->photoSide     = $o['photo_side'] === 'left' ? 'left' : 'right';
        $d->middleVariant = in_array($o['middle_variant'], ['profile-strengths', 'profile-caracteristiques', 'parcours-strengths', 'profile-bars'], true)
            ? $o['middle_variant'] : 'profile-strengths';

        $this->identity($d, $player, $i18n);
        $this->visuals($d, $player, $o);
        $this->profile($d, $player, $o, $i18n, $overrides);
        $this->project($d, $o);
        $this->branding($d, $o, $i18n);

        return $d;
    }

    private function identity(FicheData $d, Player $p, FicheI18n $i18n): void
    {
        $d->fullName = trim((string) $p->name);
        $parts = preg_split('/\s+/', $d->fullName) ?: [];
        $d->firstName = (string) ($parts[0] ?? '');
        $d->lastName  = implode(' ', array_slice($parts, 1));
        if ($d->lastName === '') {
            [$d->firstName, $d->lastName] = ['', $d->firstName];
        }

        $best = self::clean($p->best_position);
        $pos  = self::clean($p->position);
        $d->position       = $best ?? $pos;
        $d->positionDetail = ($best && $pos && mb_strtolower($best) !== mb_strtolower($pos)) ? $pos : null;
        $d->category       = $i18n->category($p->category);

        if ($p->date_of_birth) {
            try {
                $dob = Carbon::parse($p->date_of_birth);
                $d->birthDate = $i18n->date($dob);
                $d->age = $dob->age;
            } catch (Throwable) {
            }
        }
        $d->age ??= $p->age ? (int) $p->age : null;

        $d->footRaw = self::clean($p->preferred_foot);
        $d->foot    = $i18n->foot($d->footRaw);
        $d->height  = $p->height ? self::clean((string) $p->height) : null;
        if ($d->height && preg_match('/^\d{3}$/', $d->height)) $d->height .= ' cm';

        foreach ([$p->nationality, $p->secondary_nationality] as $nat) {
            $label = self::clean($nat);
            if ($label) {
                $d->nationalities[] = ['label' => $label, 'flag' => $this->assets->flag(FicheAssets::countryCode($label))];
            }
        }
        $d->languages = array_values(array_filter(array_map([self::class, 'clean'], (array) ($p->languages_spoken ?? []))));

        $d->club     = self::clean($p->club);
        $d->clubLogo = $this->assets->image($p->club_logo_url);
        $d->previousClub     = self::clean($p->previous_club);
        $d->previousClubLogo = $this->assets->image($p->previous_club_logo);
    }

    private function visuals(FicheData $d, Player $p, array $o): void
    {
        $src = ($o['photo_source'] === 'custom' && ! empty($o['custom_photo_url'])) ? $o['custom_photo_url'] : $p->photo_url;
        $d->photo     = $this->assets->image($src);
        $d->photoFit  = $o['photo_fit'] === 'contain' ? 'contain' : 'cover';
        $d->photoZoom = (int) $o['photo_zoom'];
        $d->photoX    = (int) $o['photo_position_x'];
        $d->photoY    = (int) $o['photo_position_y'];

        foreach ((array) ($p->gallery_photos ?? []) as $url) {
            if ($img = $this->assets->image(is_string($url) ? $url : null)) {
                $d->gallery[] = $img;
            }
        }
    }

    private function profile(FicheData $d, Player $p, array $o, FicheI18n $i18n, array $overrides): void
    {
        $bio = array_key_exists('bio', $overrides) ? $overrides['bio'] : $p->bio;
        $d->bio        = trim((string) $bio);
        $d->scoutQuote = trim((string) $p->scout_quote);

        foreach ((array) ($p->strengths ?? []) as $s) {
            $label = is_array($s) ? ($s['label'] ?? '') : (is_string($s) ? $s : '');
            if ($label = self::clean($label)) $d->strengths[] = $label;
        }
        $d->mental       = array_values(array_filter(array_map([self::class, 'clean'], (array) ($p->mental_strengths ?? []))));
        $d->playingStyle = self::clean($p->playing_style);
        $d->objective    = self::clean($p->objective);

        $career = [];
        foreach ((array) ($p->career_history ?? []) as $i => $h) {
            if (! is_array($h)) continue;
            $club  = self::clean($h['club'] ?? null);
            $years = self::clean($h['years'] ?? null);
            if (! $club && ! $years) continue;
            preg_match('/(19|20)\d{2}/', (string) $years, $m);
            $career[] = ['years' => (string) $years, 'club' => (string) $club, 'logo' => $this->assets->image($h['logo_url'] ?? null), '_start' => (int) ($m[0] ?? 0), '_i' => $i];
        }
        // Oldest first; entries without a year keep their typed order at the end.
        usort($career, static fn ($a, $b) => [$a['_start'] ?: PHP_INT_MAX, $a['_i']] <=> [$b['_start'] ?: PHP_INT_MAX, $b['_i']]);
        $d->career = array_map(static fn ($c) => ['years' => $c['years'], 'club' => $c['club'], 'logo' => $c['logo']], $career);

        foreach ((array) ($o['player_profile_bars'] ?? []) as $b) {
            if (! is_array($b) || ! ($label = self::clean($b['label'] ?? null))) continue;
            $d->bars[] = ['label' => $label, 'pct' => max(0, min(100, (int) ($b['pct'] ?? 0)))];
        }

        $this->stats($d, $p, $o, $i18n);

        if (! empty($o['show_heatmap']) && HeatmapRenderer::isRenderable($p->heatmap_grid)) {
            $d->heatmapPath = $this->heatmapFile($p->heatmap_grid);
        }

        foreach ((array) ($p->comparisons ?? []) as $c) {
            if (! is_array($c) || ! ($name = self::clean($c['name'] ?? null))) continue;
            $d->comparisons[] = ['name' => $name, 'club' => (string) self::clean($c['club'] ?? null)];
        }

        if ($p->potential_rating !== null && (float) $p->potential_rating > 0) {
            $d->potentialRating = max(0.0, min(10.0, (float) $p->potential_rating));
            $d->potentialLabel  = self::clean($p->potential_label);
        }
    }

    private function stats(FicheData $d, Player $p, array $o, FicheI18n $i18n): void
    {
        // Real (sourced or played) AND recent: same rule as the public profile,
        // a stale or never-dated stat line would discredit the document.
        $fresh = $p->stats_updated_at && Carbon::parse($p->stats_updated_at)->gt(now()->subDays(self::STATS_FRESH_DAYS));
        $real = $fresh && (self::clean($p->stats_source) !== null || (int) $p->matches_played > 0);
        if ($real) {
            $d->statsSource = self::clean($p->stats_source);
            $selected = array_values(array_filter((array) ($o['selected_stats'] ?? []), 'is_string'));
            if (! $selected) {
                $selected = $p->category === 'Gardien'
                    ? ['matches_played', 'clean_sheets', 'saves', 'pass_accuracy']
                    : ['matches_played', 'goals', 'assists', 'minutes_played'];
            }
            foreach (array_slice($selected, 0, 4) as $key) {
                if (! $i18n->has('st_'.$key) || $p->{$key} === null) continue;
                $v = (float) $p->{$key};
                $d->stats[] = [
                    'label'  => $i18n->t('st_'.$key),
                    'value'  => in_array($key, ['xg', 'xa'], true) ? $i18n->number($v, 1) : $i18n->number($v),
                    'suffix' => $key === 'pass_accuracy' ? '%' : '',
                ];
            }
        }

        if ($p->distance_avg_km !== null)         $d->physical[] = ['label' => $i18n->t('phy_distance'),  'value' => $i18n->number((float) $p->distance_avg_km, 1).' km'];
        if ($p->top_speed_kmh !== null)           $d->physical[] = ['label' => $i18n->t('phy_top_speed'), 'value' => $i18n->number((float) $p->top_speed_kmh, 1).' km/h'];
        if ($p->sprints_avg !== null)             $d->physical[] = ['label' => $i18n->t('phy_sprints'),   'value' => (string) (int) $p->sprints_avg];
        if ($p->high_intensity_runs_avg !== null) $d->physical[] = ['label' => $i18n->t('phy_hir'),       'value' => (string) (int) $p->high_intensity_runs_avg];
    }

    private function project(FicheData $d, array $o): void
    {
        $d->projectIntro = trim((string) ($o['projet_intro'] ?? ''));

        foreach ((array) ($o['partner_academies'] ?? []) as $g) {
            if (! is_array($g)) continue;
            $clubs = [];
            foreach ((array) ($g['clubs'] ?? []) as $c) {
                if (! is_array($c)) continue;
                $name = (string) self::clean($c['name'] ?? null);
                $logo = $this->assets->image($c['logo_url'] ?? null);
                if ($name !== '' || $logo) $clubs[] = ['name' => $name, 'logo' => $logo];
            }
            $country = (string) self::clean($g['country'] ?? null);
            if ($country === '' && ! $clubs) continue;
            $code = self::clean($g['country_code'] ?? null) ?? FicheAssets::countryCode($country);
            $d->academies[] = ['country' => $country, 'flag' => $this->assets->flag($code), 'clubs' => $clubs];
        }

        $d->supervisedBy = $this->org($o['supervised_by'] ?? null);
        $d->partner      = $this->org($o['partner_agency'] ?? null);
    }

    private function org(mixed $raw): ?array
    {
        if (! is_array($raw)) return null;
        $name    = (string) self::clean($raw['name'] ?? null);
        $logo    = $this->assets->image($raw['logo_url'] ?? null);
        $country = (string) self::clean($raw['country'] ?? null);
        $desc    = (string) self::clean($raw['description'] ?? ($raw['note'] ?? null));
        if ($name === '' && ! $logo && $country === '' && $desc === '') return null;
        $code = self::clean($raw['country_code'] ?? null) ?? FicheAssets::countryCode($country);
        return ['name' => $name, 'logo' => $logo, 'country' => $country, 'flag' => $this->assets->flag($code), 'description' => $desc];
    }

    private function branding(FicheData $d, array $o, FicheI18n $i18n): void
    {
        $d->tagline     = trim((string) ($o['tagline'] ?? ''));
        $d->headerMotto = trim((string) ($o['header_motto'] ?? ''));
        $d->motto       = trim((string) ($o['motto'] ?? ''));
        $d->slogan      = trim((string) ($o['slogan_cursive'] ?? ''));
        $d->watermark   = filter_var($o['show_watermark'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $d->logo        = $this->assets->brandLogo(FicheTheme::luminance($d->palette['bg']) > 0.6 ? 'black' : 'white');

        $contact = is_array($o['contact'] ?? null) ? $o['contact'] : [];
        foreach (FicheCompositions::CONTACT_DEFAULTS as $k => $default) {
            $v = array_key_exists($k, $contact) ? trim((string) $contact[$k]) : $default;
            $d->contact[$k] = $v;
        }

        $d->qr = $this->qrTarget($o);
        $d->issuedOn = $i18n->t('edited_on', $i18n->date(now()));
    }

    /** @return ?array{image:FicheImage, label:string, url:string} */
    private function qrTarget(array $o): ?array
    {
        $candidates = [trim((string) ($o['qr_custom_url'] ?? '')), trim((string) ($o['youtube_url'] ?? ''))];
        if ($slug = self::clean($o['article_slug'] ?? null)) {
            $article = Article::where('slug', $slug)->where('is_published', true)->first();
            if ($article) $candidates[] = url('/actualites/'.$article->slug);
        }
        foreach ($candidates as $url) {
            if ($url !== '' && ($img = $this->assets->qr($url))) {
                $host = preg_replace('/^www\./', '', (string) parse_url($url, PHP_URL_HOST));
                return ['image' => $img, 'label' => $host, 'url' => $url];
            }
        }
        return null;
    }

    private function heatmapFile(array $grid): ?string
    {
        $dir = storage_path('app/fiche-cache/heatmaps');
        if (! is_dir($dir)) @mkdir($dir, 0775, true);
        $path = $dir.DIRECTORY_SEPARATOR.sha1(json_encode($grid)).'.png';
        if (! is_file($path)) file_put_contents($path, HeatmapRenderer::png($grid));
        return $path;
    }

    public static function clean(mixed $v): ?string
    {
        if (! is_scalar($v)) return null;
        $s = trim(preg_replace('/\s+/u', ' ', (string) $v) ?? '');
        return $s === '' ? null : $s;
    }
}
