<?php

namespace App\Services\Presentations\Templates;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * Editorial magazine layout. Big photo top-half, bold name overlay,
 * coloured stat strip, scout quote block. Higher contrast than Classic,
 * better for shortlists and pitches that need impact.
 */
class MagazineTemplate extends PresentationTemplate
{
    public static function key(): string { return 'magazine'; }
    public static function label(): string { return 'Magazine'; }
    public static function description(): string
    {
        return 'Photo plein cadre, nom XL en surimpression, stats colorées. Format éditorial impactant.';
    }

    public static function defaultOptions(): array
    {
        return array_merge(parent::defaultOptions(), [
            'accent_color'     => '#0c0a09',
            'secondary_color'  => '#ef4444',
            'text_color'       => '#fafaf9',
            'background_color' => '#0c0a09',
        ]);
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<rect width="60" height="84" fill="#0c0a09"/>'
            .'<rect x="0" y="0" width="60" height="42" fill="#ef4444" opacity="0.8"/>'
            .'<rect x="0" y="0" width="60" height="42" fill="#0c0a09" opacity="0.4"/>'
            .'<rect x="3" y="32" width="30" height="3" fill="#fafaf9"/>'
            .'<rect x="3" y="37" width="20" height="2" fill="#fafaf9" opacity="0.7"/>'
            .'<rect x="0" y="45" width="60" height="10" fill="#ef4444"/>'
            .'<rect x="4" y="48" width="4" height="4" fill="#fafaf9"/>'
            .'<rect x="14" y="48" width="4" height="4" fill="#fafaf9"/>'
            .'<rect x="24" y="48" width="4" height="4" fill="#fafaf9"/>'
            .'<rect x="34" y="48" width="4" height="4" fill="#fafaf9"/>'
            .'<rect x="44" y="48" width="4" height="4" fill="#fafaf9"/>'
            .'<rect x="3" y="60" width="54" height="2" fill="#fafaf9" opacity="0.6"/>'
            .'<rect x="3" y="64" width="54" height="2" fill="#fafaf9" opacity="0.4"/>'
            .'<rect x="3" y="68" width="40" height="2" fill="#fafaf9" opacity="0.4"/>'
            .'<rect x="3" y="75" width="54" height="6" fill="#fafaf9" opacity="0.05"/>'
            .'</svg>';
    }

    public function render(Player $player, array $options, string $title): string
    {
        $accent    = $options['accent_color']     ?? '#0c0a09';
        $secondary = $options['secondary_color']  ?? '#ef4444';
        $text      = $options['text_color']       ?? '#fafaf9';
        $bg        = $options['background_color'] ?? '#0c0a09';
        $tagline   = $options['tagline'] ?? null;

        $photo = $this->pickPhoto($player, $options);
        $stats = $this->statRows($player, $options);
        $heatmap = $this->heatmapHtml($player, array_merge($options, ['_heatmap_height_mm' => 48]));

        $statsHtml = '';
        foreach ($stats as $s) {
            $statsHtml .= '<td class="stat">'
                .'<div class="stat-val">'.$this->esc((string) $s['value']).'<span>'.$this->esc($s['suffix']).'</span></div>'
                .'<div class="stat-lbl">'.$this->esc($s['label']).'</div>'
                .'</td>';
        }

        $photoHtml = $this->photoFrame($photo, $options, $secondary);
        $fontFamily = $this->fontFamily($options);
        $tracking   = $this->fontTracking($options);
        $ptBody     = $this->pt(10, $options);

        $heatmapBlock = $heatmap !== ''
            ? '<div class="cell"><div class="cell-title">'.$this->esc($this->t('zones_influence', $options)).'</div>'.$heatmap.'</div>'
            : '';

        $bioBlock = $player->bio
            ? '<div class="quote"><div class="cell-title">'.$this->esc($this->t('scout_profile', $options)).'</div>'.nl2br($this->esc($player->bio)).'</div>'
            : '';

        $clubLine = trim(($player->position ?? '').($player->club ? ' · '.$player->club : ''));

        $lang = $this->lang($options);
        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}"><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  body { font-family: {$fontFamily}; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: {$ptBody}; {$tracking} }
  .hero { position: relative; height: 125mm; overflow: hidden; background: {$secondary}; }
  .hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(12,10,9,0.85) 90%); }
  .hero-text { position: absolute; left: 15mm; bottom: 14mm; right: 15mm; }
  .eyebrow { font-size: 8pt; letter-spacing: 3px; text-transform: uppercase; color: {$secondary}; }
  .name { font-size: 36pt; font-weight: 700; line-height: 0.95; margin-top: 2mm; }
  .club { font-size: 10pt; margin-top: 3mm; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.85; }
  .strip { background: {$secondary}; padding: 4mm 15mm; }
  .strip table { width: 100%; border-collapse: collapse; }
  .stat { text-align: left; vertical-align: top; padding-right: 4mm; }
  .stat-val { font-size: 24pt; font-weight: 700; line-height: 1; color: {$text}; }
  .stat-val span { font-size: 11pt; opacity: 0.7; margin-left: 1mm; }
  .stat-lbl { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.5px; color: {$text}; opacity: 0.85; margin-top: 1mm; }
  .body { padding: 5mm 15mm; }
  .grid { display: table; width: 100%; border-spacing: 5mm 0; margin-left: -5mm; }
  .row { display: table-row; }
  .cell { display: table-cell; vertical-align: top; background: rgba(255,255,255,0.04); padding: 5mm; border-radius: 2mm; }
  .cell-title { font-size: 7pt; color: {$secondary}; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 3mm; }
  .heatmap { width: 100%; border-collapse: separate; border-spacing: 1mm; }
  .heatmap td { height: 7mm; border-radius: 1mm; background: rgba(255,255,255,0.06); }
  .quote { font-style: italic; font-size: 10pt; line-height: 1.55; color: {$text}; opacity: 0.92; background: rgba(255,255,255,0.04); padding: 5mm; border-left: 3px solid {$secondary}; border-radius: 0 2mm 2mm 0; margin-top: 5mm; }
  .footer { text-align: center; padding: 4mm; font-size: 7pt; letter-spacing: 2px; color: {$text}; opacity: 0.55; }
</style></head><body>
  <div class="hero">
    {$photoHtml}
    <div class="hero-overlay"></div>
    <div class="hero-text">
      <div class="eyebrow">{$this->esc($title)}</div>
      <div class="name">{$this->esc($player->name)}</div>
HTML
      .($tagline ? '<div class="club">'.$this->esc($tagline).'</div>' : '<div class="club">'.$this->esc($clubLine).'</div>')
      .'</div>
  </div>
  <div class="strip">
    <table><tr>'.$statsHtml.'</tr></table>
  </div>
  <div class="body">
    <div class="grid"><div class="row">'
    .($heatmapBlock !== '' ? $heatmapBlock : '<div class="cell"></div>')
    .'<div class="cell">'
    .'<div class="cell-title">'.$this->esc($this->t('identity', $options)).'</div>'
    .'<div style="font-size:9pt;line-height:1.7;">'
    .'<strong>'.$this->esc($this->t('age', $options)).'</strong> · '.((int) $player->age).' '.$this->esc($this->t('years_old', $options)).'<br>'
    .($player->height ? '<strong>'.$this->esc($this->t('height', $options)).'</strong> · '.$this->esc($player->height).'<br>' : '')
    .($player->preferred_foot ? '<strong>'.$this->esc($this->t('preferred_foot', $options)).'</strong> · '.$this->esc($this->tFoot($player->preferred_foot, $options)).'<br>' : '')
    .($player->nationality ? '<strong>'.$this->esc($this->t('nationality', $options)).'</strong> · '.$this->esc($player->nationality) : '')
    .'</div>'
    .'</div></div></div>'
    .$bioBlock
    .'</div>
  '.$this->extrasBlockHtml($options, ['bg' => 'rgba(255,255,255,0.04)', 'secondary' => $secondary, 'text' => $text]).'
  <div class="footer">Rene Football · '.now()->format('d/m/Y').'</div>
</body></html>';
    }
}
