<?php

namespace App\Services\Presentations\Templates;

use App\Models\Player;
use App\Services\Presentations\PresentationTemplate;
use Carbon\Carbon;

/**
 * "Marketing v1" - reproduces the dark agency fiches used by René Football
 * (Hanibal / Destiny / Camara / Saeed / Zoran references).
 *
 * Layout knobs:
 *   theme       : navy | violet | black-gold | black-yellow (default: black-gold)
 *   photo_side  : left | right                              (default: left)
 *   name_split  : auto | first-last (colour split on the last word)
 *   show_watermark : bool - ghost "RF" behind the name
 *   tagline / motto / slogan_cursive / supervised_by / player_profile_bars
 *
 * The visual anchors are: giant split-colour name, full-bleed hero photo,
 * SVG-icon info block, checkmark bullets on strengths, gold-bordered partner
 * cards, and a yellow contact bar at the bottom.
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
            'theme'            => 'black-gold',
            'photo_side'       => 'left',
            'accent_color'     => '#d4a017',
            'secondary_color'  => '#a89570',
            'text_color'       => '#ffffff',
            'background_color' => '#0a0a0a',
            'font_family'      => 'sans',
            'show_watermark'   => true,
        ];
    }

    public static function thumbnailSvg(): string
    {
        return '<svg viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg">'
            .'<rect width="60" height="84" fill="#0a0a0a"/>'
            .'<rect x="0" y="0" width="30" height="60" fill="#1a1a1a"/>'
            .'<rect x="34" y="8" width="16" height="6" fill="#ffffff"/>'
            .'<rect x="34" y="16" width="20" height="6" fill="#d4a017"/>'
            .'<rect x="34" y="30" width="4" height="4" fill="#d4a017"/>'
            .'<rect x="40" y="30" width="14" height="4" fill="#ffffff" opacity="0.6"/>'
            .'<rect x="34" y="38" width="4" height="4" fill="#d4a017"/>'
            .'<rect x="40" y="38" width="14" height="4" fill="#ffffff" opacity="0.6"/>'
            .'<rect x="34" y="46" width="4" height="4" fill="#d4a017"/>'
            .'<rect x="40" y="46" width="14" height="4" fill="#ffffff" opacity="0.6"/>'
            .'<rect x="0" y="78" width="60" height="6" fill="#d4a017"/>'
            .'</svg>';
    }

    private function palette(array $options): array
    {
        $theme = $options['theme'] ?? 'black-gold';
        $presets = [
            'violet'       => ['bg' => '#1a0f2e', 'accent' => '#8b5cf6', 'secondary' => '#c4b5fd', 'text' => '#ffffff', 'card' => 'rgba(139,92,246,0.10)', 'card_border' => 'rgba(196,181,253,0.30)', 'footer' => '#8b5cf6', 'footer_ink' => '#1a0f2e'],
            'navy'         => ['bg' => '#0a1f3d', 'accent' => '#3b82f6', 'secondary' => '#93c5fd', 'text' => '#ffffff', 'card' => 'rgba(59,130,246,0.10)', 'card_border' => 'rgba(147,197,253,0.30)', 'footer' => '#3b82f6', 'footer_ink' => '#0a1f3d'],
            'black-gold'   => ['bg' => '#0a0a0a', 'accent' => '#d4a017', 'secondary' => '#a89570', 'text' => '#ffffff', 'card' => 'rgba(212,160,23,0.08)', 'card_border' => 'rgba(212,160,23,0.35)', 'footer' => '#d4a017', 'footer_ink' => '#0a0a0a'],
            'black-yellow' => ['bg' => '#0d0d0d', 'accent' => '#facc15', 'secondary' => '#e5e5e5', 'text' => '#ffffff', 'card' => 'rgba(250,204,21,0.08)', 'card_border' => 'rgba(250,204,21,0.35)', 'footer' => '#facc15', 'footer_ink' => '#0d0d0d'],
        ];
        if (isset($presets[$theme])) return $presets[$theme];
        $accent = $options['accent_color'] ?? '#d4a017';
        return [
            'bg'          => $options['background_color'] ?? '#0a0a0a',
            'accent'      => $accent,
            'secondary'   => $options['secondary_color'] ?? '#a89570',
            'text'        => $options['text_color'] ?? '#ffffff',
            'card'        => 'rgba(255,255,255,0.05)',
            'card_border' => 'rgba(255,255,255,0.20)',
            'footer'      => $accent,
            'footer_ink'  => $options['background_color'] ?? '#0a0a0a',
        ];
    }

    public function render(Player $player, array $options, string $title): string
    {
        $p = $this->palette($options);
        $photoSide = ($options['photo_side'] ?? 'left') === 'right' ? 'right' : 'left';
        $showWatermark = (bool) ($options['show_watermark'] ?? true);

        $photoUrl = $this->pickPhoto($player, $options);
        $photoAbsPath = $photoUrl ? $this->esc($this->absolutePath($photoUrl)) : null;

        // ---------- Right / info column ----------

        // Logo brand block (real Rene Football logo + tagline + optional motto).
        // All Marketing themes render on a dark background, so we embed the
        // white variant. Encoded inline as a data URI so both DomPDF's file
        // loader and the browser iframe preview can render it without any
        // routing gymnastics.
        $tagline = trim((string) ($options['tagline'] ?? 'AGENCE DE JOUEURS'));
        $headerMotto = trim((string) ($options['header_motto'] ?? ''));
        $logoDataUri = $this->logoDataUri('white');
        $brandBlock = '<div style="padding:0 0 4mm 0;">'
            .($logoDataUri !== ''
                ? '<img src="'.$logoDataUri.'" alt="Rene Football" style="height:15mm;width:auto;display:block;">'
                // Fallback wordmark if the logo file is missing on disk.
                : '<div style="font-size:18pt;font-weight:900;letter-spacing:0.5px;color:'.$p['text'].';line-height:1;">'
                    .'<span style="color:'.$p['accent'].';">R</span><span style="color:'.$p['text'].';">F</span>'
                    .'&nbsp;&nbsp;<span style="font-size:10pt;letter-spacing:3px;font-weight:800;">RENE<span style="color:'.$p['accent'].';">FOOTBALL</span></span>'
                .'</div>'
            )
            .($tagline !== '' ? '<div style="font-size:5.5pt;letter-spacing:3px;color:'.$p['secondary'].';margin-top:1.5mm;font-weight:700;">'.$this->esc(mb_strtoupper($tagline)).'</div>' : '')
            .($headerMotto !== '' ? '<div style="font-size:6.5pt;letter-spacing:3px;color:'.$p['accent'].';margin-top:1.5mm;font-weight:800;">'.$this->esc(mb_strtoupper($headerMotto)).'</div>' : '')
            .'</div>';

        // Giant name — split first/rest, first line white, second line accent gold
        [$firstName, $lastName] = $this->splitName($player->name);
        $nameFontSize = mb_strlen($firstName.$lastName) > 18 ? '40pt' : '52pt';
        $subFontSize  = mb_strlen($firstName.$lastName) > 18 ? '34pt' : '44pt';

        $watermark = $showWatermark
            ? '<div style="position:absolute;top:-4mm;right:-4mm;font-size:120pt;font-weight:900;color:'.$p['accent'].';opacity:0.08;line-height:0.8;letter-spacing:-4px;pointer-events:none;">RF</div>'
            : '';

        $nameBlock = '<div style="position:relative;padding:4mm 0 2mm 0;">'
            .$watermark
            .'<div style="font-size:'.$nameFontSize.';font-weight:900;color:'.$p['text'].';line-height:0.9;letter-spacing:-1px;text-transform:uppercase;position:relative;">'.$this->esc($firstName).'</div>'
            .($lastName !== ''
                ? '<div style="font-size:'.$subFontSize.';font-weight:900;color:'.$p['accent'].';line-height:0.9;letter-spacing:-1px;text-transform:uppercase;margin-top:2mm;position:relative;">'.$this->esc($lastName).'</div>'
                : '')
            .'</div>';

        // Sub-title (best position or category)
        $subtitle = trim((string) ($player->best_position ?? '')) ?: (string) $player->position;
        $subtitleBlock = $subtitle !== ''
            ? '<div style="font-size:9pt;letter-spacing:4px;color:'.$p['accent'].';font-weight:800;text-transform:uppercase;margin:3mm 0 0 0;padding-bottom:3mm;border-bottom:1px solid '.$p['card_border'].';">'.$this->esc($subtitle).'</div>'
            : '';

        // Info block with SVG icons
        $infoBlock = $this->buildInfoBlock($player, $options, $p);

        // Right column - inner content (no outer padding) so we can wrap it
        // in different chrome depending on whether we have a photo or not.
        $rightColumnInner = $brandBlock
            .$nameBlock
            .$subtitleBlock
            .'<div style="margin-top:2mm;">'.$infoBlock.'</div>';
        $rightColumn = '<div style="padding:6mm 8mm 3mm 8mm;">'.$rightColumnInner.'</div>';

        // ---------- Left / photo column ----------

        // "Vient de" chip
        $prevClub = trim((string) ($player->previous_club ?? ''));
        $prevChip = '';
        if ($prevClub !== '') {
            $prevLogo = trim((string) ($player->previous_club_logo ?? ''));
            $prevChip = '<div style="position:absolute;top:12mm;left:6mm;padding:3mm 4mm;background:rgba(0,0,0,0.55);border-left:2px solid '.$p['accent'].';color:'.$p['text'].';">'
                .'<div style="font-size:6pt;letter-spacing:2px;color:'.$p['secondary'].';font-weight:700;text-transform:uppercase;margin-bottom:1mm;">Vient de</div>'
                .($prevLogo !== '' ? '<img src="'.$this->esc($this->absolutePath($prevLogo)).'" alt="" style="height:10mm;max-width:22mm;object-fit:contain;margin:1mm 0;"><br>' : '')
                .'<div style="font-size:8pt;font-weight:800;letter-spacing:1px;text-transform:uppercase;">'.$this->esc($prevClub).'</div>'
                .'</div>';
        }

        // Photo panel — bleeds vertically. When no photo is available we
        // skip the whole photo column and let the info column stretch to
        // full width; the previous fallback ("gray box") wasted 48% of the
        // hero band and made the fiche look unfinished.
        $topStyle = 'width:100%;border-collapse:collapse;table-layout:fixed;height:115mm;';
        if ($photoAbsPath) {
            $photoCell = '<div style="width:100%;height:115mm;overflow:hidden;background:#0f0f0f;position:relative;">'
                .'<img src="'.$photoAbsPath.'" style="width:100%;height:115mm;object-fit:cover;object-position:center;">'
                .$prevChip
                .'</div>';
            if ($photoSide === 'right') {
                $topRow = '<table style="'.$topStyle.'">'
                    .'<tr style="height:115mm;">'
                    .'<td style="width:52%;vertical-align:top;padding:0;height:115mm;overflow:hidden;">'.$rightColumn.'</td>'
                    .'<td style="width:48%;vertical-align:top;padding:0;height:115mm;">'.$photoCell.'</td>'
                    .'</tr></table>';
            } else {
                $topRow = '<table style="'.$topStyle.'">'
                    .'<tr style="height:115mm;">'
                    .'<td style="width:48%;vertical-align:top;padding:0;height:115mm;">'.$photoCell.'</td>'
                    .'<td style="width:52%;vertical-align:top;padding:0;height:115mm;overflow:hidden;">'.$rightColumn.'</td>'
                    .'</tr></table>';
            }
        } else {
            // No photo → full-width hero. We drop the photo cell entirely
            // (previous fallback wasted 48% of the band on a dark
            // rectangle) and centre the info block for balance.
            $topRow = '<div style="width:100%;padding:6mm 14mm 3mm 14mm;box-sizing:border-box;">'
                .'<div style="max-width:170mm;margin:0 auto;position:relative;">'
                .$rightColumnInner
                .$prevChip
                .'</div></div>';
        }

        // ---------- Content bands ----------
        // Middle band composition is data-driven:
        //   - "parcours-strengths" — Hanibal fiche (Parcours left, Qualités right)
        //   - "profile-caracteristiques" — Zoran fiche (Points forts left, Caractéristiques right)
        //   - default — Destiny/Adams (Profil du joueur left, Points forts right)

        $variant = $options['middle_variant'] ?? 'profile-strengths';

        $strengthsHtml = $this->strengthsCardHtml($player, $p, 'Points forts');
        $qualitiesHtml = $this->strengthsCardHtml($player, $p, 'Qualités');
        $profileHtml   = $this->profileHtml($player, $p);
        $caracsHtml    = $this->caracteristiquesCardHtml($player, $p);
        $parcoursHtml  = $this->parcoursHtml($player, $p);
        $barsCardHtml  = $this->barsHtml($options, $p, 'Player Profile');

        [$leftBlock, $rightBlock] = match ($variant) {
            'parcours-strengths'        => [$parcoursHtml, $qualitiesHtml],
            'profile-caracteristiques'  => [$strengthsHtml, $caracsHtml],
            'profile-bars'              => [$profileHtml,  $barsCardHtml],
            default                     => [$profileHtml,  $strengthsHtml],
        };

        $middleBand = '';
        if ($leftBlock !== '' || $rightBlock !== '') {
            $middleBand = '<table style="width:100%;border-collapse:collapse;margin-top:0mm;">'
                .'<tr>'
                .'<td style="width:50%;vertical-align:top;padding:3mm 6mm 2mm 8mm;border-right:1px solid '.$p['card_border'].';">'.$leftBlock.'</td>'
                .'<td style="width:50%;vertical-align:top;padding:3mm 8mm 2mm 6mm;">'.$rightBlock.'</td>'
                .'</tr></table>';
        }

        // Photo gallery strip (Zoran, Saeed) - 3 photos side by side. Rendered
        // between middle band and partners band.
        $galleryHtml = $this->galleryStripHtml($player, $p);

        // Projet sportif intro (bio-driven) + academies grid
        $projetIntro = $this->projetSportifIntro($player, $options, $p);
        $academies   = $this->academiesGrid($options, $p);
        $supervised  = $this->supervisedCard($options, $p);
        $partnerAgency = $this->partnerAgencyCard($options, $p);

        $partnersBand = '';
        if ($projetIntro !== '' || $academies !== '' || $supervised !== '' || $partnerAgency !== '') {
            $mainCol = $projetIntro.$academies;
            $sideCol = $supervised.$partnerAgency;

            if ($sideCol !== '') {
                $partnersBand = '<div style="padding:1mm 8mm 3mm 8mm;">'
                    .'<div style="font-size:11pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;text-transform:uppercase;margin-bottom:3mm;border-left:3px solid '.$p['accent'].';padding-left:3mm;">Projet Sportif</div>'
                    .'<table style="width:100%;border-collapse:collapse;table-layout:fixed;">'
                    .'<tr>'
                    .'<td style="width:66%;vertical-align:top;padding-right:6mm;">'.$mainCol.'</td>'
                    .'<td style="width:34%;vertical-align:top;padding-left:4mm;border-left:1px solid '.$p['card_border'].';">'.$sideCol.'</td>'
                    .'</tr></table>'
                    .'</div>';
            } elseif ($mainCol !== '') {
                $partnersBand = '<div style="padding:1mm 8mm 3mm 8mm;">'
                    .'<div style="font-size:11pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;text-transform:uppercase;margin-bottom:3mm;border-left:3px solid '.$p['accent'].';padding-left:3mm;">Projet Sportif</div>'
                    .$mainCol
                    .'</div>';
            }
        }

        // Bars (Saeed) - optional. Skipped when the middle band already
        // consumed them via variant=profile-bars, avoids a duplicate render.
        $barsHtml = ($variant === 'profile-bars')
            ? ''
            : $this->barsHtml($options, $p);
        $barsBand = $barsHtml !== '' ? '<div style="padding:0 8mm 2mm 8mm;">'.$barsHtml.'</div>' : '';

        // Cursive slogan - inlined into the footer bar to save vertical space.
        $slogan = trim((string) ($options['slogan_cursive'] ?? ''));
        $sloganHtml = '';

        // Yellow footer bar
        $motto  = trim((string) ($options['motto'] ?? ''));
        $footerBar = $this->footerBar($options, $p, $motto, $slogan);

        // ---------- Assemble ----------

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
  {$topRow}
  {$middleBand}
  {$galleryHtml}
  {$partnersBand}
  {$barsBand}
  {$sloganHtml}
  {$footerBar}
</body></html>
HTML;
    }

    // ==================== Sub-blocks ====================

    private function splitName(string $name): array
    {
        $name = trim($name);
        if ($name === '') return ['', ''];
        $parts = preg_split('/\s+/', $name);
        if (count($parts) === 1) return [$parts[0], ''];
        // First word = firstname, all other words = "last" (Camara Philan, Destiny Megogo)
        return [$parts[0], implode(' ', array_slice($parts, 1))];
    }

    /**
     * Info block: gold-bordered square icon + label + value, stacked rows.
     */
    private function buildInfoBlock(Player $player, array $options, array $p): string
    {
        $rows = [];

        // Date of birth (fallback: age)
        $dob = null;
        if (! empty($player->date_of_birth)) {
            try { $dob = Carbon::parse($player->date_of_birth)->format('d / m / Y'); } catch (\Throwable) {}
        }
        if ($dob) {
            $rows[] = ['icon' => $this->iconCalendar($p['accent']), 'label' => 'Date de naissance', 'value' => $dob];
        } elseif ($player->age) {
            $rows[] = ['icon' => $this->iconCalendar($p['accent']), 'label' => 'Âge', 'value' => ((int) $player->age).' ans'];
        }

        // Nationality with optional flag
        $natVal = mb_strtoupper(trim((string) $player->nationality));
        if (! empty($player->secondary_nationality)) {
            $natVal .= ' / '.mb_strtoupper($player->secondary_nationality);
        }
        if ($natVal !== '') {
            $rows[] = ['icon' => $this->iconGlobe($p['accent']), 'label' => 'Nationalité', 'value' => $natVal];
        }

        // Position (best_position preferred) - only if not already shown as
        // the subtitle under the name (saves a full row of vertical space).
        $subtitle = trim((string) ($player->best_position ?? '')) ?: (string) $player->position;
        $posVal   = (string) $player->position;
        if ($posVal !== '' && mb_strtoupper($posVal) !== mb_strtoupper($subtitle)) {
            $rows[] = ['icon' => $this->iconPitch($p['accent']), 'label' => 'Position', 'value' => mb_strtoupper($posVal)];
        }

        // Club (with logo inline if present)
        if ($player->club) {
            $clubLogo = trim((string) ($player->club_logo_url ?? ''));
            $clubHtml = $clubLogo !== ''
                ? '<img src="'.$this->esc($this->absolutePath($clubLogo)).'" alt="" style="height:5mm;vertical-align:middle;margin-right:2mm;">'
                    .'<span style="vertical-align:middle;">'.$this->esc(mb_strtoupper($player->club)).'</span>'
                : $this->esc(mb_strtoupper($player->club));
            $rows[] = ['icon' => $this->iconShield($p['accent']), 'label' => 'Club actuel', 'value' => $clubHtml, 'html' => true];
        }

        // Preferred foot
        if ($player->preferred_foot) {
            $rows[] = ['icon' => $this->iconFoot($p['accent']), 'label' => 'Pied fort', 'value' => mb_strtoupper($this->tFoot($player->preferred_foot, $options))];
        }

        // Languages (optional)
        $langs = is_array($player->languages_spoken) ? $player->languages_spoken : [];
        if (! empty($langs)) {
            $rows[] = ['icon' => $this->iconLangs($p['accent']), 'label' => 'Langues parlées', 'value' => mb_strtoupper(implode(' // ', $langs))];
        }

        // Agency always at the bottom (skip if agency line disabled)
        if (($options['hide_agency_row'] ?? false) !== true) {
            $rows[] = ['icon' => $this->iconBriefcase($p['accent']), 'label' => 'Agence', 'value' => 'RENEFOOTBALL'];
        }

        $html = '';
        foreach ($rows as $r) {
            $safeVal = ($r['html'] ?? false) ? $r['value'] : $this->esc($r['value']);
            $html .= '<table style="width:100%;border-collapse:collapse;margin-bottom:2mm;">'
                .'<tr>'
                .'<td style="width:12mm;vertical-align:middle;">'
                    .'<div style="width:10mm;height:10mm;border:1px solid '.$p['accent'].';text-align:center;padding:1.2mm 0 0 0;">'.$r['icon'].'</div>'
                    .'</td>'
                .'<td style="vertical-align:middle;padding-left:3mm;">'
                    .'<div style="font-size:6.5pt;letter-spacing:2px;color:'.$p['secondary'].';font-weight:700;text-transform:uppercase;">'.$this->esc($r['label']).'</div>'
                    .'<div style="font-size:9.5pt;font-weight:800;color:'.$p['text'].';margin-top:0.5mm;line-height:1.2;">'.$safeVal.'</div>'
                    .'</td>'
                .'</tr></table>';
        }
        return $html;
    }

    private function strengthsCardHtml(Player $player, array $p, string $title = 'Points forts'): string
    {
        // Cap at 6 - fits inside the middle band without pushing the partners
        // band off the page when the player also has a full bio.
        $strengths = $this->strengthsList($player, 6);
        if (empty($strengths)) return '';

        $rows = '';
        foreach ($strengths as $s) {
            $rows .= '<tr>'
                .'<td style="width:7mm;vertical-align:middle;padding:0.9mm 0;">'.$this->iconCheck($p['accent']).'</td>'
                .'<td style="vertical-align:middle;font-size:8.5pt;color:'.$p['text'].';font-weight:600;padding:0.9mm 0;line-height:1.25;">'.$this->esc($s).'</td>'
                .'</tr>';
        }

        return '<div style="font-size:10pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;margin-bottom:3mm;text-transform:uppercase;border-left:3px solid '.$p['accent'].';padding-left:3mm;">'.$this->esc($title).'</div>'
            .'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>';
    }

    /**
     * Caractéristiques table (Zoran fiche): PIED FORT / STYLE DE JEU /
     * MEILLEUR POSTE / POINTS FORTS MENTAUX / OBJECTIF, one row per non-null
     * field. Renders as a compact 2-column table.
     */
    private function caracteristiquesCardHtml(Player $player, array $p): string
    {
        $rows = [];
        if ($player->preferred_foot)             $rows[] = ['PIED FORT',            $player->preferred_foot];
        if (trim((string) $player->playing_style) !== '')   $rows[] = ['STYLE DE JEU',   $player->playing_style];
        if (trim((string) $player->best_position) !== '')   $rows[] = ['MEILLEUR POSTE', $player->best_position];

        $mental = is_array($player->mental_strengths) ? array_values(array_filter($player->mental_strengths)) : [];
        if (! empty($mental)) $rows[] = ['POINTS FORTS MENTAUX', implode(' – ', $mental)];

        if (trim((string) $player->objective) !== '') $rows[] = ['OBJECTIF', $this->safeText($player->objective, 180)];

        if (empty($rows)) return '';

        $body = '';
        foreach ($rows as [$label, $value]) {
            $body .= '<tr>'
                .'<td style="vertical-align:top;padding:1.6mm 3mm 1.6mm 0;border-bottom:0.5px solid '.$p['card_border'].';font-size:7pt;letter-spacing:1.5px;color:'.$p['secondary'].';font-weight:800;width:38%;text-transform:uppercase;">'.$this->esc($label).'</td>'
                .'<td style="vertical-align:top;padding:1.6mm 0;border-bottom:0.5px solid '.$p['card_border'].';font-size:8.5pt;color:'.$p['text'].';font-weight:700;">'.$this->esc($value).'</td>'
                .'</tr>';
        }

        return '<div style="font-size:10pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;margin-bottom:2mm;text-transform:uppercase;border-left:3px solid '.$p['accent'].';padding-left:3mm;">Caractéristiques</div>'
            .'<table style="width:100%;border-collapse:collapse;">'.$body.'</table>';
    }

    /**
     * Parcours block (Hanibal fiche): year range + club logo + club name for
     * each entry in `career_history` (JSON array of {years, club, logo_url}).
     */
    private function parcoursHtml(Player $player, array $p): string
    {
        $history = is_array($player->career_history) ? $player->career_history : [];
        $history = array_values(array_filter($history, static fn ($h) =>
            is_array($h) && (
                (isset($h['club']) && trim((string) $h['club']) !== '')
                || (isset($h['years']) && trim((string) $h['years']) !== '')
            )
        ));
        if (empty($history)) return '';

        $rows = '';
        foreach (array_slice($history, 0, 4) as $h) {
            $years = trim((string) ($h['years'] ?? ''));
            $club  = trim((string) ($h['club']  ?? ''));
            $logo  = trim((string) ($h['logo_url'] ?? ''));

            $logoCell = $logo !== ''
                ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:9mm;max-width:14mm;object-fit:contain;">'
                : '<div style="width:9mm;height:9mm;border:1px solid '.$p['card_border'].';"></div>';

            $rows .= '<tr>'
                .'<td style="width:25mm;padding:2mm 3mm 2mm 0;font-size:9pt;font-weight:800;color:'.$p['text'].';letter-spacing:1px;vertical-align:middle;">'.$this->esc($years).'</td>'
                .'<td style="width:16mm;padding:2mm 3mm;vertical-align:middle;">'.$logoCell.'</td>'
                .'<td style="padding:2mm 0;font-size:9pt;font-weight:800;color:'.$p['text'].';letter-spacing:1px;text-transform:uppercase;vertical-align:middle;">'.$this->esc($club).'</td>'
                .'</tr>';
        }

        return '<div style="font-size:10pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;margin-bottom:2mm;text-transform:uppercase;border-left:3px solid '.$p['accent'].';padding-left:3mm;">Parcours</div>'
            .'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>';
    }

    /**
     * 3-photo gallery strip (Zoran, Saeed). Reads Player.gallery_photos and
     * lays up to 3 photos side by side. Empty when the field is empty.
     */
    private function galleryStripHtml(Player $player, array $p): string
    {
        $photos = is_array($player->gallery_photos) ? $player->gallery_photos : [];
        $photos = array_values(array_filter(array_map(static fn ($u) => trim((string) $u), $photos), static fn ($u) => $u !== ''));
        if (empty($photos)) return '';

        $cells = '';
        foreach (array_slice($photos, 0, 3) as $u) {
            $cells .= '<td style="width:33%;padding:0 1mm;">'
                .'<div style="width:100%;height:34mm;overflow:hidden;border:1px solid '.$p['card_border'].';">'
                .'<img src="'.$this->esc($this->absolutePath($u)).'" alt="" style="width:100%;height:34mm;object-fit:cover;">'
                .'</div>'
                .'</td>';
        }

        return '<div style="padding:1mm 8mm 3mm 8mm;">'
            .'<table style="width:100%;border-collapse:collapse;">'
            .'<tr>'.$cells.'</tr></table>'
            .'</div>';
    }

    private function profileHtml(Player $player, array $p): string
    {
        $bio = $this->safeText($player->bio, 380);
        if ($bio === '') return '';
        return '<div style="font-size:10pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;margin-bottom:2mm;text-transform:uppercase;border-left:3px solid '.$p['accent'].';padding-left:3mm;">Profil du joueur</div>'
            .'<p style="font-size:8.5pt;line-height:1.4;color:'.$p['text'].';margin:0;">'.nl2br($this->esc($bio)).'</p>';
    }

    private function projetSportifIntro(Player $player, array $options, array $p): string
    {
        $custom = trim((string) ($options['projet_intro'] ?? ''));
        if ($custom === '') return '';
        return '<p style="font-size:8.5pt;line-height:1.5;color:'.$p['text'].';margin:0 0 3mm 0;">'
            .nl2br($this->esc($this->safeText($custom, 400))).'</p>';
    }

    /**
     * Academies grid — reuses partner_academies option (country > clubs) but
     * restyles with a small flag + checkmark header, single-row grid per group.
     */
    private function academiesGrid(array $options, array $p): string
    {
        $groups = is_array($options['partner_academies'] ?? null) ? $options['partner_academies'] : [];
        $groups = array_values(array_filter($groups, static function ($g) {
            return is_array($g)
                && isset($g['clubs']) && is_array($g['clubs'])
                && count(array_filter($g['clubs'], static fn ($c) =>
                    is_array($c) && (
                        (isset($c['name']) && trim((string) $c['name']) !== '')
                        || (isset($c['logo_url']) && trim((string) $c['logo_url']) !== '')
                    )
                )) > 0;
        }));
        if (empty($groups)) return '';

        // Column count for the country grid. Auto = 1 col for up to 3 groups,
        // 2 cols beyond so 4-5 country blocks halve their vertical footprint.
        $cols = (int) ($options['academies_columns'] ?? 0);
        if ($cols <= 0) $cols = count($groups) >= 4 ? 2 : 1;
        $cols = max(1, min(2, $cols));

        $out = '<div style="font-size:8pt;letter-spacing:2px;color:'.$p['accent'].';font-weight:800;text-transform:uppercase;margin:0 0 3mm 0;">Objectifs :</div>';

        if ($cols === 1) {
            foreach ($groups as $g) {
                $out .= $this->countryBlockHtml($g, $p);
            }
            return $out;
        }

        // 2-col layout: pair groups into rows via a fixed table.
        $rows = '';
        for ($i = 0; $i < count($groups); $i += 2) {
            $left  = $this->countryBlockHtml($groups[$i], $p);
            $right = isset($groups[$i + 1]) ? $this->countryBlockHtml($groups[$i + 1], $p) : '';
            $rows .= '<tr>'
                .'<td style="width:50%;vertical-align:top;padding-right:3mm;">'.$left.'</td>'
                .'<td style="width:50%;vertical-align:top;padding-left:3mm;">'.$right.'</td>'
                .'</tr>';
        }
        $out .= '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">'.$rows.'</table>';
        return $out;
    }

    /** One country block (flag+name header, logos row, names row). */
    private function countryBlockHtml(array $g, array $p): string
    {
        $country = trim((string) ($g['country'] ?? ''));
        $cc      = trim((string) ($g['country_code'] ?? ''));
        $flagHtml = $cc !== ''
            ? '<img src="https://flagcdn.com/w40/'.$this->esc(strtolower($cc)).'.png" width="12" height="9" style="vertical-align:middle;margin-right:2mm;">'
            : '';

        $header = '<div style="margin:1.5mm 0 1mm 0;">'
            .$this->iconCheck($p['accent'], 3.5)
            .' <span style="font-size:8pt;font-weight:700;color:'.$p['text'].';letter-spacing:0.5px;vertical-align:middle;">'.$flagHtml.$this->esc($country).'</span>'
            .'</div>';

        $cells = '';
        foreach (array_slice($g['clubs'], 0, 5) as $c) {
            $cname = trim((string) ($c['name'] ?? ''));
            $clogo = trim((string) ($c['logo_url'] ?? ''));
            if ($cname === '' && $clogo === '') continue;
            $img = $clogo !== ''
                ? '<img src="'.$this->esc($this->absolutePath($clogo)).'" alt="" style="height:9mm;max-width:15mm;object-fit:contain;">'
                : '<div style="height:9mm;line-height:9mm;font-size:6.5pt;font-weight:700;color:'.$p['text'].';">'.$this->esc(strtoupper(mb_substr($cname, 0, 3))).'</div>';
            $cells .= '<td style="text-align:center;padding:0 1.5mm;vertical-align:middle;">'.$img.'</td>';
        }

        $names = '';
        $rawNames = array_map(static fn ($c) => trim((string) ($c['name'] ?? '')), array_slice($g['clubs'], 0, 5));
        $rawNames = array_values(array_filter($rawNames, static fn ($n) => $n !== ''));
        if (! empty($rawNames)) {
            $names = '<div style="font-size:6pt;color:'.$p['secondary'].';margin-top:0.5mm;margin-bottom:1mm;letter-spacing:0.3px;padding-left:6mm;">'.$this->esc(implode(' - ', $rawNames)).'</div>';
        }

        return $header
            .'<table style="border-collapse:collapse;margin-left:6mm;"><tr>'.$cells.'</tr></table>'
            .$names;
    }

    /** Partner cards (Supervisé par + En collab avec) — right-column stack. */
    private function supervisedCard(array $options, array $p): string
    {
        $sb = $options['supervised_by'] ?? null;
        if (! is_array($sb)) return '';
        $name = trim((string) ($sb['name'] ?? ''));
        $logo = trim((string) ($sb['logo_url'] ?? ''));
        $country = trim((string) ($sb['country'] ?? ''));
        $cc = trim((string) ($sb['country_code'] ?? ''));
        if ($name === '' && $logo === '' && $country === '') return '';

        $flag = $cc !== ''
            ? '<img src="https://flagcdn.com/w40/'.$this->esc(strtolower($cc)).'.png" width="18" height="13" style="vertical-align:middle;margin-left:3mm;">'
            : '';

        return '<div style="margin-bottom:5mm;">'
            .'<div style="font-size:7.5pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:2mm;text-transform:uppercase;">Supervisé par</div>'
            .'<div style="padding:3mm 0;">'
                .($logo !== '' ? '<img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:12mm;max-width:38mm;object-fit:contain;">'.$flag : '')
                .($name !== '' ? '<div style="font-size:10pt;font-weight:800;color:'.$p['text'].';margin-top:2mm;letter-spacing:1px;">'.$this->esc(mb_strtoupper($name)).'</div>' : '')
            .'</div>'
            .'</div>';
    }

    private function partnerAgencyCard(array $options, array $p): string
    {
        $pa = $options['partner_agency'] ?? null;
        if (! is_array($pa)) return '';
        $name = trim((string) ($pa['name'] ?? ''));
        $logo = trim((string) ($pa['logo_url'] ?? ''));
        $desc = trim((string) ($pa['description'] ?? $pa['note'] ?? ''));
        if ($name === '' && $logo === '' && $desc === '') return '';

        return '<div>'
            .'<div style="font-size:7.5pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:800;margin-bottom:2mm;text-transform:uppercase;">En collaboration avec</div>'
            .($logo !== '' ? '<div style="padding:2mm 0;"><img src="'.$this->esc($this->absolutePath($logo)).'" alt="" style="height:14mm;max-width:44mm;object-fit:contain;"></div>' : '')
            .($name !== '' && $logo === '' ? '<div style="font-size:10pt;font-weight:800;color:'.$p['text'].';">'.$this->esc(mb_strtoupper($name)).'</div>' : '')
            .($desc !== '' ? '<div style="font-size:7.5pt;color:'.$p['secondary'].';margin-top:2mm;line-height:1.4;">'.$this->esc($desc).'</div>' : '')
            .'</div>';
    }

    private function barsHtml(array $options, array $p, string $title = 'Player Profile'): string
    {
        $bars = is_array($options['player_profile_bars'] ?? null) ? $options['player_profile_bars'] : [];
        $bars = array_values(array_filter($bars, static fn ($b) => is_array($b) && ! empty($b['label'])));
        if (empty($bars)) return '';

        $rows = '';
        foreach (array_slice($bars, 0, 8) as $b) {
            $pct = max(0, min(100, (int) ($b['pct'] ?? 0)));
            $rows .= '<tr>'
                .'<td style="width:35%;font-size:8pt;color:'.$p['text'].';font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:1.2mm 3mm 1.2mm 0;">'.$this->esc($b['label']).'</td>'
                .'<td style="padding:1.2mm 0;">'
                    .'<div style="height:2.5mm;width:100%;background:'.$p['card_border'].';border-radius:1.5mm;overflow:hidden;">'
                    .'<div style="height:2.5mm;width:'.$pct.'%;background:'.$p['accent'].';"></div>'
                    .'</div>'
                    .'</td>'
                .'<td style="width:14mm;text-align:right;font-size:8pt;color:'.$p['accent'].';font-weight:800;padding-left:3mm;">'.$pct.'%</td>'
                .'</tr>';
        }
        return '<div style="font-size:10pt;letter-spacing:3px;color:'.$p['accent'].';font-weight:900;margin-bottom:3mm;text-transform:uppercase;border-left:3px solid '.$p['accent'].';padding-left:3mm;">'.$this->esc($title).'</div>'
            .'<table style="width:100%;border-collapse:collapse;">'.$rows.'</table>';
    }

    private function footerBar(array $options, array $p, string $motto, string $slogan = ''): string
    {
        // Contact defaults (can be overridden via options.contact.*)
        $contact = is_array($options['contact'] ?? null) ? $options['contact'] : [];
        $handle  = trim((string) ($contact['instagram'] ?? '@renefootball'));
        $email   = trim((string) ($contact['email']     ?? 'renefootball.agency@gmail.com'));
        $phone   = trim((string) ($contact['phone']     ?? '+352 621 640 640'));

        // Slogan sits just above the contact row on a dark strip that hugs the
        // yellow bar — keeps the cursive touch without adding a separate band.
        $sloganStrip = $slogan !== ''
            ? '<div style="background:'.$p['bg'].';padding:1mm 8mm 1mm 8mm;text-align:right;font-family:\'Times\',\'DejaVu Serif\',serif;font-style:italic;font-size:10pt;color:'.$p['accent'].';">'.$this->esc($slogan).'</div>'
            : '';

        $mottoBar = $motto !== ''
            ? '<div style="text-align:center;font-size:7pt;letter-spacing:4px;color:'.$p['footer_ink'].';font-weight:800;padding-bottom:2mm;">'.$this->esc(mb_strtoupper($motto)).'</div>'
            : '';

        return $sloganStrip
            .'<div style="background:'.$p['footer'].';padding:2mm 8mm 2mm 8mm;color:'.$p['footer_ink'].';">'
            .$mottoBar
            .'<table style="width:100%;border-collapse:collapse;">'
            .'<tr>'
            .'<td style="width:33%;font-size:9pt;font-weight:800;vertical-align:middle;">'
                .$this->iconInsta($p['footer_ink']).' <span style="vertical-align:middle;margin-left:2mm;">'.$this->esc($handle).'</span>'
                .'</td>'
            .'<td style="width:37%;text-align:center;font-size:8.5pt;font-weight:700;vertical-align:middle;">'
                .$this->iconMail($p['footer_ink']).' <span style="vertical-align:middle;margin-left:2mm;">'.$this->esc($email).'</span>'
                .'</td>'
            .'<td style="width:30%;text-align:right;font-size:9pt;font-weight:800;vertical-align:middle;">'
                .$this->iconPhone($p['footer_ink']).' <span style="vertical-align:middle;margin-left:2mm;">'.$this->esc($phone).'</span>'
                .'</td>'
            .'</tr></table>'
            .'</div>';
    }

    /**
     * Load the real Rene Football logo from public/branding/ and return it
     * as a base64 data URI. Cached statically so a batch render of several
     * fiches doesn't re-read the PNG for every call. Returns '' if the
     * file is missing so the caller can fall back to the text wordmark.
     */
    private function logoDataUri(string $variant = 'white'): string
    {
        static $cache = [];
        if (isset($cache[$variant])) return $cache[$variant];

        $file = public_path('branding/logo-'.$variant.'.png');
        if (! is_file($file) || ! is_readable($file)) {
            return $cache[$variant] = '';
        }
        $bytes = @file_get_contents($file);
        if ($bytes === false) return $cache[$variant] = '';

        return $cache[$variant] = 'data:image/png;base64,'.base64_encode($bytes);
    }

    // ==================== SVG icons (data-URI <img>) ====================
    // DomPDF renders inline <svg> unreliably (silently drops most stroked
    // paths in v2+). We ship each icon as an <img src="data:image/svg+xml">
    // instead: that path goes through DomPDF's image renderer, which honours
    // stroke / fill / stroke-width faithfully.

    private function svgImg(string $svg, string $sizeMm = '8mm', string $extraStyle = ''): string
    {
        // DomPDF's SVG rasteriser needs both explicit root width/height AND a
        // render size >= ~6mm to preserve interior detail (below that the
        // shapes collapse to a few noisy pixels). We inject default 24x24 on
        // the SVG root and let callers pass a print size of at least 5mm.
        if (! preg_match('/<svg[^>]*\swidth=/i', $svg)) {
            $svg = preg_replace('/<svg\b/i', '<svg width="24" height="24"', $svg, 1);
        }
        $encoded = base64_encode($svg);
        return '<img src="data:image/svg+xml;base64,'.$encoded.'" width="'.$sizeMm.'" height="'.$sizeMm.'" style="'.$extraStyle.'">';
    }

    private function iconCalendar(string $c): string
    {
        // stroke and fill are put on every shape (php-svg-lib doesn't inherit
        // presentation attributes from <svg> root).
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<rect x="3" y="6" width="18" height="15" '.$s.'/>'
            .'<line x1="3" y1="11" x2="21" y2="11" '.$s.'/>'
            .'<line x1="8" y1="3" x2="8" y2="8" '.$s.'/>'
            .'<line x1="16" y1="3" x2="16" y2="8" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconGlobe(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<circle cx="12" cy="12" r="9" '.$s.'/>'
            .'<ellipse cx="12" cy="12" rx="4" ry="9" '.$s.'/>'
            .'<line x1="3" y1="12" x2="21" y2="12" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconPitch(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<rect x="3" y="5" width="18" height="14" '.$s.'/>'
            .'<line x1="12" y1="5" x2="12" y2="19" '.$s.'/>'
            .'<circle cx="12" cy="12" r="2.5" '.$s.'/>'
            .'<rect x="3" y="9" width="3" height="6" '.$s.'/>'
            .'<rect x="18" y="9" width="3" height="6" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconShield(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<path d="M12 3 L4 6 V12 C4 16 7.5 19.5 12 21 C16.5 19.5 20 16 20 12 V6 Z" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconFoot(string $c): string
    {
        $s = 'fill="'.$c.'" stroke="none"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<path d="M8 21 C6.6 21 5.5 19.9 5.5 18.5 C5.5 17 6.2 15.5 6.9 14.2 C7.5 13 8 12 8 11 V7.5 C8 6.1 9.1 5 10.5 5 C11.9 5 13 6.1 13 7.5 V11 C14 11 15 11.4 15.6 12.1 C16.3 12.8 16.7 13.7 16.7 14.7 V17 C16.7 19.2 15 21 12.7 21 Z" '.$s.'/>'
            .'<circle cx="15" cy="7" r="1.2" '.$s.'/>'
            .'<circle cx="17.5" cy="8.5" r="1" '.$s.'/>'
            .'<circle cx="19" cy="10.5" r="0.9" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconLangs(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<path d="M4 5 L13 5 L13 14 L9 14 L6 17 L6 14 L4 14 Z" '.$s.'/>'
            .'<path d="M11 12 L20 12 L20 19 L16 19 L13 22 L13 19 L11 19 Z" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconBriefcase(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<rect x="3" y="7" width="18" height="13" '.$s.'/>'
            .'<path d="M9 7 L9 5 L15 5 L15 7" '.$s.'/>'
            .'<line x1="3" y1="13" x2="21" y2="13" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg);
    }

    private function iconCheck(string $c, float $sizeMm = 5): string
    {
        $sStroke = 'fill="none" stroke="'.$c.'" stroke-width="2.2"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<circle cx="12" cy="12" r="10" '.$sStroke.'/>'
            .'<path d="M7 12 L11 16 L17 9" '.$sStroke.'/>'
            .'</svg>';
        return $this->svgImg($svg, $sizeMm.'mm', 'vertical-align:middle;');
    }

    private function iconInsta(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<rect x="3" y="3" width="18" height="18" '.$s.'/>'
            .'<circle cx="12" cy="12" r="4.5" '.$s.'/>'
            .'<circle cx="17.5" cy="6.5" r="1" fill="'.$c.'"/>'
            .'</svg>';
        return $this->svgImg($svg, '5mm', 'vertical-align:middle;');
    }

    private function iconMail(string $c): string
    {
        $s = 'fill="none" stroke="'.$c.'" stroke-width="1.8"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<rect x="3" y="5" width="18" height="14" '.$s.'/>'
            .'<path d="M3 7 L12 13 L21 7" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg, '5mm', 'vertical-align:middle;');
    }

    private function iconPhone(string $c): string
    {
        $s = 'fill="'.$c.'" stroke="none"';
        $svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
            .'<path d="M6 3 L9.5 3 L11 7.5 L8.5 9 C9.5 11.5 12.5 14.5 15 15.5 L16.5 13 L21 14.5 L21 18 C21 19.7 19.7 21 18 21 C10 21 3 14 3 6 C3 4.3 4.3 3 6 3 Z" '.$s.'/>'
            .'</svg>';
        return $this->svgImg($svg, '5mm', 'vertical-align:middle;');
    }
}
