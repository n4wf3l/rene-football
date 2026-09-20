<?php

namespace App\Services\Presentations\Templates;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * "Carte d'identité" - sober A4 portrait. Photo + identity column on the
 * left, KPI tiles + heatmap on the right. Single accent color drives the
 * visual identity. Lit safe choice for serious recruiters.
 */
class ClassicTemplate extends PresentationTemplate
{
    public static function key(): string { return 'classic'; }
    public static function label(): string { return 'Carte d\'identité'; }
    public static function description(): string
    {
        return 'Sobre, équilibré. Photo + identité à gauche, KPIs et heatmap à droite. Adapté à un envoi club.';
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<rect width="60" height="84" fill="#fafaf9"/>'
            .'<rect x="3" y="3" width="22" height="40" fill="#1e40af"/>'
            .'<rect x="3" y="45" width="22" height="3" fill="#1e40af" opacity="0.4"/>'
            .'<rect x="3" y="50" width="14" height="2" fill="#666"/>'
            .'<rect x="3" y="54" width="18" height="2" fill="#666"/>'
            .'<rect x="3" y="58" width="14" height="2" fill="#666"/>'
            .'<rect x="28" y="3" width="29" height="10" fill="#0c0a09"/>'
            .'<rect x="28" y="16" width="13" height="13" fill="#1e40af" opacity="0.15"/>'
            .'<rect x="44" y="16" width="13" height="13" fill="#1e40af" opacity="0.15"/>'
            .'<rect x="28" y="32" width="13" height="13" fill="#1e40af" opacity="0.15"/>'
            .'<rect x="44" y="32" width="13" height="13" fill="#1e40af" opacity="0.15"/>'
            .'<g transform="translate(28,50)">'
            .'<rect width="6" height="5" fill="#1e40af" opacity="0.2"/>'
            .'<rect x="6" width="6" height="5" fill="#1e40af" opacity="0.4"/>'
            .'<rect x="12" width="6" height="5" fill="#1e40af" opacity="0.7"/>'
            .'<rect x="18" width="6" height="5" fill="#1e40af" opacity="0.5"/>'
            .'<rect x="24" width="6" height="5" fill="#1e40af" opacity="0.3"/>'
            .'</g>'
            .'</svg>';
    }

    public function render(Player $player, array $options, string $title): string
    {
        $accent    = $options['accent_color']     ?? '#1e40af';
        $secondary = $options['secondary_color']  ?? '#93c5fd';
        $text      = $options['text_color']       ?? '#0c0a09';
        $bg        = $options['background_color'] ?? '#fafaf9';
        $tagline   = $options['tagline'] ?? null;

        $photo = $this->pickPhoto($player, $options);
        $stats = $this->statRows($player, $options);
        $heatmap = $this->heatmapHtml($player, array_merge($options, ['_heatmap_height_mm' => 75]));

        $statsHtml = '';
        foreach ($stats as $s) {
            $statsHtml .= '<div class="kpi">'
                .'<div class="kpi-value">'.$this->esc((string) $s['value']).'<span>'.$this->esc($s['suffix']).'</span></div>'
                .'<div class="kpi-label">'.$this->esc($s['label']).'</div>'
                .'</div>';
        }

        // DOB wins over age when set — matches the marketing fiche layout.
        // Format DD-MM-YYYY to align with the reference fiche.
        $dobLabel = null;
        if (! empty($player->date_of_birth)) {
            try {
                $dobLabel = \Carbon\Carbon::parse($player->date_of_birth)->format('d-m-Y');
            } catch (\Throwable) { $dobLabel = null; }
        }

        // Each row is [label, value, isHtml]. isHtml=true skips esc() on value
        // (used when we render an inline club crest).
        $infoRows = [];
        if ($dobLabel !== null) {
            $infoRows[] = [$this->t('date_of_birth', $options), $dobLabel, false];
        } else {
            $infoRows[] = [$this->t('age', $options), ((int) $player->age).' '.$this->t('years_old', $options), false];
        }
        $infoRows[] = [$this->t('position', $options), $player->position, false];
        $infoRows[] = [$this->t('category', $options), $this->tCategory($player->category, $options), false];
        if ($player->height)         $infoRows[] = [$this->t('height', $options),         $player->height, false];
        if ($player->preferred_foot) $infoRows[] = [$this->t('preferred_foot', $options), $this->tFoot($player->preferred_foot, $options), false];
        if ($player->club) {
            $clubLogo = trim((string) ($player->club_logo_url ?? ''));
            $clubValue = $this->esc($player->club);
            if ($clubLogo !== '') {
                $clubValue = '<img src="'.$this->esc($this->absolutePath($clubLogo)).'" alt="" style="height:5mm;width:auto;vertical-align:middle;margin-right:2mm;">'.$clubValue;
            }
            $infoRows[] = [$this->t('club', $options), $clubValue, true];
        }
        if ($player->since)          $infoRows[] = [$this->t('since', $options),          (string) $player->since, false];
        if ($player->nationality)    $infoRows[] = [$this->t('nationality', $options),    $player->nationality, false];
        if ($player->potential_rating) {
            $potVal = number_format((float) $player->potential_rating, 1, ',', '').'/10'
                .($player->potential_label ? ' · '.$player->potential_label : '');
            $infoRows[] = [$this->t('potential', $options), $potVal, false];
        }

        $infoHtml = '';
        foreach ($infoRows as $r) {
            $val = $r[2] ? $r[1] : $this->esc($r[1]);
            $infoHtml .= '<tr><td>'.$this->esc($r[0]).'</td><td>'.$val.'</td></tr>';
        }

        // Small secondary portrait — sits between the main photo and the
        // identity table, ~28mm square. Only renders when set.
        $secondaryPhotoHtml = '';
        $secondaryPhotoUrl = trim((string) ($player->secondary_photo_url ?? ''));
        if ($secondaryPhotoUrl !== '') {
            $secondaryPhotoHtml = '<div style="margin-top:3mm;text-align:right;">'
                .'<img src="'.$this->esc($this->absolutePath($secondaryPhotoUrl)).'" alt="" style="width:22mm;height:22mm;object-fit:cover;border-radius:2mm;border:0.5px solid #e7e5e4;">'
                .'</div>';
        }

        // Partner blocks (agency + academies) — rendered as a full-width band
        // under the .doc row. They stay optional so classic dossiers without
        // any partner data look identical to before.
        $partnerAgencyHtml    = $this->partnerAgencyHtml($options, ['accent' => $accent, 'text' => $text, 'muted' => '#78716c']);
        $partnerAcademiesHtml = $this->partnerAcademiesHtml($options, ['accent' => $accent, 'text' => $text, 'muted' => '#78716c']);
        $partnersBand = '';
        if ($partnerAgencyHtml !== '' || $partnerAcademiesHtml !== '') {
            $partnersBand = '<div style="margin-top:6mm;border-top:1px solid #e7e5e4;padding-top:4mm;">'
                .($partnerAgencyHtml !== '' ? '<div style="margin-bottom:3mm;">'.$partnerAgencyHtml.'</div>' : '')
                .$partnerAcademiesHtml
                .'</div>';
        }

        // Adaptive block rendering — variants are chosen from the layout hints
        // so a sparse player expands blocks vertically to fill empty space
        // and a packed player collapses them to fit a single page.
        $hints = $this->layoutHints($player);
        $blockStyle = ['accent' => $accent, 'text' => $text, 'muted' => '#78716c', 'bg' => $bg];

        $strengthsInner  = $this->strengthsBlockHtml($player, $hints['strengths_variant'], $blockStyle, $this->t('strengths', $options));
        $strengthsHtml   = $strengthsInner !== '' ? '<div class="left-block">'.$strengthsInner.'</div>' : '';

        $physiqueInner   = $this->physiqueBlockHtml($player, $hints['physique_variant'], $blockStyle, $options, $this->t('physical', $options));
        $physiqueHtml    = $physiqueInner !== '' ? '<div class="block">'.$physiqueInner.'</div>' : '';

        // Comparaisons adaptive block — only rendered when data exists;
        // sparse players push it into stack mode to fill the right column.
        $comparisonsInner = $this->comparisonsBlockHtml($player, $hints['comparisons_variant'], $blockStyle, $this->t('comparisons', $options));
        $comparisonsHtml  = $comparisonsInner !== '' ? '<div class="block">'.$comparisonsInner.'</div>' : '';

        // Scout quote fallback (right column) - only when bio is missing but a
        // dedicated scout_quote is available; keeps the right col grounded.
        $scoutQuoteHtml = '';
        if (! $player->bio && trim((string) $player->scout_quote) !== '') {
            $scoutQuoteHtml = '<div class="block">'
                .'<div class="block-title">'.$this->esc($this->t('scout_profile', $options)).'</div>'
                .'<p style="font-style:italic;font-size:9pt;line-height:1.5;color:#44403c;margin:0;">« '.$this->esc($player->scout_quote).' »</p>'
                .'</div>';
        }

        $photoHtml = $this->photoFrame($photo, $options, $secondary);
        $fontFamily = $this->fontFamily($options);
        $tracking   = $this->fontTracking($options);
        $ptBody     = $this->pt(10, $options);

        $heatmapBlock = $heatmap !== ''
            ? '<div class="block"><div class="block-title">'.$this->esc($this->t('zones_influence', $options)).'</div>'.$heatmap.'</div>'
            : '';

        // Safety cap on the bio so a legacy record saved before the
        // 350-char frontend limit can't blow up the right column and push
        // extras onto a second page.
        $bioText = $this->safeText($player->bio, 400);
        $bioBlock = $bioText !== ''
            ? '<div class="block bio"><div class="block-title">'.$this->esc($this->t('scout_profile', $options)).'</div><p>'.nl2br($this->esc($bioText)).'</p></div>'
            : '';

        $lang = $this->lang($options);
        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}"><head><meta charset="utf-8"><style>
  @page { margin: 12mm; }
  body { font-family: {$fontFamily}; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: {$ptBody}; {$tracking} }
  .doc { display: table; width: 100%; }
  .col-left { display: table-cell; width: 38%; vertical-align: top; padding-right: 8mm; }
  .col-right { display: table-cell; vertical-align: top; }
  /* Photo shrunk from 90mm → 68mm so the left column + extras (clubs +
     QR) fits in the page-1 remaining height. Because .doc is a display:
     table row that DomPDF won't split, the whole doc jumps to page 2 as
     soon as max(left, right) > available space. Tighter photo keeps the
     column under budget. */
  .photo { position: relative; width: 100%; height: 68mm; overflow: hidden; background: {$secondary}; border-radius: 4mm; }
  .name { font-size: 24pt; font-weight: 700; margin: 6mm 0 1mm 0; line-height: 1.05; }
  .tagline { font-size: 9pt; color: {$accent}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4mm; }
  .info { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4mm; }
  .info td { padding: 1.5mm 0; border-bottom: 1px solid #e7e5e4; }
  .info td:first-child { color: #78716c; width: 40%; }
  .info td:last-child { font-weight: 600; }
  .header { border-bottom: 3px solid {$accent}; padding-bottom: 4mm; margin-bottom: 6mm; }
  .header-title { font-size: 8pt; color: #78716c; letter-spacing: 2px; text-transform: uppercase; }
  .header-doc { font-size: 14pt; font-weight: 700; margin-top: 1mm; }
  .kpi-grid { display: table; width: 100%; border-spacing: 3mm 3mm; }
  .kpi-row { display: table-row; }
  .kpi { display: table-cell; width: 50%; background: {$bg}; border: 1px solid #e7e5e4; border-left: 3px solid {$accent}; padding: 4mm; }
  .kpi-value { font-size: 22pt; font-weight: 700; color: {$accent}; line-height: 1; }
  .kpi-value span { font-size: 11pt; color: #78716c; margin-left: 1mm; }
  .kpi-label { font-size: 8pt; color: #78716c; text-transform: uppercase; letter-spacing: 1px; margin-top: 1mm; }
  .block { background: {$bg}; border: 1px solid #e7e5e4; border-radius: 3mm; padding: 4mm; margin-top: 4mm; }
  .left-block { margin-top: 6mm; }
  .block-title { font-size: 8pt; color: #78716c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3mm; }
  .heatmap { width: 100%; border-collapse: separate; border-spacing: 1mm; }
  .heatmap td { height: 8mm; border-radius: 1mm; background: #f5f5f4; }
  .bio p { font-size: 9pt; line-height: 1.5; color: #44403c; margin: 0; }
  .footer { font-size: 7pt; color: #a8a29e; text-align: center; margin-top: 8mm; letter-spacing: 1px; }
</style></head><body>
  <div class="header">
    <div class="header-title">{$this->esc($this->t('presentation_joueur', $options))} · Rene Football</div>
    <div class="header-doc">{$this->esc($title)}</div>
  </div>
  <div class="doc">
    <div class="col-left">
      <div class="photo">{$photoHtml}</div>
      {$secondaryPhotoHtml}
      <div class="name">{$this->esc($player->name)}</div>
HTML
      .($tagline ? '<div class="tagline">'.$this->esc($tagline).'</div>' : '')
      .'<table class="info"><tbody>'.$infoHtml.'</tbody></table>'
      .$strengthsHtml
      // Extras (Clubs précédents + QR ARTICLE/VIDÉO) sit at the bottom of
      // the LEFT column instead of a full-width band underneath the doc.
      // The right column carries the tall content (bio, heatmap, KPIs) so
      // the left has vertical whitespace to reclaim — this fills it and
      // keeps the whole dossier on page 1.
      .$this->columnExtrasHtml($options, ['accent' => $accent, 'text' => $text, 'muted' => '#78716c'])
      .'</div>
    <div class="col-right">
      <div class="kpi-grid"><div class="kpi-row">'
      .$statsHtml
      .'</div></div>'
      .$physiqueHtml
      .$comparisonsHtml
      .$heatmapBlock
      .$bioBlock
      .$scoutQuoteHtml
      .'</div>
  </div>
  '.$partnersBand.'
  <div class="footer">Rene Football · '.now()->format('d/m/Y').'</div>
</body></html>';
    }
}