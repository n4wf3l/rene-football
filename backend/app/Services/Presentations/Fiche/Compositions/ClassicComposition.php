<?php

namespace App\Services\Presentations\Fiche\Compositions;

use App\Models\Player;
use App\Services\Presentations\Fiche\RenderContext;
use App\Services\Presentations\Templates\MarketingTemplate;

/**
 * Historic "Marketing v1" layout (pre-redesign). Kept so presentations saved
 * before the premium compositions keep rendering exactly as they did; the
 * engine still verifies its output is a single A4 page.
 */
class ClassicComposition extends FicheComposition
{
    public static function label(): string
    {
        return 'Marketing v1 (historique)';
    }

    public static function description(): string
    {
        return 'Ancienne mise en page, conservée pour les fiches existantes. Libellés en français, pas d’adaptation automatique.';
    }

    public static function thumbnailSvg(): string
    {
        return MarketingTemplate::thumbnailSvg();
    }

    public function render(RenderContext $ctx): string
    {
        throw new \LogicException('The classic composition renders from the Player model: use renderLegacy().');
    }

    public function renderLegacy(Player $player, array $options): string
    {
        return (new MarketingTemplate())->render($player, $options, '');
    }
}
