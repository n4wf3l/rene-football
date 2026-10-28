<?php

namespace App\Services\Presentations\Fiche;

/**
 * One rung of the adaptive ladder the layout engine walks when a fiche does
 * not fit on its page. Each rung tightens spacing first, then type (never
 * below the readable floors enforced by RenderContext::pt()), then — only at
 * synthesis levels — the number of secondary items shown, with every cut
 * reported to the admin. Identity, position, photo and contacts are never
 * capped.
 */
final class FicheDensity
{
    /** Max items (or characters) per list at synthesis level 0 / 1 / 2 / 3 / 4. */
    private const CAPS = [
        'strengths'       => [6, 6, 5, 5, 4],
        'mental'          => [6, 5, 4, 4, 3],
        'career'          => [5, 4, 4, 4, 3],
        'bars'            => [8, 6, 5, 4, 4],
        'gallery'         => [3, 3, 2, 2, 0],
        'academies'       => [8, 6, 4, 4, 4],
        'academy_clubs'   => [5, 4, 3, 3, 3],
        'comparisons'     => [3, 3, 2, 2, 0],
        'physical'        => [4, 4, 4, 4, 4],
        'stats'           => [4, 4, 4, 4, 4],
        'languages'       => [4, 3, 3, 2, 2],
        'heatmap'         => [1, 1, 1, 1, 0],
        'facts'           => [8, 8, 8, 4, 4],
        'career_logos'    => [1, 1, 1, 0, 0],
        'career_bars'     => [8, 6, 5, 4, 0],
        // Characters of free text before an editorial cut (sentence boundary).
        'bio'             => [620, 480, 380, 300, 240],
        'project_intro'   => [420, 340, 260, 200, 160],
        'objective'       => [180, 150, 120, 110, 100],
        'org_description' => [220, 150, 100, 80, 0],
    ];

    public function __construct(
        public readonly string $name,
        /** Multiplier applied to vertical rhythm (gaps, paddings). */
        public readonly float $space,
        /** Multiplier applied to type sizes before the readability floor. */
        public readonly float $type,
        /** Synthesis level: 0 = everything shown, 1-4 = secondary content capped. */
        public readonly int $level,
    ) {
    }

    /** @return FicheDensity[] deterministic, bounded retry order */
    public static function ladder(): array
    {
        return [
            new self('standard', 1.00, 1.00, 0),
            new self('compact',  0.78, 0.95, 0),
            new self('dense',    0.60, 0.90, 0),
            new self('dense',    0.55, 0.90, 1),
            new self('dense',    0.50, 0.88, 2),
            new self('dense',    0.45, 0.86, 3),
            new self('dense',    0.40, 0.85, 4),
        ];
    }

    public function cap(string $list): int
    {
        return self::CAPS[$list][$this->level] ?? PHP_INT_MAX;
    }

    /** Last-resort footer: slogan shares the motto band. */
    public function compactFooter(): bool
    {
        return $this->level >= 3;
    }

    public function label(): string
    {
        return $this->level > 0 ? $this->name.'+synthèse'.$this->level : $this->name;
    }
}
