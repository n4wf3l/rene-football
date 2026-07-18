<?php

namespace App\Services\Presentations\Templates;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * Signature - magazine-cover layout. Full-bleed hero photo with a bold name
 * overlay, one giant "hero" stat, and a pull-out scout quote. Designed for
 * high-impact pitches where the goal is to grab a sporting director in the
 * first three seconds. When the heatmap toggle is on, a compact heatmap
 * thumbnail takes the place of the supporting KPI row (single trade: pick
 * data density OR positional insight, not both).
 */
class SignatureTemplate extends PresentationTemplate
{
    public static function key(): string { return 'signature'; }
    public static function label(): string { return 'Signature'; }
    public static function description(): string
    {
        return 'Cover magazine : nom XXL, stat signature géante, citation scout. Palette sombre percutante pour un pitch impact.';
    }

    public static function defaultOptions(): array
    {
        return array_merge(parent::defaultOptions(), [
            'accent_color'     => '#dc2626',
            'secondary_color'  => '#facc15',
            'text_color'       => '#fafaf9',
            'background_color' => '#0a0a0a',
            'font_family'      => 'grotesque',
            'photo_fit'        => 'cover',
        ]);
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<rect width="60" height="84" fill="#0a0a0a"/>'
            // Photo band
            .'<rect width="60" height="46" fill="#dc2626" opacity="0.85"/>'
            .'<rect y="24" width="60" height="22" fill="#0a0a0a" opacity="0.6"/>'
            // Eyebrow chip
            .'<rect x="4" y="34" width="14" height="2" fill="#facc15"/>'
            // Big name
            .'<rect x="4" y="38" width="46" height="4" fill="#fafaf9"/>'
            .'<rect x="4" y="43" width="28" height="1.5" fill="#fafaf9" opacity="0.7"/>'
            // Signature stat
            .'<text x="4" y="63" font-size="14" font-weight="900" fill="#dc2626">9</text>'
            .'<rect x="4" y="65" width="10" height="1" fill="#facc15"/>'
            // Support stats
            .'<rect x="18" y="55" width="5" height="2" fill="#fafaf9"/>'
            .'<rect x="18" y="58" width="7" height="1" fill="#fafaf9" opacity="0.55"/>'
            .'<rect x="27" y="55" width="5" height="2" fill="#fafaf9"/>'
            .'<rect x="27" y="58" width="7" height="1" fill="#fafaf9" opacity="0.55"/>'
            // Quote (right col)
            .'<rect x="37" y="52" width="1" height="14" fill="#dc2626"/>'
            .'<rect x="40" y="52" width="16" height="1" fill="#fafaf9" opacity="0.75"/>'
            .'<rect x="40" y="55" width="18" height="1" fill="#fafaf9" opacity="0.75"/>'
            .'<rect x="40" y="58" width="14" height="1" fill="#fafaf9" opacity="0.75"/>'
            .'<rect x="40" y="61" width="16" height="1" fill="#fafaf9" opacity="0.75"/>'
            // Chips band
            .'<rect y="72" width="60" height="6" fill="#fafaf9" opacity="0.06"/>'
            .'<rect x="6" y="74" width="6" height="2" fill="#fafaf9" opacity="0.7"/>'
            .'<rect x="20" y="74" width="6" height="2" fill="#fafaf9" opacity="0.7"/>'
            .'<rect x="34" y="74" width="6" height="2" fill="#fafaf9" opacity="0.7"/>'
            .'<rect x="48" y="74" width="6" height="2" fill="#fafaf9" opacity="0.7"/>'
            .'</svg>';
    }

    public function render(Player $player, array $options, string $title): string
    {
        $accent    = $options['accent_color']    ?? '#dc2626';
        $secondary = $options['secondary_color'] ?? '#facc15';
        $text      = $options['text_color']      ?? '#fafaf9';
        $bg        = $options['background_color'] ?? '#0a0a0a';
        $tagline   = $options['tagline'] ?? null;

        $photo      = $this->pickPhoto($player, $options);
        $photoHtml  = $this->photoFrame($photo, $options, 'rgba(255,255,255,0.04)');
        $fontFamily = $this->fontFamily($options);
        $tracking   = $this->fontTracking($options);
        $ptBody     = $this->pt(10, $options);

        // Signature stat = first selected; the remaining ones sit as a
        // horizontal row of supporting KPIs. Cap supporting at 3 so the
        // stat cell keeps its focal weight.
        $stats      = $this->statRows($player, $options);
        $signature  = $stats[0] ?? null;
        $supporting = array_slice($stats, 1, 3);

        // Two shapes for the supporting KPIs depending on what else lives in
        // the stat cell:
        // - `$supportingRowHtml`      : horizontal row of 3 cells (used when
        //                               heatmap is OFF; each stat gets more room)
        // - `$supportingStackedHtml`  : vertical stack of 3 rows (used when
        //                               heatmap sits beside them; each row is
        //                               tighter so they share the 77mm band)
        $supportingRowHtml = '';
        foreach ($supporting as $s) {
            $supportingRowHtml .= '<td style="padding-right:8mm;vertical-align:top;">'
                .'<div style="font-size:20pt;font-weight:800;line-height:1;color:'.$text.';">'
                .$this->esc((string) $s['value'])
                .'<span style="font-size:9pt;opacity:0.7;margin-left:1mm;font-weight:400;">'.$this->esc($s['suffix']).'</span>'
                .'</div>'
                .'<div style="font-size:6.5pt;letter-spacing:2px;text-transform:uppercase;opacity:0.6;margin-top:2mm;">'.$this->esc($s['label']).'</div>'
                .'</td>';
        }
        $supportingStackedHtml = '';
        foreach ($supporting as $s) {
            $supportingStackedHtml .= '<div style="padding:1.8mm 0;border-bottom:0.5px solid rgba(255,255,255,0.10);">'
                .'<div style="font-size:14pt;font-weight:800;line-height:1;color:'.$text.';">'
                .$this->esc((string) $s['value'])
                .'<span style="font-size:7pt;opacity:0.7;margin-left:1mm;font-weight:400;">'.$this->esc($s['suffix']).'</span>'
                .'</div>'
                .'<div style="font-size:5.5pt;letter-spacing:1.5px;text-transform:uppercase;opacity:0.6;margin-top:1mm;">'.$this->esc($s['label']).'</div>'
                .'</div>';
        }

        // Compose the block that sits under the sig-num based on what's
        // actually available. Priorities:
        //   heatmap + supporting → 2-col: heatmap left, stacked KPIs right
        //   heatmap only         → heatmap centered
        //   supporting only      → horizontal row
        //   neither              → empty (sig-num alone)
        $heatmap = $this->heatmapHtml($player, $options);
        $zonesLabel = $this->esc($this->t('zones_influence', $options));
        if ($heatmap !== '' && $supportingStackedHtml !== '') {
            $secondaryVisualHtml = '<div style="margin-top:5mm;">'
                .'<table style="width:100%;border-collapse:collapse;"><tr>'
                .'<td style="vertical-align:top;padding-right:5mm;width:48mm;">'
                .'<div style="font-size:5.5pt;letter-spacing:2px;text-transform:uppercase;color:'.$secondary.';font-weight:700;margin-bottom:1.5mm;">'.$zonesLabel.'</div>'
                .'<div style="width:45mm;">'.$heatmap.'</div>'
                .'</td>'
                .'<td style="vertical-align:top;">'.$supportingStackedHtml.'</td>'
                .'</tr></table>'
                .'</div>';
        } elseif ($heatmap !== '') {
            $secondaryVisualHtml = '<div style="margin-top:6mm;">'
                .'<div style="font-size:6.5pt;letter-spacing:3px;text-transform:uppercase;color:'.$secondary.';font-weight:700;margin-bottom:2mm;">'.$zonesLabel.'</div>'
                .'<div style="width:55mm;">'.$heatmap.'</div>'
                .'</div>';
        } elseif ($supportingRowHtml !== '') {
            $secondaryVisualHtml = '<table class="support-table"><tr>'.$supportingRowHtml.'</tr></table>';
        } else {
            $secondaryVisualHtml = '';
        }

        $quoteRaw     = trim((string) ($player->bio ?? ''));
        $quoteContent = $quoteRaw !== '' ? nl2br($this->esc($quoteRaw)) : $this->esc($this->t('no_bio', $options));

        // Identity chips row (bottom band): age, position, category, height,
        // foot, nationality. Each chip is a table cell with a right-border.
        $chips = [];
        if ($player->age)             $chips[] = ((int) $player->age).' '.$this->t('years_old', $options);
        if ($player->position)        $chips[] = $player->position;
        if ($player->category)        $chips[] = $this->tCategory($player->category, $options);
        if ($player->height)          $chips[] = $player->height;
        if ($player->preferred_foot)  $chips[] = $this->tFoot($player->preferred_foot, $options);
        if ($player->nationality)     $chips[] = $player->nationality;
        $chipsHtml = '';
        $last = count($chips) - 1;
        foreach ($chips as $i => $c) {
            $border = $i === $last ? 'none' : '1px solid rgba(255,255,255,0.15)';
            $chipsHtml .= '<td style="padding:5mm 4mm;font-size:8pt;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:'.$text.';border-right:'.$border.';text-align:center;">'.$this->esc($c).'</td>';
        }

        $eyebrow   = mb_strtoupper($this->t('presentation_joueur', $options).($player->category ? ' · '.$this->tCategory($player->category, $options) : ''));
        $clubLine  = trim(($player->position ?? '').($player->club ? ' · '.$player->club : ''));
        $subline   = $tagline !== null && $tagline !== '' ? $tagline : $clubLine;
        $titleEsc  = $this->esc($title);
        $lang      = $this->lang($options);
        $srcLabel  = $this->esc(mb_strtoupper($this->t('scout_summary', $options)));

        $stageContent = ''
            .'<div class="stage">'
            .  '<div class="hero">'
            .    $photoHtml
            .    '<div class="hero-overlay"></div>'
            .    '<div class="title-tag">'.$titleEsc.'</div>'
            .    '<div class="brand-tag">Rene Football</div>'
            .    '<div class="hero-text">'
            .      '<span class="eyebrow">'.$this->esc($eyebrow).'</span>'
            .      '<div class="name">'.$this->esc($player->name).'</div>'
            .      ($subline !== '' ? '<div class="club">'.$this->esc($subline).'</div>' : '')
            .    '</div>'
            .  '</div>'
            .  '<div class="band">'
            .    '<table class="band-table"><tr>'
            .      '<td class="stat-cell">'
            .        ($signature
                        ? '<div class="sig-num">'.$this->esc((string) $signature['value']).'<span>'.$this->esc($signature['suffix']).'</span></div>'
                          .'<div class="sig-lbl">'.$this->esc($signature['label']).'</div>'
                        : '')
            .        $secondaryVisualHtml
            .      '</td>'
            .      '<td class="quote-cell">'
            .        '<div class="quote-mark">&ldquo;</div>'
            .        '<div class="quote-body">'.$quoteContent.'</div>'
            .        '<div class="quote-src">— '.$srcLabel.'</div>'
            .      '</td>'
            .    '</tr></table>'
            .  '</div>'
            .  '<div class="chips"><table class="chips-table"><tr>'.$chipsHtml.'</tr></table></div>'
            .  $this->extrasBlockHtml($options, ['bg' => 'rgba(0,0,0,0.35)', 'secondary' => $secondary, 'text' => $text])
            .  '<div class="footer">'.$this->esc(mb_strtoupper($this->t('presentation_joueur', $options))).' · '.now()->format('d/m/Y').'</div>'
            .'</div>';

        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}"><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  body { font-family: {$fontFamily}; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: {$ptBody}; {$tracking} }
  .stage { position: relative; width: 100%; height: 297mm; overflow: hidden; }

  /* HERO 138mm - full-bleed photo, gradient overlay, bottom-left text stack */
  .hero { position: relative; height: 138mm; overflow: hidden; background: {$bg}; }
  .hero-overlay { position: absolute; inset: 0;
                  background: linear-gradient(180deg,
                    rgba(0,0,0,0.40) 0%,
                    rgba(0,0,0,0.00) 22%,
                    rgba(0,0,0,0.00) 42%,
                    rgba(10,10,10,0.85) 78%,
                    {$bg} 100%); }
  .title-tag { position: absolute; top: 8mm; left: 12mm; font-size: 7pt; letter-spacing: 3px; text-transform: uppercase; color: {$secondary}; font-weight: 700; }
  .brand-tag { position: absolute; top: 8mm; right: 12mm; font-size: 7pt; letter-spacing: 3px; text-transform: uppercase; color: {$text}; opacity: 0.75; font-weight: 700; }
  .hero-text { position: absolute; left: 12mm; right: 12mm; bottom: 8mm; }
  .eyebrow { display: inline-block; font-size: 7pt; letter-spacing: 4px; padding: 1.8mm 3.5mm; background: {$secondary}; color: #0a0a0a; font-weight: 700; }
  .name { font-size: 44pt; font-weight: 900; line-height: 0.95; letter-spacing: -1.5px; margin-top: 4mm; text-transform: uppercase; word-wrap: break-word; }
  .club { font-size: 10pt; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 4mm; opacity: 0.85; }

  /* STAT + QUOTE band ~93mm (77mm content + padding). Needs enough vertical
     runway to fit the giant sig-num + a compact heatmap thumbnail beneath. */
  .band { padding: 8mm 12mm; height: 77mm; }
  .band-table { width: 100%; border-collapse: separate; border-spacing: 0; }
  .stat-cell { width: 42%; padding-right: 10mm; vertical-align: top; }
  .sig-num { font-size: 84pt; font-weight: 900; line-height: 0.9; color: {$accent}; letter-spacing: -4px; }
  .sig-num span { font-size: 22pt; opacity: 0.7; margin-left: 2mm; font-weight: 700; }
  .sig-lbl { font-size: 8pt; letter-spacing: 3px; text-transform: uppercase; color: {$secondary}; font-weight: 700; margin-top: 3mm; }
  .support-table { width: 100%; border-collapse: collapse; margin-top: 8mm; }

  .quote-cell { vertical-align: top; border-left: 3px solid {$accent}; padding-left: 6mm; }
  .quote-mark { font-size: 36pt; line-height: 0.3; color: {$accent}; font-family: 'Times', 'DejaVu Serif', serif; font-weight: 700; }
  /* Font compressed 11pt->10pt so a full 350-char bio stays inside the 77mm
     band without pushing chips + extras + footer off the page. */
  .quote-body { font-size: 10pt; line-height: 1.5; font-style: italic; margin-top: 4mm; color: {$text}; opacity: 0.94; }
  .quote-src { font-size: 6.5pt; letter-spacing: 2px; text-transform: uppercase; color: {$secondary}; margin-top: 4mm; font-weight: 700; }

  /* IDENTITY chips */
  .chips { background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); }
  .chips-table { width: 100%; border-collapse: collapse; }

  .footer { padding: 4mm 12mm; text-align: center; font-size: 6.5pt; letter-spacing: 4px; color: {$secondary}; text-transform: uppercase; font-weight: 700; }
</style></head><body>
{$stageContent}
</body></html>
HTML;
    }
}
