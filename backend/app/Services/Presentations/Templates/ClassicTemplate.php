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
            .'<rect x="3" y="3" width="22" height="40" fill="#0f5132"/>'
            .'<rect x="3" y="45" width="22" height="3" fill="#0f5132" opacity="0.4"/>'
            .'<rect x="3" y="50" width="14" height="2" fill="#666"/>'
            .'<rect x="3" y="54" width="18" height="2" fill="#666"/>'
            .'<rect x="3" y="58" width="14" height="2" fill="#666"/>'
            .'<rect x="28" y="3" width="29" height="10" fill="#0c0a09"/>'
            .'<rect x="28" y="16" width="13" height="13" fill="#0f5132" opacity="0.15"/>'
            .'<rect x="44" y="16" width="13" height="13" fill="#0f5132" opacity="0.15"/>'
            .'<rect x="28" y="32" width="13" height="13" fill="#0f5132" opacity="0.15"/>'
            .'<rect x="44" y="32" width="13" height="13" fill="#0f5132" opacity="0.15"/>'
            .'<g transform="translate(28,50)">'
            .'<rect width="6" height="5" fill="#0f5132" opacity="0.2"/>'
            .'<rect x="6" width="6" height="5" fill="#0f5132" opacity="0.4"/>'
            .'<rect x="12" width="6" height="5" fill="#0f5132" opacity="0.7"/>'
            .'<rect x="18" width="6" height="5" fill="#0f5132" opacity="0.5"/>'
            .'<rect x="24" width="6" height="5" fill="#0f5132" opacity="0.3"/>'
            .'</g>'
            .'</svg>';
    }

    public function render(Player $player, array $options, string $title): string
    {
        $accent    = $options['accent_color']     ?? '#0f5132';
        $secondary = $options['secondary_color']  ?? '#84b896';
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

        $infoRows = [
            [$this->t('age', $options),      ((int) $player->age).' '.$this->t('years_old', $options)],
            [$this->t('position', $options), $player->position],
            [$this->t('category', $options), $this->tCategory($player->category, $options)],
        ];
        if ($player->height)         $infoRows[] = [$this->t('height', $options),         $player->height];
        if ($player->preferred_foot) $infoRows[] = [$this->t('preferred_foot', $options), $this->tFoot($player->preferred_foot, $options)];
        if ($player->club)           $infoRows[] = [$this->t('club', $options),           $player->club];
        if ($player->nationality)    $infoRows[] = [$this->t('nationality', $options),    $player->nationality];

        $infoHtml = '';
        foreach ($infoRows as $r) {
            $infoHtml .= '<tr><td>'.$this->esc($r[0]).'</td><td>'.$this->esc($r[1]).'</td></tr>';
        }

        $photoHtml = $this->photoFrame($photo, $options, $secondary);
        $fontFamily = $this->fontFamily($options);
        $tracking   = $this->fontTracking($options);
        $ptBody     = $this->pt(10, $options);

        $heatmapBlock = $heatmap !== ''
            ? '<div class="block"><div class="block-title">'.$this->esc($this->t('zones_influence', $options)).'</div>'.$heatmap.'</div>'
            : '';

        $bioBlock = $player->bio
            ? '<div class="block bio"><div class="block-title">'.$this->esc($this->t('scout_profile', $options)).'</div><p>'.nl2br($this->esc($player->bio)).'</p></div>'
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
  .photo { position: relative; width: 100%; height: 90mm; overflow: hidden; background: {$secondary}; border-radius: 4mm; }
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
      <div class="name">{$this->esc($player->name)}</div>
HTML
      .($tagline ? '<div class="tagline">'.$this->esc($tagline).'</div>' : '')
      .'<table class="info"><tbody>'.$infoHtml.'</tbody></table>
    </div>
    <div class="col-right">
      <div class="kpi-grid"><div class="kpi-row">'
      .$statsHtml
      .'</div></div>'
      .$heatmapBlock
      .$bioBlock
      .'</div>
  </div>
  '.$this->extrasBlockHtml($options, ['secondary' => '#78716c', 'text' => $text]).'
  <div class="footer">Rene Football · '.now()->format('d/m/Y').'</div>
</body></html>';
    }
}