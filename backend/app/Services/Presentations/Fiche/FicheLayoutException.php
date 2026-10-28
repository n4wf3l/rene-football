<?php

namespace App\Services\Presentations\Fiche;

use RuntimeException;

/**
 * A fiche that cannot be produced as exactly one clean A4 page (or an
 * external file that is not one). The message is meant for the admin; the
 * details list the reasons of each failed attempt.
 */
class FicheLayoutException extends RuntimeException
{
    /** @param string[] $details */
    public function __construct(string $message, public readonly array $details = [])
    {
        parent::__construct($message);
    }
}
