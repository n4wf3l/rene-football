# Analytics roadmap — server-side aggregate tracking

**Status:** planned · not started
**Date:** 2026-09-28
**Related issue:** _linked once opened on GitHub_

## Why

The site currently ships with an explicit "no tracking, no analytics" stance
(see [/confidentialite](../frontend/src/pages/legal/Confidentialite.tsx) and
the [`CookieNotice`](../frontend/src/components/CookieNotice.tsx)). This
covered our CNPD obligations at launch but leaves the agency blind to what
actually works on the site:

- which player fiches attract the most clubs / journalists
- which articles get read and which are ignored
- whether the "Écrire à l'agence" audience picker on the home converts
- whether the per-player deep-link CTAs (`?reason=club&player_id=X`)
  actually produce contact submissions
- traffic sources (Instagram, Google, direct, referrals)

Third-party services (Plausible, Fathom, GA) were considered and ruled
out: the agency does not want a recurring subscription, and any
JavaScript-based tracker still needs to be listed in the cookie policy
even when cookieless.

## Chosen approach — server-side aggregate

Store hits as-they-happen in a Laravel table, aggregate on demand, expose
a dashboard in `/admin/analytics`. Under the CNPD's own cookie doctrine
(November 2021) this pattern does not require consent as long as the
processed data is truly anonymous.

### Anonymisation guarantee

Each row carries a `visitor_hash`, computed at insert time as:

```
visitor_hash = SHA-256(APP_KEY || IP || User-Agent || date('Y-m-d'))
```

- `APP_KEY` is server-only and never leaves the machine → the hash is
  not reversible by a client or a third party who obtained a dump.
- The daily component means yesterday's visitor and today's visitor
  produce different hashes even if they are the same person → no
  cross-day tracking of individuals.
- The IP is used to compute the hash but **never stored**. Same for the
  full User-Agent.
- Unique-visitor counts stay meaningful within a single day (same
  person, same day, same hash).

## Deliverables

### Backend

- `migrations/YYYY_MM_DD_create_page_views_table.php`
  Columns: `id`, `path`, `slug` (nullable), `resource_type` (nullable enum:
  `player | article | page`), `visitor_hash`, `referrer_host` (nullable),
  `viewed_at` (indexed). No IP, no full UA.
- `App\Models\PageView` (Eloquent).
- `App\Http\Controllers\Api\TrackController@view` on `POST /api/track/view`
  - validates payload (`path` required, `slug` / `resource_type` /
    `referrer` optional)
  - filters bots via User-Agent regex (Googlebot, Bingbot, AhrefsBot,
    SemrushBot, empty UA…)
  - rate-limits to 60/min/IP
  - computes `visitor_hash` per the formula above
  - inserts a row, returns `204 No Content`
- `App\Http\Controllers\Api\Admin\AdminAnalyticsController`
  - `GET /admin/analytics/overview` — total views + unique visitors +
    top pages over `?days=N`
  - `GET /admin/analytics/players` — top-viewed players
  - `GET /admin/analytics/articles` — top-viewed articles
  - `GET /admin/analytics/referrers` — top referrer hosts
  - `GET /admin/analytics/timeseries?days=30` — daily views
  - `GET /admin/analytics/funnel?player_slug=X` — visits vs
    /contact?player_id=X conversions

### Frontend

- `frontend/src/hooks/usePageView.ts`
  - Mounts once, listens to `useLocation()`
  - Skips admin routes and `.well-known/*`
  - `fetch('/api/track/view', {method:'POST', keepalive:true})` — silent,
    non-blocking, ignores errors
- Mount `usePageView` inside `PublicLayout` (public routes only).
- New page `frontend/src/pages/admin/AdminAnalytics.tsx`
  - KPI cards: total views 30d, unique visitors, best-performing page
  - Line chart (existing chart lib) — daily views last 30d
  - Table: top players (with `%` share of total)
  - Table: top articles
  - Table: top referrers
  - Table: player-to-contact conversion funnel
- Route entry in `App.tsx` under `/admin/analytics`
- Sidebar link in `AdminLayout.tsx` (new `ChartLineUp` or similar icon)

### Privacy policy update

- Update `/confidentialite` — new section "Statistiques anonymes de
  fréquentation" explaining the `visitor_hash` scheme, the fields
  collected, retention window, and confirming no cookies / no
  fingerprinting.
- Update `/cookies` — a short mention that server-side hit counting
  runs without any browser storage.
- Rewrite the `CookieNotice` body text:
  from *"Aucune analytique, aucun cookie de suivi"*
  to *"Compteurs anonymes agrégés côté serveur (visitor hash rotant
  quotidien). Aucun cookie, aucun pistage individuel."*
- Bump the storage key of the notice
  (`rf_cookie_notice_ack` → `rf_cookie_notice_ack_v2`) so returning
  visitors are re-shown the updated text once.

### Retention & housekeeping

Not in scope for the MVP, listed for follow-up:

- Nightly `php artisan schedule:run` job that prunes `page_views` rows
  older than 30 days.
- Nightly aggregation into a `daily_page_stats` table so the admin
  dashboard can go past 30 days without scanning the raw table.

## Not in scope

- Country breakdown (GeoIP lookup)
- Scroll depth, heatmaps
- Individual visitor journeys (would require a stable per-visitor id,
  which breaks the anonymisation property)
- Client-side event tracking beyond page views (e.g. button clicks) —
  can be added if the admin flags a specific event as high-value
- A/B testing framework
- Email notifications on traffic spikes

## Sources

- [CNPD · Cookies : principes applicables (nov 2021)](https://cnpd.public.lu/fr/dossiers-thematiques/cookies0/cookies/principes-applicables.html)
- [CNPD · Guide de mise en conformité RGPD](https://cnpd.public.lu/fr/dossiers-thematiques/Reglement-general-sur-la-protection-des-donnees/responsabilite-accrue-des-responsables-du-traitement/guide-preparation-rgpd.html)
- [Plausible · Data policy (reference for the daily-rotating hash pattern)](https://plausible.io/data-policy)
