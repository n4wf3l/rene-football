<?php

namespace App\Services\Presentations\Fiche;

/**
 * Everything a composition needs for one render attempt: data, density,
 * translations, assets, and the extra vertical space (`elastic`, mm) the
 * engine hands back after measuring a first pass that fitted with room to
 * spare. Records every editorial synthesis so the admin can see what the
 * PDF version shortens.
 */
final class RenderContext
{
    /** @var array<string, array{shown:int,total:int}> */
    public array $notes = [];

    public function __construct(
        public readonly FicheData $data,
        public readonly FicheDensity $density,
        public readonly FicheI18n $i18n,
        public readonly FicheAssets $assets,
        public readonly float $elastic = 0.0,
        /** @var array<string,float> spare mm per measured column (data-limit block) */
        public readonly array $spare = [],
        /** @var array<string, array{x:float,y:float,w:float,h:float,page:int}> blocks measured on the previous pass */
        public readonly array $measured = [],
    ) {
    }

    /** @param array<string,float> $spare */
    public function withElastic(float $mm, array $spare = []): self
    {
        return new self($this->data, $this->density, $this->i18n, $this->assets, max(0.0, $mm), $spare, $this->measured);
    }

    /** @param array<string, array{x:float,y:float,w:float,h:float,page:int}> $blocks */
    public function withMeasured(array $blocks): self
    {
        return new self($this->data, $this->density, $this->i18n, $this->assets, $this->elastic, $this->spare, $blocks);
    }

    /** Height (mm) of a block as actually rendered on the previous pass, if any. */
    public function measuredHeight(string $block): ?float
    {
        return isset($this->measured[$block]) ? $this->measured[$block]['h'] : null;
    }

    /** Spare room measured under a given column on the previous pass (mm, ≥ 0, minus a safety margin). */
    public function spareFor(string $block): float
    {
        return max(0.0, ($this->spare[$block] ?? $this->elastic) - 1.0);
    }

    /**
     * Items of `$list` that fit the current density; records a note when some
     * are left out so the editor can say "6 of 8 shown".
     *
     * @template T
     * @param T[] $items
     * @return T[]
     */
    public function take(string $list, array $items, ?int $cap = null): array
    {
        $cap ??= $this->density->cap($list);
        $total = count($items);
        if ($total > $cap) {
            $this->note($list, $cap, $total);
            return array_slice($items, 0, $cap);
        }
        return $items;
    }

    public function note(string $key, int $shown, int $total): void
    {
        if ($shown < $total) {
            $this->notes[$key] = ['shown' => $shown, 'total' => $total];
        }
    }

    /**
     * Free text shortened at a sentence (or word) boundary when it exceeds the
     * density budget. Records the cut in characters.
     */
    public function prose(string $key, string $text): string
    {
        $text = trim($text);
        $max  = $this->density->cap($key);
        $len  = mb_strlen($text);
        if ($len <= $max) return $text;
        if ($max <= 0) {
            $this->note($key, 0, $len);
            return '';
        }

        $cut = mb_substr($text, 0, $max);
        $sentenceEnd = max((int) mb_strrpos($cut, '. '), (int) mb_strrpos($cut, '! '), (int) mb_strrpos($cut, '? '));
        $cut = $sentenceEnd > $max * 0.6
            ? mb_substr($cut, 0, $sentenceEnd + 1)
            : rtrim(mb_substr($cut, 0, (int) mb_strrpos($cut, ' ')), " ,;:–-").'…';
        $this->note($key, mb_strlen($cut), $len);
        return $cut;
    }

    /** Vertical rhythm in mm, scaled by density. */
    public function sp(float $mm): float
    {
        return round($mm * $this->density->space, 2);
    }

    /** Type size in pt: base × user scale × density, never below `$floor`. */
    public function pt(float $base, float $floor = 6.5): float
    {
        return round(max($floor, $base * $this->data->fontScale * $this->density->type), 2);
    }

    /** Body text size — the readability floor for running text is 9 pt. */
    public function body(float $base = 10.0): float
    {
        return $this->pt($base, 9.0);
    }

    public function t(string $key, mixed ...$args): string
    {
        return $this->i18n->t($key, ...$args);
    }
}
