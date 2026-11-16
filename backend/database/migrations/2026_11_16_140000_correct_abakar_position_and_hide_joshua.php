<?php

use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\PresentationPdfService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration, corrections from René (16/11/2026):
 *
 *  - Abakar Mahamat-Abba is a defensive midfielder / right-back, not an
 *    attacker (2026_11_15_230000 had set "Attaquant"). Each field changes
 *    only if it still holds the value set by that migration, so an edit
 *    made in the admin is never overwritten. "Le jeune attaquant" becomes
 *    "le jeune milieu défensif" in his article, and his generated fiches
 *    are re-rendered with the new position.
 *  - Joshua Lucky Uwakhonye is not with the agency (for now): his profile
 *    is unpublished, not deleted, so it can come back from the admin.
 *
 * Skipped under tests.
 */
return new class extends Migration
{
    private const ABAKAR = 'abakar-abba';
    private const JOSHUA = 'joshua-lucky-uwakhonye';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $this->correctAbakar();
        DB::table('players')->where('slug', self::JOSHUA)->where('is_published', true)
            ->update(['is_published' => false, 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Content correction: nothing to undo automatically.
    }

    private function correctAbakar(): void
    {
        $player = Player::where('slug', self::ABAKAR)->first();
        if (! $player) return;

        $changes = [];
        if ($player->position === 'Attaquant') {
            $changes['position'] = 'Milieu défensif / Latéral droit';
        }
        if (empty($player->best_position)) {
            $changes['best_position'] = 'Milieu défensif';
        }
        if ($player->category === 'Attaquant') {
            $changes['category'] = 'Milieu';
        }

        foreach (DB::table('articles')->where('player_id', $player->id)->get(['id', 'excerpt', 'content']) as $article) {
            $fixed = [
                'excerpt' => str_replace('le jeune attaquant', 'le jeune milieu défensif', (string) $article->excerpt),
                'content' => str_replace('le jeune attaquant', 'le jeune milieu défensif', (string) $article->content),
            ];
            if ($fixed['excerpt'] !== (string) $article->excerpt || $fixed['content'] !== (string) $article->content) {
                DB::table('articles')->where('id', $article->id)->update($fixed + ['updated_at' => now()]);
            }
        }

        if (! $changes) return;
        $player->update($changes);
        $this->rerenderFiches($player->fresh());
    }

    /** Generated fiches print the position: render them again. Uploaded PDFs are left alone. */
    private function rerenderFiches(Player $player): void
    {
        $presentations = Presentation::where('player_id', $player->id)->get()
            ->filter(fn (Presentation $p) => ! $p->external_asset_path);

        foreach ($presentations as $presentation) {
            try {
                $result = app(PresentationPdfService::class)->render($presentation, $player);
                $pdfPath = 'presentations/'.self::ABAKAR.'-'.$presentation->id.'-mig-'.substr(sha1($result->pdf), 0, 8).'.pdf';
                Storage::disk('public')->put($pdfPath, $result->pdf);
                $old = $presentation->file_path;
                $presentation->update([
                    'file_path'    => '/storage/'.$pdfPath,
                    'generated_at' => now(),
                    'render_meta'  => $result->meta(),
                ]);
                if ($old && $old !== '/storage/'.$pdfPath && str_starts_with($old, '/storage/')) {
                    Storage::disk('public')->delete(substr($old, strlen('/storage/')));
                }
            } catch (\Throwable $e) {
                // Keeps its previous PDF; the admin can regenerate it from the editor.
                Log::warning('Abakar fiche re-render failed', ['presentation' => $presentation->id, 'error' => $e->getMessage()]);
            }
        }
    }
};
