<?php

namespace App\Services\Presentations\Templates;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * Black & white serif minimal layout. No accent colours by default;
 * works well for traditional clubs and sporting directors who dislike
 * marketing flair. Photo is small and respectful, typography does the work.
 */
class MinimalTemplate extends PresentationTemplate
{
    public static function key(): string { return 'minimal'; }
    public static function label(): string { return 'Minimal'; }
    public static function description(): string
    {
        return 'Noir & blanc, typo serif, mise en page calme. Idéal pour direction sportive traditionnelle.';
    }

    public static function defaultOptions(): array
    {
        return array_merge(parent::defaultOptions(), [
            'accent_color'     => '#1c1917',
            'secondary_color'  => '#a8a29e',
            'text_color'       => '#1c1917',
            'background_color' => '#ffffff',
        ]);
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<rect width="60" height="84" fill="#ffffff"/>'
            .'<line x1="6" y1="8" x2="54" y2="8" stroke="#1c1917" stroke-width="0.4"/>'
            .'<rect x="6" y="11" width="20" height="2" fill="#1c1917"/>'
            .'<rect x="6" y="14" width="12" height="1.5" fill="#a8a29e"/>'
            .'<rect x="6" y="22" width="48" height="6" fill="#1c1917"/>'
            .'<rect x="6" y="30" width="30" height="3" fill="#1c1917" opacity="0.7"/>'
            .'<line x1="6" y1="40" x2="54" y2="40" stroke="#a8a29e" stroke-width="0.3"/>'
            .'<rect x="6" y="46" width="10" height="6" fill="#1c1917"/>'
            .'<rect x="22" y="46" width="10" height="6" fill="#1c1917"/>'
            .'<rect x="38" y="46" width="10" height="6" fill="#1c1917"/>'
            .'<rect x="6" y="56" width="48" height="1" fill="#1c1917"/>'
            .'<rect x="6" y="60" width="48" height="1" fill="#1c1917"/>'
            .'<rect x="6" y="64" width="32" height="1" fill="#1c1917"/>'
            .'<rect x="6" y="72" width="6" height="6" fill="#1c1917"/>'
            .'<line x1="6" y1="80" x2="54" y2="80" stroke="#1c1917" stroke-width="0.4"/>'
            .'</svg>';
    }

    public function render(Player $player, array $options, string $title): string
    {
        $accent    = $options['accent_color']     ?? '#1c1917';
        $secondary = $options['secondary_color']  ?? '#a8a29e';
        $text      = $options['text_color']       ?? '#1c1917';
        $bg        = $options['background_color'] ?? '#ffffff';
        $tagline   = $options['tagline'] ?? null;

        $photo = $this->pickPhoto($player, $options);
        $stats = $this->statRows($player, $options);
        $heatmap = $this->heatmapHtml($player, array_merge($options, ['_heatmap_height_mm' => 55]));

        $statsHtml = '';
        foreach ($stats as $s) {
            $statsHtml .= '<td class="stat">'
                .'<div class="stat-val">'.$this->esc((string) $s['value']).'<span>'.$this->esc($s['suffix']).'</span></div>'
                .'<div class="stat-lbl">'.$this->esc($s['label']).'</div>'
                .'</td>';
        }

        $infoRows = [
            [$this->t('age', $options),      ((int) $player->age).' '.$this->t('years_old', $options)],
            [$this->t('position', $options), $player->position],
            [$this->t('category', $options), $this->tCategory($player->category, $options)],
        ];
        if ($player->height)         $infoRows[] = [$this->t('height', $options),         $player->height];
        if ($player->preferred_foot) $infoRows[] = [$this->t('preferred_foot', $options), $this->tFoot($player->preferred_foot, $options)];
        if ($player->club)           $infoRows[] = [$this->t('club', $options),           $player->club];
        if ($player->since)          $infoRows[] = [$this->t('since', $options),          (string) $player->since];
        if ($player->nationality)    $infoRows[] = [$this->t('nationality', $options),    $player->nationality];
        if ($player->potential_rating) {
            $infoRows[] = [$this->t('potential', $options), number_format((float) $player->potential_rating, 1, ',', '').'/10'];
        }

        $infoHtml = '';
        foreach ($infoRows as $r) {
            $infoHtml .= '<tr><td class="k">'.$this->esc($r[0]).'</td><td class="v">'.$this->esc($r[1]).'</td></tr>';
        }

        $photoHtml = $this->photoFrame($photo, $options, $secondary);

        $heatmapBlock = $heatmap !== ''
            ? '<div class="block"><div class="block-title">'.$this->esc($this->t('zones_influence', $options)).'</div>'.$heatmap.'</div>'
            : '';

        // Physique tiles for the right column - only when telemetry exists.
        // Uses the serif's understated look: thin border + tabular numbers.
        $phyRows = $this->physiqueRows($player);
        $physiqueBlock = '';
        if (! empty($phyRows)) {
            $tiles = '';
            foreach ($phyRows as [$key, $value]) {
                $tiles .= '<td style="text-align:center;padding:3mm 2mm;border-top:0.5px solid '.$accent.';border-bottom:0.5px solid '.$accent.';">'
                    .'<div style="font-size:13pt;font-weight:700;color:'.$accent.';line-height:1;">'.$this->esc($value).'</div>'
                    .'<div style="font-size:6pt;color:'.$secondary.';text-transform:uppercase;letter-spacing:1.5px;margin-top:1.5mm;">'.$this->esc($this->t($key, $options)).'</div>'
                    .'</td>';
            }
            $physiqueBlock = '<div class="block">'
                .'<div class="block-title">'.$this->esc($this->t('physical', $options)).'</div>'
                .'<table style="width:100%;border-collapse:collapse;">'
                .'<tr>'.$tiles.'</tr>'
                .'</table>'
                .'</div>';
        }

        // NEW blocks that fill the previously empty bottom half. Kept side by
        // side as a 2-column band under the grid: strengths left, scout quote
        // right (or a placeholder when either is missing).
        $strengthsList = is_array($player->strengths) ? array_slice($player->strengths, 0, 6) : [];
        $strengthsHtml = '';
        if (! empty($strengthsList)) {
            $rows = '';
            foreach ($strengthsList as $s) {
                $label = is_array($s) && isset($s['label']) ? $s['label'] : (is_string($s) ? $s : '');
                if ($label === '') continue;
                $rows .= '<div class="strength"><span class="dot" style="background:'.$accent.';"></span>'.$this->esc($label).'</div>';
            }
            $strengthsHtml = '<div class="mini-title">'.$this->esc($this->t('strengths', $options)).'</div>'.$rows;
        } else {
            $strengthsHtml = '<div class="mini-title">'.$this->esc($this->t('strengths', $options)).'</div>'
                .'<p class="dim">'.$this->esc($this->t('no_strengths', $options)).'</p>';
        }

        $quoteHtml = $player->bio
            ? '<div class="mini-title">'.$this->esc($this->t('scout_summary', $options)).'</div><div class="quote">'.nl2br($this->esc($player->bio)).'</div>'
            : '<div class="mini-title">'.$this->esc($this->t('scout_summary', $options)).'</div><p class="dim">'.$this->esc($this->t('no_bio', $options)).'</p>';

        // Resolve font/scale options and pre-compute the pt values that vary.
        $fontFamily = $this->fontFamily($options);
        $tracking   = $this->fontTracking($options);
        $ptBody     = $this->pt(10, $options);
        $ptName     = $this->pt(32, $options);
        $ptTag      = $this->pt(11, $options);
        $ptMeta     = $this->pt(9, $options);
        $ptStatVal  = $this->pt(22, $options);
        $ptStatSub  = $this->pt(11, $options);
        $ptStatLbl  = $this->pt(7.5, $options);
        $ptInfo     = $this->pt(9, $options);
        $ptQuote    = $this->pt(11, $options);
        $ptMini     = $this->pt(7, $options);
        $ptStrong   = $this->pt(10, $options);
        $ptHead     = $this->pt(11, $options);
        $ptHeadTitle= $this->pt(7, $options);
        $ptFooter   = $this->pt(7, $options);

        $lang = $this->lang($options);
        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}"><head><meta charset="utf-8"><style>
  @page { margin: 16mm 16mm; }
  body { font-family: {$fontFamily}; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: {$ptBody}; {$tracking} }
  .header { border-top: 2px solid {$accent}; border-bottom: 0.5px solid {$secondary}; padding: 4mm 0 3mm 0; }
  .header-title { font-size: {$ptHeadTitle}; letter-spacing: 4px; text-transform: uppercase; color: {$secondary}; }
  .header-doc { font-size: {$ptHead}; margin-top: 1mm; font-weight: 600; }
  .name { font-size: {$ptName}; line-height: 1; margin-top: 5mm; font-weight: 700; letter-spacing: -1px; }
  .tagline { font-size: {$ptTag}; color: {$secondary}; font-style: italic; margin-top: 3mm; }
  .meta { font-size: {$ptMeta}; color: {$secondary}; margin-top: 3mm; letter-spacing: 1px; text-transform: uppercase; }
  .grid { display: table; width: 100%; margin-top: 6mm; }
  .col { display: table-cell; vertical-align: top; }
  .col-photo { width: 38%; padding-right: 8mm; }
  .photo { position: relative; width: 100%; height: 78mm; overflow: hidden; }
  .info { width: 100%; border-collapse: collapse; margin-top: 5mm; font-size: {$ptInfo}; }
  .info td { padding: 2mm 0; border-bottom: 0.5px solid {$secondary}; }
  .info .k { color: {$secondary}; width: 45%; }
  .info .v { text-align: right; font-weight: 600; }
  .stats { width: 100%; border-collapse: collapse; }
  .stats td { border-top: 0.5px solid {$accent}; border-bottom: 0.5px solid {$accent}; padding: 3mm 4mm 3mm 0; }
  .stat-val { font-size: {$ptStatVal}; font-weight: 700; line-height: 1; color: {$accent}; }
  .stat-val span { font-size: {$ptStatSub}; color: {$secondary}; margin-left: 1mm; font-weight: 400; }
  .stat-lbl { font-size: {$ptStatLbl}; color: {$secondary}; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2mm; }
  .block { margin-top: 5mm; }
  .mini-title { font-size: {$ptMini}; color: {$secondary}; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 3mm; font-weight: 700; }
  /* Bottom band: 2 columns for strengths / scout quote so nothing is empty. */
  .bottom { display: table; width: 100%; margin-top: 4mm; padding-top: 3mm; border-top: 0.5px solid {$secondary}; }
  .bottom-col { display: table-cell; vertical-align: top; width: 50%; }
  .bottom-col + .bottom-col { padding-left: 8mm; }
  .strength { font-size: {$ptStrong}; padding: 1.5mm 0; border-bottom: 0.5px solid {$secondary}; font-weight: 500; }
  .strength .dot { display: inline-block; width: 3mm; height: 3mm; border-radius: 1.5mm; vertical-align: middle; margin-right: 2.5mm; }
  .quote { font-size: {$ptQuote}; line-height: 1.6; font-style: italic; text-align: justify; }
  .dim { font-size: {$ptStrong}; color: {$secondary}; font-style: italic; }
  .footer { border-top: 2px solid {$accent}; margin-top: 4mm; padding-top: 2mm; font-size: {$ptFooter}; color: {$secondary}; letter-spacing: 2px; text-transform: uppercase; }
</style></head><body>
  <div class="header">
    <div class="header-title">Rene Football · {$this->esc($this->t('presentation_joueur', $options))}</div>
    <div class="header-doc">{$this->esc($title)}</div>
  </div>
  <div class="name">{$this->esc($player->name)}</div>
HTML
      .($tagline ? '<div class="tagline">'.$this->esc($tagline).'</div>' : '')
      .'<div class="meta">'.$this->esc($player->position).($player->club ? ' · '.$this->esc($player->club) : '').'</div>
  <div class="grid">
    <div class="col col-photo">
      <div class="photo">'.$photoHtml.'</div>
      <table class="info"><tbody>'.$infoHtml.'</tbody></table>
    </div>
    <div class="col">
      <table class="stats"><tr>'.$statsHtml.'</tr></table>'
      .$physiqueBlock
      .$heatmapBlock
      .'</div>
  </div>
  <div class="bottom">
    <div class="bottom-col">'.$strengthsHtml.'</div>
    <div class="bottom-col">'.$quoteHtml.'</div>
  </div>
  '.$this->extrasBlockHtml($options, ['secondary' => $secondary, 'text' => $text]).'
  <div class="footer">'.$this->esc($this->t('internal_document', $options)).' · '.now()->format('d.m.Y').'</div>
</body></html>';
    }
}
