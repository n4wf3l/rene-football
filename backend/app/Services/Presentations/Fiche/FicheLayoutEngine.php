<?php

namespace App\Services\Presentations\Fiche;

use App\Models\Player;
use App\Services\Presentations\Fiche\Compositions\ClassicComposition;

/**
 * Adaptive one-page layout engine.
 *
 *  A. plan     — normalise the data, pick the composition, start at the most
 *                generous density;
 *  B. measure  — render with DomPDF and read the real geometry of every
 *                annotated block (FicheRenderer);
 *  C. adapt    — on any violation, walk down the density ladder (spacing →
 *                type → editorial synthesis of secondary lists). When a pass
 *                fits with room to spare, re-render once giving that room
 *                back to the composition (bigger photo, airier rhythm) so the
 *                page is full and balanced;
 *  D. refuse   — if even the last rung fails, throw: no broken PDF is ever
 *                returned;
 *  E. verify   — check the final bytes with an independent PDF parser:
 *                exactly one page, A4 portrait.
 */
class FicheLayoutEngine
{
    /** Room left under the content (mm) above which a fill pass is worth it. */
    private const FILL_THRESHOLD_MM = 3.0;

    public function __construct(
        private readonly FicheDataFactory $factory,
        private readonly FicheAssets $assets,
        private readonly FicheRenderer $renderer,
        private readonly PdfInspector $inspector,
    ) {
    }

    public function render(Player $player, array $options, array $overrides = []): FicheResult
    {
        $start = microtime(true);
        $key   = FicheCompositions::keyFor($options);
        $composition = FicheCompositions::make($key);

        if ($composition instanceof ClassicComposition) {
            return $this->renderClassic($composition, $player, $options, $start);
        }

        $data     = $this->factory->build($player, $options, $overrides);
        $i18n     = FicheI18n::for($data->lang);
        $attempts = [];
        $reasons  = [];

        foreach (FicheDensity::ladder() as $density) {
            $ctx  = new RenderContext($data, $density, $i18n, $this->assets);
            $html = $composition->render($ctx);
            $m    = $this->renderer->render($html, draft: true);
            $attempts[] = self::attempt($density->label(), $m);

            // A fixed-size region was planned too small: re-compose once at the
            // same density with the real measured geometry, then judge.
            // Skipped when a column overflows by more than rebalancing can recover.
            $sizing = in_array(true, array_map(static fn ($k) => str_starts_with($k, 'fit:'), $m->issueKeys), true);
            if (! $m->fits() && self::onlyFitIssues($m) && ($sizing || $m->freeMm > -25)) {
                $ctx  = $ctx->withMeasured($m->blocks);
                $html = $composition->render($ctx);
                $m    = $this->renderer->render($html, draft: true);
                $attempts[] = self::attempt($density->label().'+mesuré', $m);
            }

            if (! $m->fits()) {
                $reasons = $m->violations;
                continue;
            }

            [$ctx, $html] = $this->fill($composition, $ctx, $html, $m, $attempts);

            // Final pass with the real images, measured and checked again.
            $final = $this->renderer->render($html);
            $attempts[] = self::attempt($ctx->density->label().'+final', $final);
            if (! $final->fits()) {
                $reasons = $final->violations;
                continue;
            }

            $info = $this->inspector->inspect($final->pdf());
            if (! $this->inspector->isOnePageA4($info)) {
                $reasons = [sprintf('Vérification PDF : %d page(s), %.1f × %.1f pt.', $info['pages'], $info['width'], $info['height'])];
                $attempts[array_key_last($attempts)]['ok'] = false;
                continue;
            }

            return new FicheResult(
                $final->pdf(), $html, $data->composition, $density->label(), $ctx->notes, $attempts, $info,
                $final->freeMm, round((microtime(true) - $start) * 1000, 1),
            );
        }

        throw new FicheLayoutException(
            'Impossible de faire tenir cette fiche sur une page A4 sans couper de contenu. '
            .'Raccourcissez la bio ou l’intro du projet, ou retirez des éléments secondaires (académies, barres, galerie).',
            $reasons,
        );
    }

    /**
     * Give the measured spare room back to the composition, then re-measure.
     * Keeps the first (valid) layout if the filled one does not fit.
     *
     * @return array{0:RenderContext,1:string}
     */
    private function fill($composition, RenderContext $ctx, string $html, FicheMeasurement $m, array &$attempts): array
    {
        if ($m->freeMm < self::FILL_THRESHOLD_MM) return [$ctx, $html];

        // Small safety margin so rounding in the second pass cannot overflow.
        $filledCtx  = $ctx->withElastic($m->freeMm - 1.0, $m->spare);
        $filledHtml = $composition->render($filledCtx);
        $filled     = $this->renderer->render($filledHtml, draft: true);
        $attempts[] = self::attempt($ctx->density->label().'+remplissage', $filled);

        return $filled->fits() ? [$filledCtx, $filledHtml] : [$ctx, $html];
    }

    /** Issues a second, measured composition pass can fix (sizes and column balance). */
    private static function onlyFitIssues(FicheMeasurement $m): bool
    {
        if ($m->pageCount !== 1 && ! $m->issueKeys) return false;
        foreach ($m->issueKeys as $k) {
            if (! str_starts_with($k, 'fit:') && $k !== 'pages' && ! str_starts_with($k, 'limit:')) return false;
        }
        return $m->issueKeys !== [];
    }

    private static function attempt(string $label, FicheMeasurement $m): array
    {
        return ['density' => $label, 'ok' => $m->fits(), 'free_mm' => $m->freeMm, 'ms' => $m->ms, 'violations' => $m->violations];
    }

    /** Historic Marketing v1 layout: not adaptive, but verified like every fiche. */
    private function renderClassic(ClassicComposition $composition, Player $player, array $options, float $start): FicheResult
    {
        $html = $composition->renderLegacy($player, $options);
        $m    = $this->renderer->render($html, allowRemote: true);
        $info = $this->inspector->inspect($m->pdf());
        $attempts = [self::attempt('legacy', $m)];

        if (! $this->inspector->isOnePageA4($info)) {
            throw new FicheLayoutException(
                'Avec la composition historique « Marketing v1 », cette fiche déborde sur une deuxième page. '
                .'Choisissez une composition premium (Signature, Scouting ou Parcours), qui s’adapte automatiquement à une page.',
                [sprintf('%d page(s) générée(s).', $info['pages'])],
            );
        }

        return new FicheResult($m->pdf(), $html, FicheCompositions::CLASSIC, 'legacy', [], $attempts, $info, 0.0, round((microtime(true) - $start) * 1000, 1));
    }
}
