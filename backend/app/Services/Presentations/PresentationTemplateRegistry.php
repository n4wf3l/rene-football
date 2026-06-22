<?php

namespace App\Services\Presentations;

use App\Services\Presentations\Templates\ClassicTemplate;
use App\Services\Presentations\Templates\MagazineTemplate;
use App\Services\Presentations\Templates\MinimalTemplate;
use App\Services\Presentations\Templates\StadiumTemplate;
use RuntimeException;

class PresentationTemplateRegistry
{
    /** @var array<class-string<PresentationTemplate>> */
    private const TEMPLATES = [
        ClassicTemplate::class,
        MagazineTemplate::class,
        MinimalTemplate::class,
        StadiumTemplate::class,
    ];

    /** @return array<int, array{key:string,label:string,description:string,defaults:array,thumbnail:string}> */
    public static function catalogue(): array
    {
        return array_map(static fn ($cls) => [
            'key'         => $cls::key(),
            'label'       => $cls::label(),
            'description' => $cls::description(),
            'defaults'    => $cls::defaultOptions(),
            'thumbnail'   => $cls::thumbnailSvg(),
        ], self::TEMPLATES);
    }

    public static function keys(): array
    {
        return array_map(static fn ($cls) => $cls::key(), self::TEMPLATES);
    }

    public static function resolve(string $key): PresentationTemplate
    {
        foreach (self::TEMPLATES as $cls) {
            if ($cls::key() === $key) return new $cls();
        }
        throw new RuntimeException("Unknown presentation template: {$key}");
    }
}