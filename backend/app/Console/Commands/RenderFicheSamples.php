<?php

namespace App\Console\Commands;

use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\Fiche\FicheLayoutEngine;
use App\Services\Presentations\Fiche\FicheLayoutException;
use Illuminate\Console\Command;

/**
 * Renders sample fiches for visual QA without touching the database: the
 * five reference presentations in every premium composition (or the one
 * given), written to a folder with their layout report.
 *
 *   php artisan presentations:samples storage/app/fiche-samples --composition=signature
 *   php artisan presentations:samples out --photo=zoran-mawel-batomi=/storage/players/x.png
 */
class RenderFicheSamples extends Command
{
    protected $signature = 'presentations:samples
        {dir : Output directory}
        {--composition=* : Compositions to render (default: signature, scouting, career)}
        {--player=* : Limit to these player slugs}
        {--photo=* : slug=/storage/path photo override (in memory only)}
        {--set=* : option=value overrides (JSON values allowed)}';

    protected $description = 'Render sample presentation PDFs (no database writes) for visual QA';

    public function handle(FicheLayoutEngine $engine): int
    {
        $dir = $this->argument('dir');
        if (! is_dir($dir)) mkdir($dir, 0775, true);

        $photos = [];
        foreach ((array) $this->option('photo') as $pair) {
            [$slug, $url] = array_pad(explode('=', $pair, 2), 2, null);
            if ($slug && $url) $photos[$slug] = $url;
        }
        $set = [];
        foreach ((array) $this->option('set') as $pair) {
            [$k, $v] = array_pad(explode('=', $pair, 2), 2, '');
            $decoded = json_decode($v, true);
            $set[$k] = json_last_error() === JSON_ERROR_NONE ? $decoded : $v;
        }

        $compositions = $this->option('composition') ?: ['signature', 'scouting', 'career'];
        $slugs = (array) $this->option('player');
        $rows = Presentation::with('player')->get()->filter(fn ($p) => $p->player && (! $slugs || in_array($p->player->slug, $slugs, true)));

        $failures = 0;
        foreach ($rows as $presentation) {
            $player = $presentation->player;
            if (isset($photos[$player->slug])) $player->photo_url = $photos[$player->slug];
            foreach ($compositions as $composition) {
                $options = array_merge($presentation->options ?? [], ['composition' => $composition], $set);
                $name = $player->slug.'-'.$composition;
                try {
                    $res = $engine->render($player, $options);
                    file_put_contents("$dir/$name.pdf", $res->pdf);
                    file_put_contents("$dir/$name.json", json_encode($res->meta() + ['attempt_log' => $res->attempts], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    $this->line(sprintf('<info>OK</info>  %-40s %-22s %d page, %s mm, %5.0f ms, free %.1f mm%s',
                        $name, $res->density, $res->pdfInfo['pages'], implode('×', $res->meta()['page_size_mm']), $res->ms, $res->freeMm,
                        $res->notes ? ' · synthèse: '.json_encode($res->notes) : ''));
                } catch (FicheLayoutException $e) {
                    $failures++;
                    $this->line("<error>FAIL</error> $name: ".$e->getMessage().' '.json_encode($e->details, JSON_UNESCAPED_UNICODE));
                }
            }
        }
        return $failures ? self::FAILURE : self::SUCCESS;
    }
}
