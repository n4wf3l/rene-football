<?php

namespace Tests\Feature;

use App\Models\Player;
use App\Models\Presentation;
use App\Models\User;
use App\Services\Presentations\Fiche\FicheLayoutEngine;
use App\Services\Presentations\Fiche\FicheLayoutException;
use App\Services\Presentations\Fiche\FichePage;
use App\Services\Presentations\PresentationPdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Smalot\PdfParser\Parser;
use Tests\TestCase;

/**
 * One-page A4 guarantee of the premium fiche engine, checked on the real PDF
 * bytes with an independent parser (smalot/pdfparser), across the reference
 * shapes of data and the extreme cases (long name, max bio, 8 countries ×
 * 20 clubs, every list full, all languages and palettes, framing extremes).
 *
 * Set FICHE_TEST_DUMP=/some/dir to keep every generated PDF for visual QA.
 */
class PresentationFicheTest extends TestCase
{
    use RefreshDatabase;

    private const COMPOSITIONS = ['signature', 'scouting', 'career'];

    private string $fixtures;

    protected function setUp(): void
    {
        parent::setUp();
        // Fixture images live on the real public disk path, which is what the
        // engine reads (it never fetches over HTTP for /storage URLs).
        $this->fixtures = storage_path('app/public/fiche-tests');
        File::ensureDirectoryExists($this->fixtures);
        $this->makeCutout($this->fixtures.'/cutout.png', 600, 800);
        $this->makePhoto($this->fixtures.'/photo.jpg', 1600, 1000);
        $this->makePhoto($this->fixtures.'/tall.jpg', 700, 1400);
        $this->makeLogo($this->fixtures.'/logo.png');
        $this->makeLogo($this->fixtures.'/wide-logo.png', 480, 120);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->fixtures);
        parent::tearDown();
    }

    // ------------------------------------------------------------------ engine

    public static function scenarios(): array
    {
        $cases = [];
        foreach (self::COMPOSITIONS as $c) {
            $cases["$c minimal"]         = [$c, 'minimal', []];
            $cases["$c reference"]       = [$c, 'reference', []];
            $cases["$c extreme fr"]      = [$c, 'extreme', []];
            $cases["$c extreme en"]      = [$c, 'extreme', ['language' => 'en']];
            $cases["$c extreme de"]      = [$c, 'extreme', ['language' => 'de', 'font_scale' => 'large']];
            $cases["$c extreme nl"]      = [$c, 'extreme', ['language' => 'nl', 'font_family' => 'grotesque', 'photo_side' => 'left']];
            $cases["$c framed photo"]    = [$c, 'framed', ['photo_zoom' => 250, 'photo_position_x' => 0, 'photo_position_y' => 100]];
            $cases["$c contain photo"]   = [$c, 'framed', ['photo_fit' => 'contain', 'font_family' => 'editorial', 'theme' => 'violet']];
            $cases["$c light custom"]    = [$c, 'reference', ['theme' => 'custom', 'background_color' => '#f5f5f4', 'text_color' => '#111111', 'accent_color' => '#b91c1c', 'secondary_color' => '#57534e']];
        }
        return $cases;
    }

    #[DataProvider('scenarios')]
    public function test_every_fiche_is_exactly_one_a4_portrait_page(string $composition, string $dataset, array $extra): void
    {
        [$player, $options] = $this->dataset($dataset);
        $options = array_merge($options, ['composition' => $composition], $extra);

        try {
            $result = app(FicheLayoutEngine::class)->render($player, $options);
        } catch (FicheLayoutException $e) {
            $this->fail($e->getMessage().' '.json_encode($e->details, JSON_UNESCAPED_UNICODE));
        }
        $this->dump("$composition-$dataset-".substr(md5(json_encode($extra)), 0, 6), $result->pdf);

        // Independent check on the bytes, not on the engine's own report.
        $pdf = (new Parser())->parseContent($result->pdf);
        $pages = $pdf->getPages();
        $this->assertCount(1, $pages, 'exactly one page');
        $box = $this->mediaBox($pages[0]);
        $this->assertEqualsWithDelta(FichePage::WIDTH_PT, $box[0], 1.0, 'A4 width');
        $this->assertEqualsWithDelta(FichePage::HEIGHT_PT, $box[1], 1.0, 'A4 height (portrait)');

        // The engine's own geometry check passed too, and reported honestly.
        $this->assertSame(1, $result->pdfInfo['pages']);
        $this->assertNotEmpty($result->attempts);
        $this->assertTrue(collect($result->attempts)->last()['ok']);
    }

    public function test_extreme_data_is_synthesised_explicitly_not_silently(): void
    {
        [$player, $options] = $this->dataset('extreme');
        $result = app(FicheLayoutEngine::class)->render($player, $options + ['composition' => 'career']);

        // 8 countries × 20 clubs cannot be listed legibly on one page: the
        // report must say so (and the full list stays in the options).
        $this->assertArrayHasKey('academy_clubs', $result->notes);
        $this->assertLessThan(160, $result->notes['academy_clubs']['shown']);
        $this->assertSame(160, $result->notes['academy_clubs']['total']);
        $this->assertCount(8, $options['partner_academies']);
    }

    public function test_no_invented_statistics_when_the_player_has_none(): void
    {
        $player = Player::factory()->create(['name' => 'Sans Stats', 'matches_played' => 0, 'goals' => 0, 'stats_source' => null]);
        $result = app(FicheLayoutEngine::class)->render($player, ['composition' => 'scouting', 'selected_stats' => ['goals', 'assists']]);
        $this->assertStringNotContainsString('Statistiques', $result->html);

        $player->update(['matches_played' => 12, 'goals' => 7, 'stats_source' => 'Wyscout']);
        $result = app(FicheLayoutEngine::class)->render($player->fresh(), ['composition' => 'scouting', 'selected_stats' => ['goals']]);
        $this->assertStringContainsString('Statistiques', $result->html);
        $this->assertStringContainsString('Wyscout', $result->html);
    }

    public function test_labels_follow_the_document_language(): void
    {
        [$player, $options] = $this->dataset('reference');
        foreach (['en' => 'Strengths', 'de' => 'Stärken', 'nl' => 'Sterke punten', 'fr' => 'Points forts'] as $lang => $label) {
            $html = app(FicheLayoutEngine::class)->render($player, $options + ['composition' => 'signature', 'language' => $lang])->html;
            $this->assertStringContainsString($label, $html, $lang);
        }
    }

    public function test_qr_code_only_when_a_real_url_exists(): void
    {
        [$player, $options] = $this->dataset('reference');
        $without = app(FicheLayoutEngine::class)->render($player, $options + ['composition' => 'signature']);
        $this->assertStringNotContainsString('fiche-cache/qr/', str_replace('\\', '/', $without->html));

        $with = app(FicheLayoutEngine::class)->render($player, $options + ['composition' => 'signature', 'qr_custom_url' => 'https://renefootball.com/joueurs/test']);
        $this->assertStringContainsString('fiche-cache/qr/', str_replace('\\', '/', $with->html));
        $this->assertStringNotContainsString('qrserver.com', $with->html, 'QR is generated locally');
    }

    public function test_legacy_presentations_without_composition_still_render_on_one_page(): void
    {
        [$player, $options] = $this->dataset('reference');
        unset($options['composition']);
        $result = app(FicheLayoutEngine::class)->render($player, $options);
        $this->assertSame('classic', $result->composition);
        $this->assertSame(1, $result->pdfInfo['pages']);
    }

    // ------------------------------------------------------------------ API

    public function test_store_renders_verifies_and_records_the_layout_report(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        [$player, $options] = $this->dataset('reference');

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/presentations', [
            'player_id' => $player->id, 'template_key' => 'marketing', 'title' => 'Fiche test',
            'is_published' => true, 'options' => $options + ['composition' => 'scouting'],
        ])->assertCreated();

        $p = Presentation::findOrFail($res->json('data.id'));
        $this->assertSame(1, $p->render_meta['pages']);
        $this->assertEquals([210, 297], $p->render_meta['page_size_mm']);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $p->file_path));
        $this->assertNotNull($p->public_token);
    }

    public function test_preview_pdf_does_not_write_the_unsaved_bio(): void
    {
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create(['bio' => 'Bio enregistrée.']);

        $res = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/presentations/preview-pdf', [
            'player_id' => $player->id,
            'options'   => ['composition' => 'signature'],
            'overrides' => ['bio' => 'Bio en cours de saisie, non enregistrée.'],
        ])->assertOk();

        $bytes = base64_decode($res->json('pdf'));
        $this->assertCount(1, (new Parser())->parseContent($bytes)->getPages());
        $this->assertSame(1, $res->json('layout.pages'));
        $this->assertSame('Bio enregistrée.', $player->fresh()->bio);
    }

    public function test_a_failed_layout_keeps_previous_options_and_pdf(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create();
        $presentation = Presentation::create([
            'player_id' => $player->id, 'template_key' => 'marketing', 'title' => 'Avant',
            'options' => ['composition' => 'signature'], 'file_path' => '/storage/presentations/avant.pdf',
        ]);
        Storage::disk('public')->put('presentations/avant.pdf', '%PDF-previous');

        $this->mock(PresentationPdfService::class)
            ->shouldReceive('render')->andThrow(new FicheLayoutException('Impossible de faire tenir cette fiche.', ['détail']));

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/presentations/{$presentation->id}", [
            'title' => 'Après', 'options' => ['composition' => 'career'],
        ])->assertStatus(422)->assertJsonPath('errors.layout.0', 'Impossible de faire tenir cette fiche.');

        $presentation->refresh();
        $this->assertSame('Avant', $presentation->title);
        $this->assertSame('signature', $presentation->options['composition']);
        $this->assertSame('/storage/presentations/avant.pdf', $presentation->file_path);
        Storage::disk('public')->assertExists('presentations/avant.pdf');
    }

    public function test_external_pdf_must_be_a_single_a4_page(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create();
        $presentation = Presentation::create(['player_id' => $player->id, 'template_key' => 'marketing', 'title' => 'Externe', 'options' => ['composition' => 'signature']]);

        $twoPages = UploadedFile::fake()->createWithContent('fiche.pdf', $this->pdfWithPages(2));
        $this->actingAs($admin, 'sanctum')
            ->post("/api/admin/presentations/{$presentation->id}/upload-asset", ['asset' => $twoPages], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('errors.layout.0', 'Le PDF importé contient 2 pages : une fiche doit tenir sur exactement une page A4.');
        $this->assertNull($presentation->fresh()->external_asset_path);

        $onePage = UploadedFile::fake()->createWithContent('fiche.pdf', $this->pdfWithPages(1));
        $this->actingAs($admin, 'sanctum')
            ->post("/api/admin/presentations/{$presentation->id}/upload-asset", ['asset' => $onePage], ['Accept' => 'application/json'])
            ->assertOk();
        $this->assertSame('pdf', $presentation->fresh()->external_asset_type);
        $this->assertSame(1, $presentation->fresh()->render_meta['pages']);
    }

    public function test_external_image_is_wrapped_on_one_a4_page(): void
    {
        Storage::fake('public');
        $admin = User::factory()->admin()->create();
        $player = Player::factory()->create();
        $presentation = Presentation::create(['player_id' => $player->id, 'template_key' => 'marketing', 'title' => 'Image', 'options' => ['composition' => 'signature']]);

        $this->actingAs($admin, 'sanctum')
            ->post("/api/admin/presentations/{$presentation->id}/upload-asset", ['asset' => UploadedFile::fake()->image('fiche.png', 1080, 1350)], ['Accept' => 'application/json'])
            ->assertOk();
        $meta = $presentation->fresh()->render_meta;
        $this->assertSame(1, $meta['pages']);
        $this->assertEquals([210, 297], $meta['page_size_mm']);
    }

    public function test_catalogue_exposes_compositions_with_defaults_and_supported_options(): void
    {
        $admin = User::factory()->admin()->create();
        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/presentations/catalogue')->assertOk();
        $keys = collect($res->json('compositions'))->pluck('key')->all();
        $this->assertSame(['signature', 'scouting', 'career', 'classic'], $keys);
        $scouting = collect($res->json('compositions'))->firstWhere('key', 'scouting');
        $this->assertContains('stats', $scouting['supports']);
        $this->assertSame('black-gold', $scouting['defaults']['theme']);
        $this->assertCount(5, $res->json('themes'));
    }

    // ------------------------------------------------------------------ data

    /** @return array{0:Player,1:array} */
    private function dataset(string $name): array
    {
        $logo = '/storage/fiche-tests/logo.png';
        $wide = '/storage/fiche-tests/wide-logo.png';

        if ($name === 'minimal') {
            return [Player::factory()->create(['name' => 'Ali', 'club' => null, 'height' => null, 'preferred_foot' => null, 'matches_played' => 0, 'nationality' => null]), []];
        }

        if ($name === 'reference' || $name === 'framed') {
            $player = Player::factory()->create([
                'name' => 'Destiny Megogo', 'category' => 'Defenseur', 'position' => 'Défenseur central', 'best_position' => 'Défenseur central',
                'club' => 'Borussia Mönchengladbach', 'club_logo_url' => $logo, 'nationality' => 'Espagnol', 'date_of_birth' => '2009-07-06',
                'preferred_foot' => 'Droit', 'previous_club' => 'KRC Genk', 'previous_club_logo' => $logo, 'matches_played' => 0,
                'photo_url' => $name === 'framed' ? '/storage/fiche-tests/photo.jpg' : '/storage/fiche-tests/cutout.png',
                'bio' => 'Défenseur central complet, doté d’une excellente lecture du jeu, d’un fort engagement et d’une grande maturité sur le terrain.',
                'strengths' => [['label' => 'Puissance et impact physique'], ['label' => 'Lecture du jeu'], ['label' => 'Qualité dans les duels'], ['label' => 'Relance propre']],
            ]);
            return [$player, [
                'theme' => 'black-gold', 'photo_side' => 'left', 'tagline' => 'Agence de joueurs',
                'projet_intro' => 'Supervisé par l’agence WNRS SPORT (Angleterre) en collaboration avec l’agence RENEFOOTBALL.',
                'supervised_by' => ['name' => 'WNRS Sport', 'country' => 'Angleterre', 'country_code' => 'gb'],
                'partner_academies' => [
                    ['country' => 'Angleterre', 'country_code' => 'gb', 'clubs' => [['name' => 'Arsenal'], ['name' => 'Chelsea']]],
                    ['country' => 'Espagne', 'country_code' => 'es', 'clubs' => [['name' => 'Real Madrid'], ['name' => 'FC Barcelona']]],
                ],
            ]];
        }

        // extreme: every list at its maximum, longest texts, all blocks on.
        $player = Player::factory()->create([
            'name' => 'Jean-Baptiste Maximilien Oluwaseun Adebayo-Christensen',
            'category' => 'Milieu', 'position' => 'Milieu relayeur / Milieu offensif axial', 'best_position' => 'Milieu box-to-box',
            'club' => 'Royal Sporting Club Anderlecht Futures U21', 'club_logo_url' => $wide,
            'nationality' => 'Belge', 'secondary_nationality' => 'Nigerian', 'languages_spoken' => ['Français', 'English', 'Nederlands', 'Yoruba'],
            'date_of_birth' => '2006-02-11', 'height' => '186', 'preferred_foot' => 'Ambidextre',
            'playing_style' => 'Relayeur infatigable, projection rapide', 'objective' => str_repeat('Intégrer une académie de premier plan en Europe et signer un premier contrat professionnel. ', 3),
            'mental_strengths' => ['Leader', 'Résilient', 'Compétiteur', 'Concentré', 'Humble', 'Exigeant'],
            'photo_url' => '/storage/fiche-tests/cutout.png',
            'gallery_photos' => ['/storage/fiche-tests/photo.jpg', '/storage/fiche-tests/tall.jpg', '/storage/fiche-tests/photo.jpg'],
            'career_history' => [
                ['years' => '2014 - 2017', 'club' => 'RSC Anderlecht U12', 'logo_url' => $logo],
                ['years' => '2017 - 2019', 'club' => 'KAA Gent Academy', 'logo_url' => $wide],
                ['years' => '2019 - 2022', 'club' => 'Club Brugge KV Jong', 'logo_url' => null],
                ['years' => '2022 - 2024', 'club' => 'Standard de Liège U19', 'logo_url' => $logo],
            ],
            'previous_club' => 'Standard de Liège', 'previous_club_logo' => $logo,
            'bio' => str_repeat('Milieu complet capable de casser les lignes balle au pied, de presser haut et de se projeter dans la surface. ', 6),
            'scout_quote' => 'Un volume de jeu rare pour son âge.',
            'strengths' => array_map(fn ($l) => ['label' => $l], ['Volume de course exceptionnel', 'Conduite de balle sous pression', 'Passe verticale', 'Jeu de tête offensif', 'Pressing et récupération haute', 'Frappe de loin des deux pieds']),
            'matches_played' => 31, 'minutes_played' => 2487, 'goals' => 9, 'assists' => 11, 'xg' => 7.4, 'pass_accuracy' => 87.2, 'stats_source' => 'Wyscout',
            'distance_avg_km' => 11.4, 'top_speed_kmh' => 33.1, 'sprints_avg' => 24, 'high_intensity_runs_avg' => 61,
            'heatmap_grid' => [[0, 10, 20, 30, 10, 0], [5, 40, 70, 60, 30, 5], [5, 50, 90, 80, 40, 10], [0, 20, 30, 20, 10, 0]],
            'comparisons' => [['name' => 'Joueur A', 'club' => 'Club A'], ['name' => 'Joueur B', 'club' => 'Club B'], ['name' => 'Joueur C', 'club' => 'Club C']],
            'potential_rating' => 8.5, 'potential_label' => 'Titulaire en première division',
        ]);
        $countries = ['Angleterre' => 'gb', 'Espagne' => 'es', 'Allemagne' => 'de', 'Pays-Bas' => 'nl', 'Portugal' => 'pt', 'Italie' => 'it', 'France' => 'fr', 'Belgique' => 'be'];
        $academies = [];
        foreach ($countries as $country => $code) {
            $academies[] = ['country' => $country, 'country_code' => $code, 'clubs' => array_map(fn ($i) => ['name' => "Académie $country $i"], range(1, 20))];
        }
        return [$player, [
            'theme' => 'navy', 'photo_side' => 'right', 'show_heatmap' => true,
            'selected_stats' => ['matches_played', 'goals', 'assists', 'xg'],
            'tagline' => 'Propulseur de talents', 'header_motto' => 'Respect · Ambition · Excellence',
            'motto' => 'Discipline • Work • Passion • Success', 'slogan_cursive' => 'Notre vision, ton avenir. Ensemble vers l’élite.',
            'qr_custom_url' => 'https://renefootball.com/joueurs/jean-baptiste',
            'player_profile_bars' => array_map(fn ($i) => ['label' => "Qualité $i", 'pct' => 50 + $i * 5], range(1, 8)),
            'projet_intro' => str_repeat('Représenté par RENEFOOTBALL en collaboration avec WNRS SPORT, avec un accompagnement vers les meilleures académies. ', 4),
            'supervised_by' => ['name' => 'WNRS Sport', 'logo_url' => $wide, 'country' => 'Angleterre', 'country_code' => 'gb', 'description' => 'Partenaire exclusif au Royaume-Uni.'],
            'partner_agency' => ['name' => 'RENEFOOTBALL', 'logo_url' => $logo, 'country' => 'Luxembourg', 'country_code' => 'lu', 'description' => str_repeat('Accompagnement global : carrière, suivi sportif, scolaire et personnel. ', 3)],
            'partner_academies' => $academies,
        ]];
    }

    // ------------------------------------------------------------------ helpers

    private function dump(string $name, string $pdf): void
    {
        $dir = getenv('FICHE_TEST_DUMP');
        if ($dir) {
            File::ensureDirectoryExists($dir);
            file_put_contents($dir.'/'.preg_replace('/[^a-z0-9-]+/i', '-', $name).'.pdf', $pdf);
        }
    }

    /** @return array{0:float,1:float} */
    private function mediaBox($page): array
    {
        for ($node = $page, $i = 0; $node && $i < 8; $i++) {
            $box = $node->getHeader()->get('MediaBox');
            if ($box && method_exists($box, 'getContent') && count((array) $box->getContent()) === 4) {
                $v = array_map(fn ($e) => (float) (is_object($e) ? $e->getContent() : $e), (array) $box->getContent());
                return [abs($v[2] - $v[0]), abs($v[3] - $v[1])];
            }
            $parent = $node->getHeader()->get('Parent');
            $node = is_object($parent) && method_exists($parent, 'getHeader') ? $parent : null;
        }
        $this->fail('No MediaBox found');
    }

    /** Minimal valid PDF with N A4 pages (built by DomPDF). */
    private function pdfWithPages(int $n): string
    {
        $html = implode('<div style="page-break-after:always;">Page</div>', array_fill(0, $n, '')).'<div>Fin</div>';
        if ($n === 1) $html = '<div>Page unique</div>';
        return \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'portrait')->output();
    }

    private function makeCutout(string $path, int $w, int $h): void
    {
        $im = imagecreatetruecolor($w, $h);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        imagefill($im, 0, 0, imagecolorallocatealpha($im, 0, 0, 0, 127));
        imagealphablending($im, true);
        imagefilledellipse($im, (int) ($w / 2), (int) ($h * 0.22), (int) ($w * 0.3), (int) ($h * 0.28), imagecolorallocate($im, 120, 80, 60));
        imagefilledrectangle($im, (int) ($w * 0.2), (int) ($h * 0.38), (int) ($w * 0.8), $h - 1, imagecolorallocate($im, 30, 90, 200));
        imagepng($im, $path);
        imagedestroy($im);
    }

    private function makePhoto(string $path, int $w, int $h): void
    {
        $im = imagecreatetruecolor($w, $h);
        for ($y = 0; $y < $h; $y += 4) {
            imagefilledrectangle($im, 0, $y, $w, $y + 3, imagecolorallocate($im, 20 + (int) (100 * $y / $h), 90, 60));
        }
        imagefilledellipse($im, (int) ($w * 0.6), (int) ($h * 0.4), (int) ($w * 0.2), (int) ($h * 0.5), imagecolorallocate($im, 230, 230, 230));
        imagejpeg($im, $path, 85);
        imagedestroy($im);
    }

    private function makeLogo(string $path, int $w = 200, int $h = 200): void
    {
        $im = imagecreatetruecolor($w, $h);
        imagesavealpha($im, true);
        imagefill($im, 0, 0, imagecolorallocatealpha($im, 0, 0, 0, 127));
        imagefilledellipse($im, (int) ($w / 2), (int) ($h / 2), $w - 10, $h - 10, imagecolorallocate($im, 200, 30, 40));
        imagepng($im, $path);
        imagedestroy($im);
    }
}
