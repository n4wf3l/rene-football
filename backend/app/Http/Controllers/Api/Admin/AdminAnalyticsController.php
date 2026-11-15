<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ContactSubmission;
use App\Models\PageView;
use App\Models\Player;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/admin/analytics?days=30 — everything the "Fréquentation" page
 * needs in one round-trip: totals vs the previous period, a daily series,
 * top pages / players / articles, traffic sources and, per player, how many
 * contact requests mentioned them.
 *
 * "Visits" count distinct visitor_hash values. The hash rotates every day,
 * so one person is counted once per day they come back, never followed
 * across days.
 */
class AdminAnalyticsController extends Controller
{
    private const PERIODS = [7, 30, 90, 365];
    private const TOP = 10;

    public function overview(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);
        if (! in_array($days, self::PERIODS, true)) {
            $days = 30;
        }

        $to = CarbonImmutable::now();
        $from = $to->startOfDay()->subDays($days - 1);
        $prevFrom = $from->subDays($days);

        $range = fn (CarbonImmutable $a, CarbonImmutable $b) => PageView::query()->where('viewed_at', '>=', $a)->where('viewed_at', '<', $b);
        $current = fn () => $range($from, $to->addSecond());
        $previous = fn () => $range($prevFrom, $from);

        $views = $current()->count();
        $visits = $current()->distinct()->count('visitor_hash');

        return response()->json([
            'range' => [
                'days' => $days,
                'from' => $from->toDateString(),
                'to'   => $to->toDateString(),
            ],
            'totals' => [
                'views'           => $views,
                'visits'          => $visits,
                'pages_per_visit' => $visits > 0 ? round($views / $visits, 1) : 0,
                'prev_views'      => $previous()->count(),
                'prev_visits'     => $previous()->distinct()->count('visitor_hash'),
            ],
            'timeseries' => $this->timeseries($current(), $from, $days),
            'top_pages'  => $this->grouped($current(), 'path')->map(fn ($r) => [
                'path'   => $r->path,
                'views'  => (int) $r->views,
                'visits' => (int) $r->visits,
            ])->values(),
            'players'   => $this->players($current(), $from),
            'articles'  => $this->articles($current()),
            'referrers' => $this->referrers($current()),
        ]);
    }

    /** @return list<array{date: string, views: int, visits: int}> */
    private function timeseries(Builder $query, CarbonImmutable $from, int $days): array
    {
        $rows = $query
            ->selectRaw('DATE(viewed_at) as day, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visits')
            ->groupBy('day')
            ->get()
            ->keyBy(fn ($r) => (string) $r->day);

        // Every day of the period, including the ones without any view.
        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $day = $from->addDays($i)->toDateString();
            $row = $rows->get($day);
            $series[] = ['date' => $day, 'views' => (int) ($row->views ?? 0), 'visits' => (int) ($row->visits ?? 0)];
        }
        return $series;
    }

    private function grouped(Builder $query, string $column)
    {
        return $query
            ->select($column, DB::raw('COUNT(*) as views'), DB::raw('COUNT(DISTINCT visitor_hash) as visits'))
            ->groupBy($column)
            ->orderByDesc('views')
            ->limit(self::TOP)
            ->get();
    }

    private function players(Builder $query, CarbonImmutable $from): array
    {
        $rows = $this->grouped($query->where('resource_type', 'player'), 'slug');
        $players = Player::query()->whereIn('slug', $rows->pluck('slug'))->get(['id', 'slug', 'name', 'club', 'photo_url'])->keyBy('slug');

        // Contact requests (club / media wizard) that named a player, over the period.
        $contacts = ContactSubmission::query()
            ->where('created_at', '>=', $from)
            ->whereIn('reason', ['club', 'medias'])
            ->get(['payload'])
            ->map(fn ($s) => (int) ($s->payload['player_id'] ?? 0))
            ->filter()
            ->countBy();

        return $rows
            ->filter(fn ($r) => $players->has($r->slug))
            ->map(function ($r) use ($players, $contacts) {
                $player = $players->get($r->slug);
                return [
                    'slug'      => $r->slug,
                    'name'      => $player->name,
                    'club'      => $player->club,
                    'photo_url' => $player->photo_url,
                    'views'     => (int) $r->views,
                    'visits'    => (int) $r->visits,
                    'contacts'  => (int) $contacts->get($player->id, 0),
                ];
            })
            ->values()
            ->all();
    }

    private function articles(Builder $query): array
    {
        $rows = $this->grouped($query->where('resource_type', 'article'), 'slug');
        $titles = Article::query()->whereIn('slug', $rows->pluck('slug'))->pluck('title', 'slug');

        return $rows
            ->filter(fn ($r) => $titles->has($r->slug))
            ->map(fn ($r) => [
                'slug'   => $r->slug,
                'title'  => $titles->get($r->slug),
                'views'  => (int) $r->views,
                'visits' => (int) $r->visits,
            ])
            ->values()
            ->all();
    }

    /** Traffic sources, counted on the first page of each visit; null host = direct. */
    private function referrers(Builder $query): array
    {
        return $query
            ->where('is_entry', true)
            ->select('referrer_host', DB::raw('COUNT(*) as visits'))
            ->groupBy('referrer_host')
            ->orderByDesc('visits')
            ->limit(self::TOP)
            ->get()
            ->map(fn ($r) => ['host' => $r->referrer_host, 'visits' => (int) $r->visits])
            ->all();
    }
}
