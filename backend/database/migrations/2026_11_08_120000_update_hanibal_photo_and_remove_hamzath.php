<?php

use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\PresentationPdfService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Content migration (2026-11-08):
 *  1. Hanibal Tesfegabir Solomon gets his new official portrait (F91
 *     Dudelange kit). His generated fiches that use the player photo are
 *     re-rendered so they show it too; external / custom-photo fiches are
 *     left alone.
 *  2. Hamzath Mohamadou is removed: he is not represented by Rene Football.
 *     Dependent rows (fiches, clips, appearances, scouting data) go with him
 *     through the existing cascades; the files we stored are deleted.
 *
 * Idempotent and skipped under tests. Not reversible on purpose: a removed
 * player is not resurrected by a rollback.
 */
return new class extends Migration
{
    private const HANIBAL = 'hanibal-tesfegabir-solomon';
    private const HANIBAL_PHOTO = 'hanibal-tesfegabir-solomon.jpg';
    private const HAMZATH = 'hamzath-mohamadou';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $this->updateHanibalPhoto();
        $this->removeHamzath();
    }

    public function down(): void
    {
        // Intentionally irreversible (see class docblock).
    }

    private function updateHanibalPhoto(): void
    {
        $player = Player::where('slug', self::HANIBAL)->first();
        $source = database_path('data/players/'.self::HANIBAL_PHOTO);
        if (! $player || ! is_file($source)) return;

        $path = 'players/'.self::HANIBAL.'-mig-'.substr(sha1_file($source), 0, 8).'.jpg';
        $url  = '/storage/'.$path;
        if ($player->photo_url === $url) return;

        Storage::disk('public')->put($path, file_get_contents($source));
        $previous = $player->photo_url;
        $player->update(['photo_url' => $url]);
        $this->deleteStored($previous);

        // Re-render the generated fiches that show the player photo.
        $presentations = Presentation::where('player_id', $player->id)
            ->get()
            ->filter(fn (Presentation $p) => ! $p->external_asset_path
                && (($p->options['photo_source'] ?? 'player') === 'player'));

        foreach ($presentations as $presentation) {
            try {
                $result = app(PresentationPdfService::class)->render($presentation, $player->fresh());
                $pdfPath = 'presentations/'.self::HANIBAL.'-'.$presentation->id.'-mig-'.substr(sha1($result->pdf), 0, 8).'.pdf';
                Storage::disk('public')->put($pdfPath, $result->pdf);
                $old = $presentation->file_path;
                $presentation->update([
                    'file_path'    => '/storage/'.$pdfPath,
                    'generated_at' => now(),
                    'render_meta'  => $result->meta(),
                ]);
                if ($old !== '/storage/'.$pdfPath) $this->deleteStored($old);
            } catch (\Throwable $e) {
                // A fiche that can't be re-rendered keeps its previous PDF;
                // the admin can regenerate it from the editor.
                Log::warning('Hanibal fiche re-render failed', ['presentation' => $presentation->id, 'error' => $e->getMessage()]);
            }
        }
    }

    private function removeHamzath(): void
    {
        $player = DB::table('players')->where('slug', self::HAMZATH)->first();
        if (! $player) return;

        $files = [$player->photo_url, $player->secondary_photo_url ?? null];
        foreach (DB::table('player_presentations')->where('player_id', $player->id)->get() as $p) {
            $files[] = $p->file_path;
            $files[] = $p->external_asset_path;
        }
        foreach (DB::table('player_clips')->where('player_id', $player->id)->pluck('image_path') as $image) {
            $files[] = $image;
        }

        // Explicit deletes for the rows that hold files, then the player;
        // the remaining dependants follow the foreign-key cascades.
        DB::table('player_presentations')->where('player_id', $player->id)->delete();
        DB::table('player_clips')->where('player_id', $player->id)->delete();
        DB::table('players')->where('id', $player->id)->delete();

        foreach ($files as $url) $this->deleteStored($url);
    }

    /** Deletes a file we stored on the public disk (never an external URL). */
    private function deleteStored(?string $url): void
    {
        if ($url && str_starts_with($url, '/storage/')) {
            Storage::disk('public')->delete(substr($url, strlen('/storage/')));
        }
    }
};
