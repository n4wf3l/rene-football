<?php

namespace App\Services\Presentations\Templates;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;
use Carbon\Carbon;

/**
 * "Marketing v1" — reproduces the dark-themed agency fiche used by René
 * Football (Zoran / Camara / Destiny / Hanibal references). Photo bleeds
 * to one edge, big split-color name, info block with icons, caractéristiques
 * card, projet sportif paragraph, partner blocks and footer band.
 *
 * Layout knobs on options:
 *   - theme: violet | navy | black-gold | black-yellow | custom
 *   - photo_side: left | right (default right)
 *   - motto, slogan_cursive, supervised_by, player_profile_bars
 *
 * Player data consumed:
 *   name, photo_url, secondary_photo_url, gallery_photos,
 *   date_of_birth (or age), position, best_position, club, club_logo_url,
 *   nationality (+ secondary_nationality), preferred_foot, playing_style,
 *   mental_strengths, objective, languages_spoken, previous_club/logo,
 *   career_history, strengths, bio.
 */
class MarketingTemplate extends PresentationTemplate
{
    public static function key(): string { return 'marketing'; }
    public static function label(): string { return 'Marketing v1'; }
    public static function description(): string
    {
        return 'Fiche agence marketing (dark). Photo pleine hauteur, nom en split-color, cartes Points forts + Caractéristiques + Projet sportif. Idéale pour envois clubs / réseaux.';
    }

    public static function defaultOptions(): array
    {
        return [
            'theme'            => 'navy',
            'photo_side'       => 'right',
            'accent_color'     => '#3b82f6',
            'secondary_color'  => '#93c5fd',
            'text_color'       => '#ffffff',
            'background_color' => '#0a1f3d',
            'font_family'      => 'sans',
        ];
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<rect width="60" height="84" fill="#0a1f3d"/>'
            .'<rect x="30" y="0" width="30" height="60" fill="#1e40af" opacity="0.6"/>'
            .'<rect x="4" y="4" width="18" height="2" fill="#3b82f6"/>'
            .'<rect x="4" y="14" width="24" height="4" fill="#ffffff"/>'
            .'<rect x="4" y="20" width="20" height="4" fill="#3b82f6"/>'
            .'<rect x="4" y="30" width="24" height="1" fill="#93c5fd" opacity="0.5"/>'
            .'<rect x="4" y="34" width="22" height="1" fill="#93c5fd" opacity="0.5"/>'
            .'<rect x="4" y="38" width="20" height="1" fill="#93c5fd" opacity="0.5"/>'
            .'<rect x="4" y="42" width="22" height="1" fill="#93c5fd" opacity="0.5"/>'
            .'<rect x="4" y="62" width="24" height="8" fill="#1e40af" opacity="0.4" rx="1"/>'
            .'<rect x="32" y="62" width="24" height="8" fill="#1e40af" opacity="0.4" rx="1"/>'
            .'<rect x="0" y="76" width="60" height="8" fill="#3b82f6"/>'
            .'</svg>';
    }

    /** Palette per theme. Custom falls back to the accent/secondary/bg options. */
    private function palette(array $options): array
    {
        $theme = $options['theme'] ?? 'navy';
        $presets = [
            'violet'       => ['bg' => '#1a0f2e', 'accent' => '#8b5cf6', 'secondary' => '#c4b5fd', 'text' => '#ffffff', 'card' => 'rgba(139,92,246,0.10)', 'card_border' => 'rgba(196,181,253,0.25)'],
            'navy'         => ['bg' => '#0a1f3d', 'accent' => '#3b82f6', 'secondary' => '#93c5fd', 'text' => '#ffffff', 'card' => 'rgba(59,130,246,0.10)', 'card_border' => 'rgba(147,197,253,0.25)'],
            'black-gold'   => ['bg' => '#0a0a0a', 'accent' => '#d4a017', 'secondary' => '#e5c04a', 'text' => '#ffffff', 'card' => 'rgba(212,160,23,0.10)', 'card_border' => 'rgba(229,192,74,0.30)'],
            'black-yellow' => ['bg' => '#0d0d0d', 'accent' => '#facc15', 'secondary' => '#e5e5e5', 'text' => '#ffffff', 'card' => 'rgba(250,204,21,0.10)', 'card_border' => 'rgba(250,204,21,0.30)'],
        ];
        if (isset($presets[$theme])) return $presets[$theme];
        // custom theme — user colors win
        $accent = $options['accent_color'] ?? '#3b82f6';
        return [
            'bg'          => $options['background_color'] ?? '#0a1f3d',
            'accent'      => $accent,
            'secondary'   => $options['secondary_color'] ?? '#93c5fd',
            'text'        => $options['text_color'] ?? '#ffffff',
            'card'        => 'rgba(255,255,255,0.06)',
            'card_border' => 'rgba(255,255,255,0.15)',
        ];
    }

    public function render(Player $player, array $options, string $title): string
    {
        $p = $this->palette($options);
        $photoSide = ($options['photo_side'] ?? 'right') === 'left' ? 'left' : 'right';

        $photoUrl = $this->pickPhoto($player, $options);
        $photoAbsPath = $photoUrl ? $this->esc($this->absolutePath($photoUrl)) : null;

        // Header: RF wordmark + tagline
        $tagline = $options['tagline'] ?? 'PROPULSEUR DE TALENTS';
        $header = '<div style="padding:8mm 10mm 4mm 10mm;">'
            .'<span style="font-size:16pt;font-weight:800;letter-spacing:1.5px;color:'.$p['text'].';">RENE</span>'
            .'<span style="font-size:16pt;font-weight:800;letter-spacing:1.5px;color:'.$p['accent'].';">FOOTBALL</span>'
            .'<div style="font-size:6pt;letter-spacing:3px;color:'.$p['secondary'].';margin-top:1mm;">'.$this->esc(mb_strtoupper($tagline)).'</div>'
            .'</div>';

        // Big name split-color: split at first whitespace/hyphen. If it's a
        // two-word name we colour the last name; otherwise we split "First-Second".
        [$firstName, $lastName] = $this->splitName($player->name);
        $nameHtml = '<div style="padding:0 10mm;line-height:0.95;">'
            .'<div style="font-size:34pt;font-weight:900;color:'.$p['text'].';letter-spacing:-0.5px;text-transform:uppercase;">'.$this->esc($firstName).'</div>'
            .'<div style="font-size:34pt;font-weight:900;color:'.$p['accent'].';letter-spacing:-0.5px;text-transform:uppercase;margin-top:1mm;">'.$this->esc($lastName).'</div>'
            .'</div>';

        // Info block (DOB / nationality / position / club / foot / agency)
        $infoBlock = $this->buildInfoBlock($player, $options, $p);

        // Points forts card — driven by strengths JSON
        $strengthsCard = $this->strengthsCardHtml($player, $p);

        // Caractéristiques card — 5 rows table
        $caracsCard = $this->caracsCardHtml($player, $p);

        // Profil du joueur (bio) + Objectif
        $profileHtml = $this->profileHtml($player, $p);

        // Galerie photos (up to 3)
        $galleryHtml = $this->galleryHtml($player, $p);

        // Partner blocks (existing base helpers) with the marketing palette applied
        $partnerAgency    = $this->partnerAgencyHtml($options, ['accent' => $p['accent'], 'text' => $p['text'], 'muted' => $p['secondary']]);
        $partnerAcademies = $this->partnerAcademiesHtml($options, ['accent' => $p['accent'], 'text' => $p['text'], 'muted' => $p['secondary']]);

        // Supervised by (like partner_agency but themed differently)
        $supervisedHtml = $this->supervisedByHtml($options, $p);

        // Player profile bars (Fiche 3 Saeed)
        $barsHtml = $this->barsHtml($options, $p);

        // Motto & slogan
        $motto  = trim((string) ($options['motto'] ?? ''));
        $slogan = trim((string) ($options['slogan_cursive'] ?? ''));

        // Photo panel — bleeds to edge; percentage width so DomPDF's table
        // layout puts it opposite the info column. Uses object-fit:cover via
        // fixed-height wrapper because DomPDF ignores object-fit in <img>.
        $photoCell = $photoAbsPath
            ? '<div style="width:100%;height:150mm;overflow:hidden;background:#111;position:relative;">'
                .'<img src="'.$photoAbsPath.'" style="width:100%;height:150mm;object-fit:cover;object-position:center;" />'
                .'</div>'
            : '<div style="width:100%;height:150mm;background:#222;"></div>';

        // Previous club chip (Fiche 4 "Vient de KRC Genk")
        $prevClub = trim((string) ($player->previous_club ?? ''));
        $prevChip = '';
        if ($prevClub !== '') {
            $prevLogo = trim((string) ($player->previous_club_logo ?? ''));
            $prevChip = '<div style="position:absolute;top:6mm;left:6mm;background:rgba(0,0,0,0.6);padding:2mm 4mm;border-radius:2mm;">'
                .'<div style="font-size:5pt;letter-spacing:2px;color:'.$p['secondary'].';text-transform:uppercase;font-weight:700;">Vient de</div>'
                .($prevLogo !== '' ? '<img src="'.$this->esc($this->absolutePath($prevLogo)).'" alt="" style="height:8mm;margin-top:1mm;">' : '')
                .'<div style="font-size:8pt;font-weight:700;color:'.$p['text'].';margin-top:1mm;">'.$this->esc(mb_strtoupper($prevClub)).'</div>'
                .'</div>';
        }

        // Column layout: photo left or right, info the other side. Rendered
        // as a DomPDF table because absolute positioning full-bleed is fragile.
        if ($photoSide === 'left') {
            $topRow = '<tr>'
                .'<td style="width:50%;vertical-align:top;padding:0;position:relative;">'.$photoCell.$prevChip.'</td>'
                .'<td style="width:50%;vertical-align:top;padding:0;">'.$header.$nameHtml.$infoBlock.'</td>'
                .'</tr>';
        } else {
            $topRow = '<tr>'
                .'<td style="width:50%;vertical-align:top;padding:0;">'.$header.$nameHtml.$infoBlock.'</td>'
                .'<td style="width:50%;vertical-align:top;padding:0;position:relative;">'.$photoCell.$prevChip.'</td>'
                .'</tr>';
        }

        // Middle band: Points forts (left) + Caractéristiques (right)
        $middleBand = '<table style="width:100%;border-collapse:collapse;margin-top:5mm;">'
            .'<tr>'
            .'<td style="width:50%;vertical-align:top;padding:4mm 4mm 4mm 10mm;">'.$strengthsCard.'</td>'
            .'<td style="width:50%;vertical-align:top;padding:4mm 10mm 4mm 4mm;">'.$caracsCard.'</td>'
            .'</tr></table>';

        // Bottom band: Profil du joueur (left) + Galerie (right)
        $bottomBand = ($profileHtml !== '' || $galleryHtml !== '')
            ? '<table style="width:100%;border-collapse:collapse;">'
                .'<tr>'
                .'<td style="width:50%;vertical-align:top;padding:2mm 4mm 4mm 10mm;">'.$profileHtml.'</td>'
                .'<td style="width:50%;vertical-align:top;padding:2mm 10mm 4mm 4mm;">'.$galleryHtml.'</td>'
                .'</tr></table>'
            : '';

        // Bars card (Saeed) — sits under profile when set
        $barsBand = $barsHtml !== ''
            ? '<div style="padding:2mm 10mm 4mm 10mm;">'.$barsHtml.'</div>'
            : '';

        // Partners band (agency + supervised + academies)
        $partnersBand = '';
        if ($partnerAgency !== '' || $supervisedHtml !== '' || $partnerAcademies !== '') {
            $partnersBand = '<div style="padding:4mm 10mm 4mm 10mm;border-top:1px solid '.$p['card_border'].';margin-top:2mm;">';
            if ($supervisedHtml !== '' || $partnerAgency !== '') {
                $partnersBand .= '<table style="width:100%;border-collapse:collapse;margin-bottom:3mm;"><tr>';
                if ($supervisedHtml !== '') $partnersBand .= '<td style="width:50%;vertical-align:top;padding-right:4mm;">'.$supervisedHtml.'</td>';
                if ($partnerAgency !== '')  $partnersBand .= '<td style="width:50%;vertical-align:top;padding-left:4mm;">'.$partnerAgency.'</td>';
                $partnersBand .= '</tr></table>';
            }
            $partnersBand .= $partnerAcademies;
            $partnersBand .= '</div>';
        }

        // Footer — motto + slogan + contact bar
        $footerBar = '<div style="background:'.$p['accent'].';padding:4mm 10mm;color:'.$p['bg'].';">'
            .'<table style="width:100%;border-collapse:collapse;font-size:8pt;font-weight:700;">'
            .'<tr>'
            .'<td style="text-align:left;">renefootball.com</td>'
            .'<td style="text-align:center;">+352 691 712 574</td>'
            .'<td style="text-align:right;">renefootball.p@gmail.com</td>'
            .'</tr></table>'
            .($motto !== '' ? '<div style="text-align:center;font-size:7pt;letter-spacing:3px;margin-top:2mm;">'.$this->esc(mb_strtoupper($motto)).'</div>' : '')
            .'</div>';

        $sloganHtml = $slogan !== ''
            ? '<div style="text-align:right;padding:2mm 10mm 0 10mm;font-style:italic;font-family:Georgia,serif;font-size:11pt;color:'.$p['secondary'].';">« '.$this->esc($slogan).' »</div>'
            : '';

        $lang = $this->lang($options);
        $fontFamily = $this->fontFamily($options);
        $bg = $p['bg'];
        $text = $p['text'];

        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}"><head><meta charset="utf-8"><style>
  @page { margin: 0; size: A4 portrait; }
  html, body { margin: 0; padding: 0; }
  body { font-family: {$fontFamily}; background: {$bg}; color: {$text}; }
</style></head><body>
  <table style="width:100%;border-collapse:collapse;">
    {$topRow}
  </table>
  {$middleBand}
  {$bottomBand}
  {$barsBand}
  {$partnersBand}
  {$sloganHtml}
  {$footerBar}
</body></html>
HTML;
    }

    /** Split a full name into [first, rest]. Handles single-word names too. */
    private function splitName(string $name): array
    {
        $name = trim($name);
        if ($name === '') return ['', ''];
        $parts = preg_split('/\s+/', $name, 2);
        if (count($parts) === 1) return [$parts[0], ''];
        return [$parts[0], $parts[1]];
    }

    /**
     * Info block: rows of "icon-ish glyph + label + value". No SVG icons —
     * we use unicode bullets + emoji fallbacks so DomPDF doesn't need any
     * font shim.
     */
    private function buildInfoBlock(Player $player, array $options, array $p): string
    {
        $rows = [];

        // DOB first (fallback to age)
        $dob = null;
        if (! empty($player->date_of_birth)) {
            try { $dob = Carbon::parse($player->date_of_birth)->format('d-m-Y'); } catch (\Throwable) {}
        }
        if ($dob) {
            $rows[] = ['DATE DE NAISSANCE', $dob, '#'];
        } else {
            $rows[] = ['ÂGE', ((int) $player->age).' ans', '#'];
        }

        // Nationality (+ secondary)
        $natVal = $player->nationality ?: '';
        if ($player->secondary_nationality) $natVal .= ' / '.$player->secondary_nationality;
        if ($natVal !== '') $rows[] = ['NATIONALITÉ', mb_strtoupper($natVal), '#'];

        // Position (prefer best_position for marketing)
        $posVal = trim((string) ($player->best_position ?? '')) ?: (string) $player->position;
        if ($posVal !== '') $rows[] = ['POSITION', mb_strtoupper($posVal), '#'];

        // Club + logo
        if ($player->club) {
            $clubLogo = trim((string) ($player->club_logo_url ?? ''));
            $clubVal = $this->esc(mb_strtoupper($player->club));
            if ($clubLogo !== '') {
                $clubVal = '<img src="'.$this->esc($this->absolutePath($clubLogo)).'" alt="" style="height:5mm;vertical-align:middle;margin-right:2mm;">'.$clubVal;
            }
            $rows[] = ['CLUB', $clubVal, '#', true];
        }

        // Foot
        if ($player->preferred_foot) {
            $rows[] = ['PIED FORT', mb_strtoupper($this->tFoot($player->preferred_foot, $options)), '#'];
        }

        // Languages
        $langs = is_array($player->languages_spoken) ? $player->languages_spoken : [];
        if (! empty($langs)) {
            $rows[] = ['LANGUES PARLÉES', mb_strtoupper(implode(' // ', $langs)), '#'];
        }

        // Agency (always Renefootball)
        $rows[] = ['AGENCE', 'RENEFOOTBALL', '#'];

        $html = '<div style="padding:8mm 10mm 4mm 10mm;">';
        foreach ($rows as $r) {
            [$label, $value, $glyph] = $r;
            $isHtml = $r[3] ?? false;
            $safeVal = $isHtml ? $value : $this->esc($value);
            $html .= '<div style="margin-bottom:3mm;">'
                .'<table style="border-collapse:collapse;width:100%;">'
                .'<tr>'
                .'<td style="width:8mm;vertical-align:top;padding-top:1mm;">'
                    .'<div style="width:6mm;height:6mm;border-radius:3mm;background:'.$p['card'].';border:0.5px solid '.$p['card_border'].';text-align:center;line-height:6mm;color:'.$p['accent'].';font-size:8pt;font-weight:900;">'.$glyph.'</div>'
                    .'</td>'
                .'<td style="vertical-align:top;padding-left:2mm;">'
                    .'<div style="font-size:6.5pt;letter-spacing:2px;color:'.$p['secondary'].';font-weight:700;">'.$this->esc($label).'</div>'
                    .'<div style="font-size:10pt;font-weight:700;color:'.$p['text'].';margin-top:0.5mm;">'.$safeVal.'</div>'
                    .'</td>'
                .'</tr></table>'
                .'</div>';
        }
        $html .= '</div>';
        return $html;
    }

    private function strengthsCardHtml(Player $player, array $p): string
    {
        $strengths = is_array($player->strengths) ? $player->strengths : [];
        if (empty($strengths)) return '';
        $rows = '';
        foreach (array_slice($strengths, 0, 6) as $s) {
            $label = $s['label'] ?? ($s['key'] ?? '');
            if (trim((string) $label) === '') continue;
            $rows .= '<tr>'
                .'<td style="width:5mm;vertical-align:middle;color:'.$p['accent'].';font-size:11pt;font-weight:900;padding:1mm 0;">•</td>'
                .'<td style="vertical-align:middle;font-size:9pt;color:'.$p['text'].';font-weight:600;padding:1mm 0;">'.$this->esc($label).'</td>'
                .'</tr>';
        }
        return '<div style="background:'.$p['card'].';border:0.5px solid '.$p['card_border'].';border-radius:2mm;padding:5mm;">'
            .'<div style="font-size:8pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:3mm;">POINTS FORTS</div>'
            .'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>'
            .'</div>';
    }

    private function caracsCardHtml(Player $player, array $p): string
    {
        $rows = [];
        if ($player->preferred_foot) $rows[] = ['PIED FORT',  mb_strtoupper($player->preferred_foot)];
        if ($player->playing_style)  $rows[] = ['STYLE DE JEU', $player->playing_style];
        if ($player->best_position)  $rows[] = ['MEILLEUR POSTE', $player->best_position];
        $mental = is_array($player->mental_strengths) ? $player->mental_strengths : [];
        if (! empty($mental)) $rows[] = ['POINTS FORTS MENTAUX', implode(' – ', $mental)];
        if ($player->objective) $rows[] = ['OBJECTIF', $this->safeText($player->objective, 200)];
        if (empty($rows)) return '';

        $html = '<div style="background:'.$p['card'].';border:0.5px solid '.$p['card_border'].';border-radius:2mm;padding:5mm;">'
            .'<div style="font-size:8pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:3mm;">CARACTÉRISTIQUES</div>'
            .'<table style="width:100%;border-collapse:collapse;">';
        foreach ($rows as $r) {
            $html .= '<tr>'
                .'<td style="vertical-align:top;padding:1.5mm 3mm 1.5mm 0;border-bottom:0.5px solid '.$p['card_border'].';font-size:6.5pt;letter-spacing:1.5px;color:'.$p['secondary'].';font-weight:700;width:45%;">'.$this->esc($r[0]).'</td>'
                .'<td style="vertical-align:top;padding:1.5mm 0;border-bottom:0.5px solid '.$p['card_border'].';font-size:8.5pt;color:'.$p['text'].';font-weight:600;">'.$this->esc($r[1]).'</td>'
                .'</tr>';
        }
        $html .= '</table></div>';
        return $html;
    }

    private function profileHtml(Player $player, array $p): string
    {
        $bio = $this->safeText($player->bio, 500);
        if ($bio === '') return '';
        return '<div>'
            .'<div style="font-size:8pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:2mm;">PROFIL DU JOUEUR</div>'
            .'<p style="font-size:8.5pt;line-height:1.5;color:'.$p['text'].';margin:0;">'.nl2br($this->esc($bio)).'</p>'
            .'</div>';
    }

    private function galleryHtml(Player $player, array $p): string
    {
        $photos = is_array($player->gallery_photos) ? $player->gallery_photos : [];
        $photos = array_values(array_filter(array_map('trim', $photos), static fn ($u) => $u !== ''));
        $photos = array_slice($photos, 0, 3);
        if (empty($photos)) return '';
        $cells = '';
        foreach ($photos as $u) {
            $cells .= '<td style="width:33%;padding:0 1mm;">'
                .'<div style="width:100%;height:35mm;overflow:hidden;border-radius:2mm;border:0.5px solid '.$p['card_border'].';">'
                .'<img src="'.$this->esc($this->absolutePath($u)).'" alt="" style="width:100%;height:35mm;object-fit:cover;">'
                .'</div></td>';
        }
        return '<div>'
            .'<div style="font-size:8pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:2mm;">PHOTOS</div>'
            .'<table style="width:100%;border-collapse:collapse;"><tr>'.$cells.'</tr></table>'
            .'</div>';
    }

    private function barsHtml(array $options, array $p): string
    {
        $bars = is_array($options['player_profile_bars'] ?? null) ? $options['player_profile_bars'] : [];
        $bars = array_values(array_filter($bars, static fn ($b) => is_array($b) && ! empty($b['label'])));
        if (empty($bars)) return '';

        $rows = '';
        foreach (array_slice($bars, 0, 8) as $b) {
            $pct = max(0, min(100, (int) ($b['pct'] ?? 0)));
            $rows .= '<tr>'
                .'<td style="width:35%;font-size:8pt;color:'.$p['text'].';font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:1.5mm 3mm 1.5mm 0;">'.$this->esc($b['label']).'</td>'
                .'<td style="padding:1.5mm 0;">'
                    .'<div style="height:2.5mm;width:100%;background:'.$p['card_border'].';border-radius:1.5mm;overflow:hidden;">'
                    .'<div style="height:2.5mm;width:'.$pct.'%;background:'.$p['accent'].';"></div>'
                    .'</div>'
                    .'</td>'
                .'<td style="width:14mm;text-align:right;font-size:8pt;color:'.$p['accent'].';font-weight:800;padding-left:3mm;">'.$pct.'%</td>'
                .'</tr>';
        }
        return '<div style="background:'.$p['card'].';border:0.5px solid '.$p['card_border'].';border-radius:2mm;padding:5mm;">'
            .'<div style="font-size:8pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:3mm;">PLAYER PROFILE</div>'
            .'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>'
            .'</div>';
    }

    private function supervisedByHtml(array $options, array $p): string
    {
        $sb = $options['supervised_by'] ?? null;
        if (! is_array($sb)) return '';
        $name = trim((string) ($sb['name'] ?? ''));
        $logo = trim((string) ($sb['logo_url'] ?? ''));
        $country = trim((string) ($sb['country'] ?? ''));
        $cc = trim((string) ($sb['country_code'] ?? ''));
        if ($name === '' && $logo === '' && $country === '') return '';

        $flag = $cc !== ''
            ? '<img src="https://flagcdn.com/w40/'.$this->esc(strtolower($cc)).'.png" width="16" height="12" style="vertical-align:middle;margin-right:1.5mm;">'
            : '';

        return '<div style="padding:3mm 4mm;background:'.$p['card'].';border:0.5px solid '.$p['card_border'].';border-radius:2mm;">'
            .'<div style="font-size:6.5pt;letter-spacing:2px;color:'.$p['secondary'].';font-weight:700;margin-bottom:1.5mm;">SUPERVISÉ PAR</div>'
            .($logo !== '' ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:9mm;max-width:36mm;object-fit:contain;margin-bottom:1mm;">' : '')
            .($name !== '' ? '<div style="font-size:10pt;font-weight:800;color:'.$p['text'].';">'.$this->esc($name).'</div>' : '')
            .($country !== '' ? '<div style="font-size:7.5pt;color:'.$p['secondary'].';margin-top:1mm;">'.$flag.$this->esc(mb_strtoupper($country)).'</div>' : '')
            .'</div>';
    }
}
