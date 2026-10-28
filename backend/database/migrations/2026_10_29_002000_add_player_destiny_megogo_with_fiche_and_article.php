<?php

use App\Models\Player;
use App\Models\Presentation;
use App\Services\Presentations\PresentationPdfService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Content migration: publishes Destiny Megogo (Borussia Mönchengladbach,
 * 2009) in production with
 *  - his detoured photo,
 *  - the agency card as his official presentation (external fiche, one
 *    verified A4 page, public link),
 *  - the news article on his signing at Borussia Mönchengladbach, dated
 *    27/02/2026 like the club's announcement.
 *
 * Idempotent (each piece is created once) and skipped under tests.
 */
return new class extends Migration
{
    private const SLUG         = 'destiny-megogo';
    private const PHOTO        = 'destiny-megogo.png';
    private const CARD         = 'destiny-megogo-fiche-officielle.jpg';
    private const ARTICLE_SLUG = 'destiny-megogo-s-engage-avec-le-borussia-monchengladbach';
    private const COVER        = 'signature-destiny-megogo-gladbach.jpg';

    public function up(): void
    {
        if (app()->environment('testing')) return;

        $this->ensurePlayer();
        $this->ensureOfficialFiche();
        $this->ensureArticle();
    }

    public function down(): void
    {
        if (app()->environment('testing')) return;

        $article = DB::table('articles')->where('slug', self::ARTICLE_SLUG)->first();
        if ($article) {
            $this->deleteIfMigrated($article->cover_url);
            DB::table('articles')->where('id', $article->id)->delete();
        }

        $player = DB::table('players')->where('slug', self::SLUG)->first();
        if (! $player) return;

        $fiche = DB::table('player_presentations')
            ->where('player_id', $player->id)
            ->where('external_asset_original_name', self::CARD)
            ->first();
        if ($fiche) {
            $this->deleteIfMigrated($fiche->file_path);
            $this->deleteIfMigrated($fiche->external_asset_path);
            DB::table('player_presentations')->where('id', $fiche->id)->delete();
        }

        if (str_contains((string) $player->photo_url, '/'.self::SLUG.'-mig-')) {
            $this->deleteIfMigrated($player->photo_url);
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
            'slug'             => self::SLUG,
            'name'             => 'Destiny Megogo',
            'date_of_birth'    => '2009-07-06',
            'age'              => \Carbon\Carbon::parse('2009-07-06')->age,
            'position'         => 'Défenseur central',
            'best_position'    => 'Défenseur central',
            'category'         => 'Defenseur',
            'club'             => 'Borussia Mönchengladbach',
            'nationality'      => 'Espagnol',
            'languages_spoken' => json_encode(['Anglais', 'Français', 'Espagnol'], JSON_UNESCAPED_UNICODE),
            'preferred_foot'   => 'Droit',
            'previous_club'    => 'KRC Genk',
            'bio'              => 'Défenseur central complet, doté d’une excellente lecture du jeu, d’un fort engagement et d’une grande maturité sur le terrain. Solide dans les duels, bon relanceur et toujours concentré, Destiny incarne la nouvelle génération de défenseurs modernes.',
            'strengths'        => json_encode([
                ['key' => 'power',      'label' => 'Puissance et impact physique'],
                ['key' => 'vision',     'label' => 'Lecture du jeu'],
                ['key' => 'duels',      'label' => 'Qualité dans les duels'],
                ['key' => 'passing',    'label' => 'Relance propre'],
                ['key' => 'mental',     'label' => 'Mentalité professionnelle'],
                ['key' => 'leadership', 'label' => 'Leadership et communication'],
            ], JSON_UNESCAPED_UNICODE),
            'since'            => (int) now()->year,
            'photo_url'        => $photoUrl,
            'is_published'     => true,
            'created_at'       => now(),
            'updated_at'       => now(),
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
            'title'                        => 'Fiche officielle – Destiny Megogo',
            'options'                      => ['composition' => 'signature', 'theme' => 'black-gold', 'photo_side' => 'left'],
            'external_asset_path'          => $assetUrl,
            'external_asset_type'          => 'image',
            'external_asset_original_name' => self::CARD,
            'is_published'                 => true,
            'public_token'                 => Str::random(40),
        ]);

        // Same path as an admin upload: wrapped on one A4 page and verified.
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

    private function ensureArticle(): void
    {
        if (DB::table('articles')->where('slug', self::ARTICLE_SLUG)->exists()) return;
        $playerId = DB::table('players')->where('slug', self::SLUG)->value('id');

        $content = implode("\n\n", [
            "Destiny Megogo s’engage avec le Borussia Mönchengladbach. Le défenseur central de 16 ans, qui évoluait jusqu’ici au KRC Genk, rejoint le centre de formation des Poulains et intègre immédiatement l’équipe des moins de 19 ans.",
            "Le club a officialisé sa venue le 27 février 2026 : les U19 du Borussia renforcent leur effectif pendant la trêve hivernale en vue de la fin de saison de la DFB Youth League.",
            "« Destini est un défenseur central talentueux et combatif en qui nous voyons un grand potentiel », a déclaré Mirko Sandmöller, directeur du centre de formation du Borussia, dans l’annonce du club.",
            "Pour Rene Football, cette signature récompense un parcours construit pas à pas. Accompagné par l’agence en collaboration avec WNRS Sport, Destiny poursuit désormais sa progression en Allemagne.",
        ]);

        DB::table('articles')->insert([
            'slug'         => self::ARTICLE_SLUG,
            'title'        => 'Destiny Megogo s’engage avec le Borussia Mönchengladbach',
            'excerpt'      => 'Le défenseur central de 16 ans quitte le KRC Genk et rejoint les U19 du Borussia Mönchengladbach, qui a officialisé sa signature le 27 février 2026.',
            'content'      => $content,
            'category'     => 'Mercato',
            'cover_url'    => $this->copy(database_path('data/articles/'.self::COVER), 'articles/'.self::ARTICLE_SLUG),
            'featured'     => false,
            'player_id'    => $playerId,
            'is_published' => true,
            'published_at' => '2026-02-27 12:00:00',
            'created_at'   => now(),
            'updated_at'   => now(),
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

    private function deleteIfMigrated(?string $url): void
    {
        if ($url && str_starts_with($url, '/storage/') && str_contains($url, '-mig')) {
            Storage::disk('public')->delete(substr($url, strlen('/storage/')));
        }
    }
};
