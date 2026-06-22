<?php

namespace App\Services\Presentations\Templates;

use App\Models\Article;
use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;

/**
 * Stadium - dark hero with stadium lighting, large player name and
 * everything packed into one impactful A4 portrait page. Designed to look
 * like a club introduction card: photo cut-out left, identity block with
 * giant typography, strengths grid with icons, list of previous clubs and
 * QR codes for the article + the YouTube highlights reel.
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
            'accent_color'     => '#3b82f6',  // bleu spot
            'secondary_color'  => '#facc15',  // jaune projecteur
            'text_color'       => '#fafaf9',
            'background_color' => '#0a1220',
            'previous_clubs'   => [],
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
            .'<rect x="4" y="14" width="18" height="34" fill="#3b82f6" opacity="0.7"/>'
            .'<rect x="26" y="14" width="30" height="6" fill="#fafaf9"/>'
            .'<rect x="26" y="22" width="22" height="3" fill="#fafaf9" opacity="0.5"/>'
            .'<rect x="26" y="27" width="26" height="3" fill="#fafaf9" opacity="0.5"/>'
            .'<rect x="26" y="32" width="20" height="3" fill="#fafaf9" opacity="0.5"/>'
            .'<rect x="4" y="52" width="10" height="10" fill="#3b82f6"/>'
            .'<rect x="18" y="52" width="10" height="10" fill="#3b82f6"/>'
            .'<rect x="32" y="52" width="10" height="10" fill="#3b82f6"/>'
            .'<rect x="46" y="52" width="10" height="10" fill="#3b82f6"/>'
            .'<circle cx="14" cy="72" r="3" fill="#facc15"/>'
            .'<circle cx="24" cy="72" r="3" fill="#facc15"/>'
            .'<circle cx="34" cy="72" r="3" fill="#facc15"/>'
            .'<circle cx="44" cy="72" r="3" fill="#facc15"/>'
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
        $photoBlock = $this->photoFrame($photo, $options, 'transparent');

        // Identity rows (compact).
        $birthday = '';
        if (! empty($player->since)) {
            // We don't have DOB on Player - use `since` (year) as a fallback marker.
        }
        $identity = [
            ['NATIONALITÉ',  $player->nationality ?: '-'],
            ['ÂGE',          ((int) $player->age).' ans'],
            ['POSTE',        strtoupper($player->position ?: '-')],
            ['CATÉGORIE',    strtoupper($player->category ?: '-')],
        ];
        if ($player->height)         $identity[] = ['TAILLE',    $player->height];
        if ($player->preferred_foot) $identity[] = ['PIED FORT', strtoupper($player->preferred_foot)];

        $identityHtml = '';
        foreach ($identity as $r) {
            $identityHtml .= '<tr><td class="ikey">'.$this->esc($r[0]).'</td><td class="ival">'.$this->esc((string) $r[1]).'</td></tr>';
        }

        // Strengths block (up to 6 icons + labels).
        $strengthsHtml = '';
        $strengths = is_array($player->strengths) ? array_slice($player->strengths, 0, 6) : [];
        if (! empty($strengths)) {
            $cells = '';
            foreach ($strengths as $s) {
                $label = is_array($s) && isset($s['label']) ? $s['label'] : (is_string($s) ? $s : '');
                if ($label === '') continue;
                $cells .= '<td class="strength"><span class="strength-dot" style="background:'.$secondary.';"></span><span class="strength-label">'.$this->esc(strtoupper($label)).'</span></td>';
            }
            $strengthsHtml = '<table class="strengths"><tr>'.$cells.'</tr></table>';
        }

        // Previous clubs (logos if provided).
        $clubsHtml = '';
        $clubs = is_array($options['previous_clubs'] ?? null) ? $options['previous_clubs'] : [];
        if (! empty($clubs)) {
            $cells = '';
            foreach ($clubs as $c) {
                $name = $c['name'] ?? '';
                $logo = $c['logo_url'] ?? null;
                if ($name === '' && $logo === null) continue;
                $img = $logo
                    ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:14mm;max-width:24mm;object-fit:contain;">'
                    : '<div style="height:14mm;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:8pt;letter-spacing:1px;">'.$this->esc(strtoupper($name)).'</div>';
                $cells .= '<td style="text-align:center;padding:0 2mm;">'.$img.'</td>';
            }
            $clubsHtml = '<div class="clubs-title">CLUBS PRÉCÉDENTS</div><table class="clubs"><tr>'.$cells.'</tr></table>';
        }

        // Links (article + YouTube) - render as QR codes via qrserver.com.
        $articleSlug = $options['article_slug'] ?? null;
        $youtubeUrl  = $options['youtube_url'] ?? null;

        $articleUrl = null;
        if ($articleSlug) {
            $article = Article::where('slug', $articleSlug)->first();
            if ($article) {
                $articleUrl = url('/actualites/'.$article->slug);
            }
        }

        $linkBlocks = '';
        if ($articleUrl) {
            $linkBlocks .= '<div class="link-block">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data='.urlencode($articleUrl).'" style="width:18mm;height:18mm;">'
                .'<div class="link-meta">'
                .'<div class="link-label" style="color:'.$secondary.';">ARTICLE</div>'
                .'<div class="link-url">'.$this->esc($articleUrl).'</div>'
                .'</div>'
                .'</div>';
        }
        if ($youtubeUrl) {
            $linkBlocks .= '<div class="link-block">'
                .'<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data='.urlencode($youtubeUrl).'" style="width:18mm;height:18mm;">'
                .'<div class="link-meta">'
                .'<div class="link-label" style="color:'.$secondary.';">VIDÉO</div>'
                .'<div class="link-url">'.$this->esc($youtubeUrl).'</div>'
                .'</div>'
                .'</div>';
        }

        $nameUpper = $this->esc(strtoupper($player->name));
        $taglineUpper = $tagline ? $this->esc(strtoupper($tagline)) : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  body { font-family: 'DejaVu Sans', sans-serif; color: {$text}; background: {$bg}; margin: 0; padding: 0; font-size: 10pt; }
  /* Stadium lights effect via stacked radial gradients painted onto the body. */
  .stage { position: relative; width: 100%; height: 297mm; overflow: hidden;
           background:
             radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.18) 0%, transparent 35%),
             radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 40%),
             radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.18) 0%, transparent 35%),
             radial-gradient(ellipse at 50% 100%, rgba(15,81,50,0.45) 0%, transparent 55%),
             {$bg};
  }
  .hero { position: relative; padding: 12mm 12mm 6mm 12mm; }
  .hero-row { display: table; width: 100%; }
  .hero-photo { display: table-cell; width: 35%; vertical-align: middle; }
  .hero-photo .frame { position: relative; width: 100%; height: 110mm; }
  .hero-text { display: table-cell; vertical-align: middle; padding-left: 8mm; }
  .name { font-size: 38pt; font-weight: 900; line-height: 0.95; letter-spacing: -1px; }
  .tagline { font-size: 9pt; letter-spacing: 4px; margin-top: 3mm; color: {$secondary}; }
  .identity { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 9pt; }
  .identity td { padding: 2mm 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .ikey { color: rgba(255,255,255,0.55); width: 40%; letter-spacing: 1.5px; font-size: 7.5pt; font-weight: 600; }
  .ival { font-weight: 700; letter-spacing: 0.5px; }

  .band { position: relative; padding: 5mm 12mm; background: rgba(0,0,0,0.35); border-top: 2px solid {$accent}; border-bottom: 2px solid {$accent}; }
  .band-title { font-size: 7pt; letter-spacing: 4px; color: {$secondary}; margin-bottom: 3mm; }
  .strengths { width: 100%; border-collapse: collapse; }
  .strength { width: 33.33%; padding: 2mm 1mm; vertical-align: middle; }
  .strength-dot { display: inline-block; width: 3mm; height: 3mm; border-radius: 1.5mm; margin-right: 2mm; vertical-align: middle; }
  .strength-label { font-weight: 700; font-size: 9pt; letter-spacing: 1.5px; vertical-align: middle; }

  .clubs-section { padding: 5mm 12mm 4mm 12mm; }
  .clubs-title { font-size: 7pt; letter-spacing: 4px; color: {$secondary}; margin-bottom: 3mm; }
  .clubs { width: 100%; border-collapse: collapse; }

  .links { padding: 4mm 12mm 6mm 12mm; }
  .links-title { font-size: 7pt; letter-spacing: 4px; color: {$secondary}; margin-bottom: 3mm; }
  .links-row { display: table; width: 100%; border-spacing: 4mm 0; }
  .link-block { display: table-cell; vertical-align: middle; background: rgba(255,255,255,0.06); border-radius: 2mm; padding: 3mm; }
  .link-block img { vertical-align: middle; background: #fff; padding: 1mm; border-radius: 1mm; }
  .link-meta { display: inline-block; vertical-align: middle; margin-left: 3mm; }
  .link-label { font-size: 6pt; letter-spacing: 3px; font-weight: 700; }
  .link-url { font-size: 7pt; opacity: 0.85; margin-top: 1mm; word-break: break-all; }

  .footer { position: absolute; bottom: 4mm; left: 12mm; right: 12mm; text-align: center; font-size: 6pt; letter-spacing: 3px; opacity: 0.45; }
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
    </div>'
    .($strengthsHtml !== '' ? '<div class="band"><div class="band-title">POINTS FORTS</div>'.$strengthsHtml.'</div>' : '')
    .($clubsHtml !== ''     ? '<div class="clubs-section">'.$clubsHtml.'</div>' : '')
    .($linkBlocks !== ''    ? '<div class="links"><div class="links-title">SCANNEZ POUR EN VOIR PLUS</div><div class="links-row">'.$linkBlocks.'</div></div>' : '')
    .'<div class="footer">RENE FOOTBALL · '.now()->format('d/m/Y').'</div>
  </div>
</body></html>';
    }
}
