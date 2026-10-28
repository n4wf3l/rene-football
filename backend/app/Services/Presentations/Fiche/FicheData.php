<?php

namespace App\Services\Presentations\Fiche;

/**
 * Normalised, render-ready view of one presentation: player data + options,
 * already translated, formatted, sanitised and with every image resolved to
 * a local file. Compositions read only from this object, never from the
 * Player model or the raw options array, so the business rules (what counts
 * as "real" stats, which QR target wins, defaults…) live in one place:
 * FicheDataFactory.
 *
 * Lists keep ALL items; compositions decide how many fit and report any
 * synthesis through RenderContext::take().
 */
final class FicheData
{
    public string $composition;
    public string $lang;
    /** @var array<string,string> */
    public array $palette;
    public string $fontFamily;   // sans | grotesque | editorial
    public float $fontScale;     // 0.92 | 1.0 | 1.08
    public string $photoSide;    // left | right
    public string $middleVariant;

    // Identity
    public string $fullName;
    public string $firstName;
    public string $lastName;
    public ?string $position = null;       // best position, else position
    public ?string $positionDetail = null; // raw position when it differs
    public ?string $category = null;
    public ?int $age = null;
    public ?string $birthDate = null;
    public ?string $foot = null;
    public ?string $footRaw = null;
    public ?string $height = null;
    /** @var array<int, array{label:string, flag:?FicheImage}> */
    public array $nationalities = [];
    /** @var string[] */
    public array $languages = [];
    public ?string $club = null;
    public ?FicheImage $clubLogo = null;
    public ?string $previousClub = null;
    public ?FicheImage $previousClubLogo = null;

    // Visuals
    public ?FicheImage $photo = null;
    public string $photoFit = 'cover';
    public int $photoZoom = 100;
    public int $photoX = 50;
    public int $photoY = 30;
    /** @var FicheImage[] */
    public array $gallery = [];

    // Sporting profile
    public string $bio = '';
    public string $scoutQuote = '';
    /** @var string[] */
    public array $strengths = [];
    /** @var string[] */
    public array $mental = [];
    public ?string $playingStyle = null;
    public ?string $objective = null;
    /** @var array<int, array{years:string, club:string, logo:?FicheImage}> chronological, oldest first */
    public array $career = [];
    /** @var array<int, array{label:string, pct:int}> */
    public array $bars = [];
    /** @var array<int, array{label:string, value:string, suffix:string}> */
    public array $stats = [];
    public ?string $statsSource = null;
    /** @var array<int, array{label:string, value:string}> */
    public array $physical = [];
    public ?string $heatmapPath = null;
    /** @var array<int, array{name:string, club:string}> */
    public array $comparisons = [];
    public ?float $potentialRating = null;
    public ?string $potentialLabel = null;

    // Sporting project
    public string $projectIntro = '';
    /** @var array<int, array{country:string, flag:?FicheImage, clubs: array<int, array{name:string, logo:?FicheImage}>}> */
    public array $academies = [];
    /** @var ?array{name:string, logo:?FicheImage, country:string, flag:?FicheImage, description:string} */
    public ?array $supervisedBy = null;
    /** @var ?array{name:string, logo:?FicheImage, country:string, flag:?FicheImage, description:string} */
    public ?array $partner = null;

    // Branding
    public string $tagline = '';
    public string $headerMotto = '';
    public string $motto = '';
    public string $slogan = '';
    public bool $watermark = true;
    public string $agencyName = 'RENEFOOTBALL';
    public ?FicheImage $logo = null;
    /** @var array{instagram:string, email:string, phone:string} */
    public array $contact = ['instagram' => '', 'email' => '', 'phone' => ''];
    /** @var ?array{image:FicheImage, label:string, url:string} */
    public ?array $qr = null;
    public string $issuedOn = '';

    public function hasProject(): bool
    {
        return $this->projectIntro !== '' || $this->academies !== [] || $this->supervisedBy !== null || $this->partner !== null;
    }

    public function hasCharacteristics(): bool
    {
        return $this->playingStyle !== null || $this->mental !== [] || $this->objective !== null;
    }
}
