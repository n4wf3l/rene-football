<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The public player and article APIs only expose what the website shows:
 * internal scouting data, notes and the exact date of birth stay private.
 */
class PublicPlayerPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private const PRIVATE_PLAYER_FIELDS = [
        'scouting_status', 'score_current', 'score_potential', 'score_club_fit', 'score_market',
        'score_risk', 'score_confidence', 'score_global', 'completeness_pct', 'next_action',
        'scout_summary', 'source_label', 'reliability_score', 'stats_source', 'stats_reliability',
        'tags', 'date_of_birth', 'is_published', 'created_at', 'updated_at',
    ];

    private function playerWithInternalData(): Player
    {
        return Player::factory()->create([
            'slug'             => 'young-talent',
            'goals'            => 7,
            'date_of_birth'    => '2012-08-13',
            'scouting_status'  => 'shortlist_a',
            'score_global'     => 81,
            'next_action'      => 'Négocier avec le club X',
            'scout_summary'    => 'Note interne confidentielle',
            'tags'             => ['prioritaire'],
            'strengths'        => [['key' => 'vision', 'label' => 'Lecture du jeu']],
            'stats_updated_at' => now(),
        ]);
    }

    public function test_public_profile_hides_internal_fields(): void
    {
        $this->playerWithInternalData();

        $data = $this->getJson('/api/players/young-talent')->assertOk()->json('data');

        foreach (self::PRIVATE_PLAYER_FIELDS as $field) {
            $this->assertArrayNotHasKey($field, $data, "« {$field} » ne doit pas être public");
        }
        $this->assertSame(7, $data['goals']);
        $this->assertSame('Lecture du jeu', $data['strengths'][0]['label']);
        $this->assertArrayHasKey('stats_updated_at', $data);
        $this->assertArrayHasKey('age', $data);
    }

    public function test_public_match_log_and_clips_hide_notes(): void
    {
        $player = $this->playerWithInternalData();
        $player->appearances()->create([
            'match_date' => '2026-10-01', 'competition' => 'U17', 'opponent' => 'FC Test', 'home' => true,
            'score_team' => 2, 'score_opponent' => 1, 'minutes_played' => 90, 'goals' => 1,
            'notes' => 'Remarque interne sur le match',
        ]);
        $player->clips()->create([
            'image_path' => '/storage/clips/a.png', 'title' => 'Appel en profondeur',
            'timestamp_seconds' => 42, 'notes' => 'Commentaire interne', 'annotations_json' => [],
        ]);

        $res = $this->getJson('/api/players/young-talent')->assertOk();

        $this->assertSame('FC Test', $res->json('appearances.0.opponent'));
        $this->assertArrayNotHasKey('notes', $res->json('appearances.0'));
        $this->assertSame('Appel en profondeur', $res->json('clips.0.title'));
        $this->assertArrayNotHasKey('notes', $res->json('clips.0'));
        $this->assertArrayNotHasKey('annotations_json', $res->json('clips.0'));
    }

    public function test_article_clips_hide_notes(): void
    {
        $player = $this->playerWithInternalData();
        $clip = $player->clips()->create([
            'image_path' => '/storage/clips/b.png', 'title' => 'Duel gagné',
            'timestamp_seconds' => 12, 'notes' => 'Commentaire interne', 'annotations_json' => [],
        ]);
        $article = Article::factory()->create(['player_id' => $player->id]);
        $article->clips()->attach($clip->id, ['sort_order' => 0]);

        $res = $this->getJson("/api/articles/{$article->slug}")->assertOk();

        $this->assertSame('Duel gagné', $res->json('data.clips.0.title'));
        $this->assertSame('young-talent', $res->json('data.clips.0.player.slug'));
        $this->assertArrayNotHasKey('notes', $res->json('data.clips.0'));
        $this->assertArrayNotHasKey('annotations_json', $res->json('data.clips.0'));
    }
}
