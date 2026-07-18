<?php

namespace App\Services\Presentations\Templates;

use App\Models\Article;
use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * Stadium - dark hero with stadium lighting, large player name and
 * everything packed into one impactful A4 portrait page. Every horizontal
 * band has a fixed height so the layout always fills the page whether or
 * not the admin added clubs / QR links / strengths.
 *
 *   HERO (135mm)   : photo + identity table + KPI strip
 *   BAND (34mm)    : strengths grid (or fallback bullets)
 *   BOTTOM (108mm) : heatmap LEFT + clubs / links RIGHT
 *   FOOTER (10mm)
 */
class StadiumTemplate extends PresentationTemplate
{
    public static function key(): string { return 'stadium'; }
    public static function label(): string { return 'Stadium'; }
    public static function description(): string
    {
        return 'Fond stade, nom XXL, photo découpée, points forts illustrés, anciens clubs et QR vers article / vidéo. Page dense, sans vide.';
    }

    public static function defaultOptions(): array
    {
        return array_merge(parent::defaultOptions(), [
            'accent_color'     => '#3b82f6',
            'secondary_color'  => '#facc15',
            'text_color'       => '#fafaf9',
            'background_color' => '#0a1220',
            'previous_clubs'   => [],
            'photo_fit'        => 'cover',
        ]);
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<defs><radialGradient id="sg" cx="50%" cy="0%" r="100%"><stop offset="0%" stop-color="#1e3a5f" stop-opacity="1"/><stop offset="100%" stop-color="#0a1220" stop-opacity="1"/></radialGradient></defs>'
            .'<rect width="60" height="84" fill="url(#sg)"/>'
            .'<circle cx="14" cy="3" r="2" fill="#fafaf9" opacity="0.6"/>'
            .'<circle cx="30" cy="2" r="2" fill="#fafaf9" opacity="0.8"/>'
            .'<circle cx="46" cy="3" r="2" fill="#fafaf9" opacity="0.6"/>'
            .'<rect x="4" y="10" width="24" height="30" fill="#3b82f6" opacity="0.7"/>'
            .'<rect x="32" y="10" width="24" height="4" fill="#fafaf9"/>'
            .'<rect x="32" y="18" width="20" height="2" fill="#fafaf9" opacity="0.5"/>'
            .'<rect x="32" y="22" width="22" height="2" fill="#fafaf9" opacity="0.5"/>'
            .'<rect x="32" y="26" width="18" height="2" fill="#fafaf9" opacity="0.5"/>'
            .'<rect x="4" y="44" width="52" height="8" fill="#facc15" opacity="0.9"/>'
            .'<rect x="4" y="56" width="52" height="10" fill="#3b82f6" opacity="0.5"/>'
            .'<circle cx="10" cy="61" r="1.5" fill="#facc15"/>'
            .'<circle cx="24" cy="61" r="1.5" fill="#facc15"/>'
            .'<circle cx="38" cy="61" r="1.5" fill="#facc15"/>'
            .'<rect x="4" y="70" width="24" height="10" fill="#fafaf9" opacity="0.08"/>'
            .'<rect x="32" y="70" width="24" height="10" fill="#fafaf9" opacity="0.08"/>'
            .'</svg>';
    }

    public function render(Player $player, array $options, string $title): string
    {
        $accent     = $options['accent_color']     ?? '#3b82f6';
        $secondary  = $options['secondary_color']  ?? '#facc15';
        $text       = $options['text_color']       ?? '#fafaf9';
        $bg         = $options['background_color'] ?? '#0a1220';
        $tagline    = $options['tagline'] ?? null;

        $photo = $this->pickPhoto($player, $options);
        // The photo frame background matches the stage so contain-mode letterbox blends in.
        $photoBlock = $this->photoFrame($photo, $options, 'rgba(255,255,255,0.04)');
        $fontFamily = $this->fontFamily($options);
        $tracking   = $this->fontTracking($options);
        $ptBody     = $this->pt(10, $options);

        // Identity (kept dense, up to 8 rows so the right column always looks filled).
        $identity = [
            [mb_strtoupper($this->t('nationality', $options)), $player->nationality ?: '-'],
            [mb_strtoupper($this->t('age', $options)),         ((int) $player->age).' '.$this->t('years_old', $options)],
            [mb_strtoupper($this->t('position', $options)),    strtoupper($player->position ?: '-')],
            [mb_strtoupper($this->t('category', $options)),    mb_strtoupper($this->tCategory($player->category, $options))],
        ];
        if ($player->height)          $identity[] = [mb_strtoupper($this->t('height', $options)),         $player->height];
        if ($player->preferred_foot)  $identity[] = [mb_strtoupper($this->t('preferred_foot', $options)), mb_strtoupper($this->tFoot($player->preferred_foot, $options))];
        if ($player->since)           $identity[] = [mb_strtoupper($this->t('since', $options)),          (string) $player->since];
        if ($player->potential_rating) {
            $identity[] = [
                mb_strtoupper($this->t('potential', $options)),
                number_format((float) $player->potential_rating, 1, ',', '').'/10'.($player->potential_label ? ' · '.strtoupper($player->potential_label) : ''),
            ];
        }

        $identityHtml = '';
        foreach ($identity as $r) {
            $identityHtml .= '<tr><td class="ikey">'.$this->esc($r[0]).'</td><td class="ival">'.$this->esc((string) $r[1]).'</td></tr>';
        }

        // KPI strip - always visible so the hero never trails off into empty space.
        $stats = $this->statRows($player, $options);
        // Pad to exactly 4 tiles so the row never collapses.
        while (count($stats) < 4) {
            $stats[] = ['label' => '-', 'value' => '-', 'suffix' => ''];
        }
        $stats = array_slice($stats, 0, 4);
        $kpiHtml = '';
        foreach ($stats as $s) {
            $kpiHtml .= '<td class="kpi">'
                .'<div class="kpi-val">'.$this->esc((string) $s['value']).'<span>'.$this->esc($s['suffix']).'</span></div>'
                .'<div class="kpi-lbl">'.$this->esc($s['label']).'</div>'
                .'</td>';
        }

        // Strengths - 2x3 grid. When empty, fall back to a message so the band still
        // has weight instead of vanishing.
        $strengths = is_array($player->strengths) ? array_slice($player->strengths, 0, 6) : [];
        $strengthsHtml = '';
        if (! empty($strengths)) {
            // Group into rows of 3 (matches the reference PDF layout).
            $rows = array_chunk($strengths, 3);
            foreach ($rows as $row) {
                $strengthsHtml .= '<tr>';
                foreach ($row as $s) {
                    $label = is_array($s) && isset($s['label']) ? $s['label'] : (is_string($s) ? $s : '');
                    if ($label === '') continue;
                    $strengthsHtml .= '<td class="strength">'
                        .'<span class="strength-dot" style="background:'.$secondary.';"></span>'
                        .'<span class="strength-label">'.$this->esc(strtoupper($label)).'</span>'
                        .'</td>';
                }
                // Pad to 3 columns.
                for ($i = count($row); $i < 3; $i++) {
                    $strengthsHtml .= '<td class="strength">&nbsp;</td>';
                }
                $strengthsHtml .= '</tr>';
            }
        } else {
            $strengthsHtml = '<tr><td colspan="3" class="strength strength-empty">'.$this->esc($this->t('no_strengths', $options)).'</td></tr>';
        }

        // Bottom-left: heatmap.
        // Bottom section is 127mm - reserve ~85mm for the heatmap so it feels
        // like a real map rather than a thumbnail.
        $heatmap = $this->heatmapHtml($player, array_merge($options, ['_heatmap_height_mm' => 85]));

        // Bottom-right: clubs list + QR links, stacked. Fallback to bio/quote when both
        // are empty so the block doesn't feel deserted.
        $clubs = is_array($options['previous_clubs'] ?? null) ? $options['previous_clubs'] : [];
        $clubsHtml = '';
        if (! empty($clubs)) {
            $cells = '';
            foreach ($clubs as $c) {
                $name = $c['name'] ?? '';
                $logo = $c['logo_url'] ?? null;
                if ($name === '' && ! $logo) continue;
                $img = $logo
                    ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:12mm;max-width:20mm;object-fit:contain;">'
                    : '<div style="height:12mm;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:7pt;letter-spacing:1px;">'.$this->esc(strtoupper($name)).'</div>';
                $cells .= '<td style="text-align:center;padding:0 2mm;vertical-align:middle;">'.$img.'</td>';
            }
            $clubsHtml = '<div class="mini-title">'.$this->esc(mb_strtoupper($this->t('previous_clubs', $options))).'</div><table class="clubs"><tr>'.$cells.'</tr></table>';
        }

        $articleSlug = $options['article_slug'] ?? null;
        $youtubeUrl  = $options['youtube_url'] ?? null;

        $articleUrl = null;
        if ($articleSlug) {
            $article = Article::where('slug', $articleSlug)->first();
            if ($article) $articleUrl = url('/actualites/'.$article->slug);
        }

        // Truncate the display URL - DomPDF doesn't break long unbroken
        // strings and lets them overflow the page. The full URL still lives
        // in the QR code, which is the point.
        $shortUrl = static function (string $u): string {
            $stripped = preg_replace('#^https?://(www\.)?#', '', $u) ?? $u;
            return mb_strlen($stripped) > 32 ? mb_substr($stripped, 0, 30).'…' : $stripped;
        };

        $linkBlocks = '';
        if ($articleUrl) {
            $linkBlocks .= '<div class="link-row"><img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data='.urlencode($articleUrl).'"><div class="link-meta"><div class="link-label" style="color:'.$secondary.';">'.$this->esc($this->t('article', $options)).'</div><div class="link-url">'.$this->esc($shortUrl($articleUrl)).'</div></div></div>';
        }
        if ($youtubeUrl) {
            $linkBlocks .= '<div class="link-row"><img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data='.urlencode($youtubeUrl).'"><div class="link-meta"><div class="link-label" style="color:'.$secondary.';">'.$this->esc($this->t('video', $options)).'</div><div class="link-url">'.$this->esc($shortUrl($youtubeUrl)).'</div></div></div>';
        }

        // Compact physique tiles (used below the heatmap on the left so the
        // bottom band never trails off into empty space).
        $phyRows = $this->physiqueRows($player);
        $physiqueHtml = '';
        if (! empty($phyRows)) {
            $tiles = '';
            foreach ($phyRows as [$key, $value]) {
                $tiles .= '<td style="text-align:center;padding:3mm 2mm;background:rgba(255,255,255,0.05);border-left:2px solid '.$accent.';">'
                    .'<div style="font-size:13pt;font-weight:800;color:'.$text.';line-height:1;">'.$this->esc($value).'</div>'
                    .'<div style="font-size:5.5pt;letter-spacing:1.5px;text-transform:uppercase;color:'.$secondary.';margin-top:1.5mm;">'.$this->esc($this->t($key, $options)).'</div>'
                    .'</td><td style="width:2mm;"></td>';
            }
            $physiqueHtml = '<div style="margin-top:4mm;">'
                .'<div class="mini-title">'.$this->esc(mb_strtoupper($this->t('physical', $options))).'</div>'
                .'<table style="width:100%;border-collapse:collapse;"><tr>'.$tiles.'</tr></table>'
                .'</div>';
        }

        // Right column blocks - each optional, always stacked in the same order
        // so the layout stays predictable regardless of what data is present.
        $comparisons = is_array($player->comparisons) ? array_slice($player->comparisons, 0, 3) : [];
        $comparisonsHtml = '';
        if (! empty($comparisons)) {
            $rows = '';
            foreach ($comparisons as $c) {
                if (! is_array($c)) continue;
                $cname = trim((string) ($c['name'] ?? ''));
                if ($cname === '') continue;
                $cclub = trim((string) ($c['club'] ?? ''));
                $rows .= '<tr>'
                    .'<td style="padding:2mm 0;border-bottom:0.5px solid rgba(255,255,255,0.12);font-size:8.5pt;font-weight:700;letter-spacing:0.5px;">'.$this->esc($cname).'</td>'
                    .'<td style="padding:2mm 0;border-bottom:0.5px solid rgba(255,255,255,0.12);font-size:7pt;letter-spacing:1.5px;text-transform:uppercase;color:'.$secondary.';text-align:right;">'.$this->esc($cclub).'</td>'
                    .'</tr>';
            }
            if ($rows !== '') {
                $comparisonsHtml = '<div style="margin-top:5mm;">'
                    .'<div class="mini-title">'.$this->esc(mb_strtoupper($this->t('comparisons', $options))).'</div>'
                    .'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>'
                    .'</div>';
            }
        }

        // Scout profile - falls back to scout_quote, then to the no_bio message.
        $scoutBody = trim((string) $player->bio) !== ''
            ? $this->esc($player->bio)
            : (trim((string) $player->scout_quote) !== ''
                ? '« '.$this->esc($player->scout_quote).' »'
                : $this->esc($this->t('no_bio_stadium', $options)));
        $scoutHtml = '<div style="margin-top:5mm;">'
            .'<div class="mini-title">'.$this->esc(mb_strtoupper($this->t('scout_profile', $options))).'</div>'
            .'<p class="quote">'.$scoutBody.'</p>'
            .'</div>';

        // Compose the right column - always packed with meaningful blocks so
        // the reader never sees dead space when there are no clubs or links.
        $bottomRight = '';
        if ($clubsHtml !== '') {
            $bottomRight .= $clubsHtml;
        }
        if ($linkBlocks !== '') {
            $bottomRight .= '<div class="mini-title" style="margin-top:5mm;">'.$this->esc(mb_strtoupper($this->t('scan_more', $options))).'</div>'.$linkBlocks;
        }
        $bottomRight .= $comparisonsHtml;
        $bottomRight .= $scoutHtml;

        $nameUpper = $this->esc(strtoupper($player->name));
        $taglineUpper = $tagline ? $this->esc(strtoupper($tagline)) : '';

        $lang = $this->lang($options);
        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}"><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  body { font-family: {$fontFamily}; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: {$ptBody}; {$tracking} }
  /* .stage was `height: 297mm; overflow: hidden;` which SILENTLY CLIPPED any
     section that grew beyond its fixed height (long identity table, many
     comparisons, large font_scale). Switched to `min-height` so the stage
     still fills the page when data is sparse but grows visibly rather than
     losing content when full. */
  .stage { position: relative; width: 100%; min-height: 297mm;
           background:
             radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.16) 0%, transparent 35%),
             radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 45%),
             radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.16) 0%, transparent 35%),
             radial-gradient(ellipse at 50% 110%, rgba(15,81,50,0.55) 0%, transparent 60%),
             {$bg};
  }

  /* HERO ~120mm (DomPDF ignores box-sizing:border-box so padding stacks on top).
     Same min-height swap as .stage: keeps the visual weight of a full hero
     but avoids clipping when identity rows push past 80mm. */
  .hero { position: relative; min-height: 108mm; padding: 8mm 12mm 0 12mm; }
  .hero-row { display: table; width: 100%; min-height: 80mm; table-layout: fixed; }
  .hero-photo { display: table-cell; width: 44%; vertical-align: top; padding-right: 8mm; }
  .hero-photo .frame { position: relative; width: 100%; height: 80mm; border-radius: 2mm; overflow: hidden; }
  .hero-text  { display: table-cell; vertical-align: top; }
  .name { font-size: 32pt; font-weight: 900; line-height: 0.95; letter-spacing: -1px; word-wrap: break-word; }
  .tagline { font-size: 9pt; letter-spacing: 4px; margin-top: 3mm; color: {$secondary}; }
  .identity { width: 100%; border-collapse: collapse; margin-top: 5mm; font-size: 9pt; }
  .identity td { padding: 2mm 0; border-bottom: 1px solid rgba(255,255,255,0.14); }
  .ikey { color: rgba(255,255,255,0.55); width: 40%; letter-spacing: 1.5px; font-size: 7.5pt; font-weight: 600; }
  .ival { font-weight: 700; letter-spacing: 0.5px; }

  /* KPI strip inside hero footer */
  .kpi-strip { margin-top: 8mm; }
  .kpi-strip table { width: 100%; border-collapse: separate; border-spacing: 3mm 0; }
  .kpi { width: 25%; background: rgba(255,255,255,0.06); border-left: 2px solid {$accent}; padding: 3mm 3mm; }
  .kpi-val { font-size: 16pt; font-weight: 800; line-height: 1; }
  .kpi-val span { font-size: 8pt; opacity: 0.7; margin-left: 1mm; }
  .kpi-lbl { font-size: 5.5pt; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.75; margin-top: 2mm; }

  /* BAND ~30mm total - strengths. min-height so extra rows / larger fonts
     grow the band instead of getting clipped. */
  .band { position: relative; min-height: 22mm; padding: 3mm 12mm;
          background: rgba(0,0,0,0.4);
          border-top: 2px solid {$accent}; border-bottom: 2px solid {$accent}; }
  .band-title { font-size: 6.5pt; letter-spacing: 4px; color: {$secondary}; margin-bottom: 2mm; }
  .strengths { width: 100%; border-collapse: collapse; }
  .strength { width: 33.33%; padding: 1.5mm 1mm; vertical-align: middle; }
  .strength-dot { display: inline-block; width: 2.5mm; height: 2.5mm; border-radius: 1.25mm; margin-right: 2mm; vertical-align: middle; }
  .strength-label { font-weight: 700; font-size: 8pt; letter-spacing: 1.2px; vertical-align: middle; }
  .strength-empty { color: rgba(255,255,255,0.5); font-style: italic; font-size: 8pt; text-align: center; padding-top: 6mm; }

  /* BOTTOM row ~139mm total - contains the heatmap plus clubs/links column.
     min-height so a rich right column (clubs + QR + comparisons + scout) can
     grow instead of being clipped. */
  .bottom { position: relative; min-height: 127mm; padding: 6mm 12mm; }
  .bottom-row { display: table; width: 100%; table-layout: fixed; }
  .bottom-left { display: table-cell; width: 55%; vertical-align: top; padding-right: 6mm; }
  .bottom-right { display: table-cell; vertical-align: top; padding-left: 6mm; border-left: 1px solid rgba(255,255,255,0.1); }
  .mini-title { font-size: 6.5pt; letter-spacing: 4px; color: {$secondary}; margin-bottom: 3mm; }
  .heatmap { width: 100%; border-collapse: separate; border-spacing: 1.2mm; }
  .heatmap td { height: 10mm; border-radius: 1mm; }
  .clubs { width: 100%; border-collapse: collapse; }

  .link-row { margin-bottom: 3mm; }
  .qr { width: 16mm; height: 16mm; background: #fff; padding: 1mm; border-radius: 1mm; vertical-align: middle; }
  .link-meta { display: inline-block; vertical-align: middle; margin-left: 3mm; width: calc(100% - 22mm); }
  .link-label { font-size: 6pt; letter-spacing: 3px; font-weight: 700; }
  .link-url { font-size: 7pt; opacity: 0.85; margin-top: 1mm; word-break: break-all; }
  .quote { font-size: 8.5pt; line-height: 1.55; opacity: 0.9; margin: 0; }

  /* FOOTER 10mm */
  /* Footer flows naturally at the end of .stage now that sections are
     min-height'd. Absolute positioning would collide with grown sections. */
  .footer { padding: 4mm 0; text-align: center; font-size: 6pt; letter-spacing: 3px; opacity: 0.5; }
</style></head><body>
  <div class="stage">
    <div class="hero">
      <div class="hero-row">
        <div class="hero-photo"><div class="frame">{$photoBlock}</div></div>
        <div class="hero-text">
          <div class="name">{$nameUpper}</div>
HTML
        .($tagline ? '<div class="tagline">'.$taglineUpper.'</div>' : '')
        .'<table class="identity"><tbody>'.$identityHtml.'</tbody></table>
        </div>
      </div>
      <div class="kpi-strip"><table><tr>'.$kpiHtml.'</tr></table></div>
    </div>

    <div class="band">
      <div class="band-title">'.$this->esc(mb_strtoupper($this->t('strengths', $options))).'</div>
      <table class="strengths"><tbody>'.$strengthsHtml.'</tbody></table>
    </div>

    <div class="bottom">
      <div class="bottom-row">
        <div class="bottom-left">
          <div class="mini-title">'.$this->esc(mb_strtoupper($this->t('zones_influence', $options))).'</div>
          '.($heatmap !== '' ? $heatmap : '<p class="quote">'.$this->esc($this->t('no_heatmap', $options)).'</p>').'
          '.$physiqueHtml.'
        </div>
        <div class="bottom-right">
          '.$bottomRight.'
        </div>
      </div>
    </div>

    <div class="footer">RENE FOOTBALL · '.now()->format('d/m/Y').'</div>
  </div>
</body></html>';
    }
}
