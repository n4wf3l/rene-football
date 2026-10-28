<?php

use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\PresentationPdfService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Content migration: publishes Saeed Adams (KV Mechelen, 2009) in production
 * and attaches the agency's ready-made card as his official presentation
 * (external fiche, published, wrapped on one verified A4 page).
 *
 * Idempotent:
 *  - player missing → created with his detoured photo; present without
 *    photo → photo attached; otherwise untouched;
 *  - the official fiche is only created once (marked by its source file name).
 * Skipped under tests so fixtures and counts stay deterministic.
 */
return new class extends Migration
{
    private const SLUG  = 'saeed-adams';
    private const PHOTO = 'saeed-adams.png';
    private const CARD  = 'saeed-adams-fiche-officielle.jpg';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $this->ensurePlayer();
        $this->ensureOfficialFiche();
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if (! $player) return;

        $fiche = DB::table('player_presentations')
            ->where('player_id', $player->id)
            ->where('external_asset_original_name', self::CARD)
            ->first();
        if ($fiche) {
            foreach ([$fiche->file_path, $fiche->external_asset_path] as $url) {
                if ($url && str_starts_with($url, '/storage/')) Storage::disk('public')->delete(substr($url, strlen('/storage/')));
            }
            DB::table('player_presentations')->where('id', $fiche->id)->delete();
        }

        if (str_starts_with((string) $player->photo_url, '/storage/players/'.self::SLUG.'-mig-')) {
            Storage::disk('public')->delete(substr($player->photo_url, strlen('/storage/')));
            DB::table('players')->where('id', $player->id)->delete();
        }
    }

    private function ensurePlayer(): void
    {
        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if ($player && $player->photo_url) return;

        $photoUrl = $this->copy(database_path('data/players/'.self::PHOTO), 'players/'.self::SLUG);

        if ($player) {
            DB::table('players')->where('id', $player->id)->update(['photo_url' => $photoUrl, 'updated_at' => now()]);
            return;
        }

        DB::table('players')->insert([
            'slug'                  => self::SLUG,
            'name'                  => 'Saeed Adams',
            'date_of_birth'         => '2009-10-17',
            'age'                   => \Carbon\Carbon::parse('2009-10-17')->age,
            'position'              => 'Avant-centre / Ailier (gauche, droit)',
            'best_position'         => 'Avant-centre',
            'category'              => 'Attaquant',
            'club'                  => 'KV Mechelen',
            'nationality'           => 'Ghanéen',
            'secondary_nationality' => 'Néerlandais',
            'languages_spoken'      => json_encode(['Anglais', 'Néerlandais'], JSON_UNESCAPED_UNICODE),
            'preferred_foot'        => 'Droit',
            'bio'                   => 'Attaquant dynamique et puissant, doté d’une excellente vitesse, d’un dribble efficace et d’une bonne finition. Capable d’évoluer en pointe comme sur les deux ailes. Travailleur, discipliné et tourné vers une progression constante.',
            'since'                 => (int) now()->year,
            'photo_url'             => $photoUrl,
            'is_published'          => true,
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
    }

    private function ensureOfficialFiche(): void
    {
        $player = Player::where('slug', self::SLUG)->first();
        if (! $player) return;
        if (Presentation::where('player_id', $player->id)->where('external_asset_original_name', self::CARD)->exists()) return;

        $assetUrl = $this->copy(database_path('data/presentations/'.self::CARD), 'presentations/assets/'.self::SLUG.'-officielle');
        if (! $assetUrl) return;

        $presentation = new Presentation([
            'player_id'                    => $player->id,
            'template_key'                 => 'marketing',
            'title'                        => 'Fiche officielle – Saeed Adams',
            'options'                      => ['composition' => 'scouting', 'theme' => 'black-gold'],
            'external_asset_path'          => $assetUrl,
            'external_asset_type'          => 'image',
            'external_asset_original_name' => self::CARD,
            'is_published'                 => true,
            'public_token'                 => Str::random(40),
        ]);

        // Same path as an admin upload: the image is wrapped on one A4 page
        // and the result is verified (1 page, A4 portrait) before storing.
        $result = app(PresentationPdfService::class)->render($presentation, $player);

        $presentation->save();
        $pdfPath = 'presentations/'.self::SLUG.'-'.$presentation->id.'-mig.pdf';
        Storage::disk('public')->put($pdfPath, $result->pdf);
        $presentation->update([
            'file_path'    => '/storage/'.$pdfPath,
            'generated_at' => now(),
            'render_meta'  => $result->meta(),
        ]);
    }

    /** Copies a bundled file to the public disk; returns its /storage URL. */
    private function copy(string $source, string $targetBase): ?string
    {
        if (! is_file($source)) return null;
        $path = $targetBase.'-mig-'.substr(sha1_file($source), 0, 8).'.'.pathinfo($source, PATHINFO_EXTENSION);
        Storage::disk('public')->put($path, file_get_contents($source));
        return '/storage/'.$path;
    }
};
