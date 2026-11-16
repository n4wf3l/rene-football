<?php

namespace App\Services;

use App\Models\ContactSubmission;
use Illuminate\Support\Str;

/**
 * Telegram version of a contact-form submission, sent by the "ReneFootball"
 * bot next to the email (ContactController::notify). French labels, every
 * value HTML-escaped, long messages shortened to stay under Telegram's
 * 4096-character limit. The CV itself is never sent: the message points to
 * the back-office, where it is behind the admin login.
 */
class ContactTelegramMessage
{
    private const REASONS = [
        'joueur' => ['⚽', 'Joueur'],
        'club'   => ['🏟', 'Club'],
        'medias' => ['🎙', 'Média'],
        'autre'  => ['✉️', 'Autre demande'],
    ];

    /** Payload fields, in display order, with their French label. */
    private const FIELDS = [
        'submitter_type'          => 'Rempli par',
        'guardian_relation'       => 'Lien avec le joueur',
        'guardian_relation_other' => 'Lien (précision)',
        'minor_name'              => 'Joueur mineur',
        'intent'                  => 'Demande',
        'player_name'             => 'Joueur',
        'date_of_birth'           => 'Né le',
        'position'                => 'Poste',
        'current_club'            => 'Club actuel',
        'level'                   => 'Niveau',
        'video_url'               => 'Vidéo',
        'objective'               => 'Objectif',
        'club_name'               => 'Club',
        'media_name'              => 'Média',
        'role'                    => 'Fonction',
        'interest'                => 'Intérêt',
        'purpose'                 => 'Objet',
        'needed_position'         => 'Poste recherché',
        'age_min'                 => 'Âge min.',
        'age_max'                 => 'Âge max.',
        'budget'                  => 'Budget',
        'deadline'                => 'Échéance',
        'subject'                 => 'Sujet',
    ];

    /** French wording of the wizard's enumerated values. */
    private const VALUES = [
        'submitter_type'    => ['self' => 'le joueur lui-même', 'guardian' => 'un parent / tuteur'],
        'guardian_relation' => ['parent' => 'parent', 'tutor' => 'tuteur', 'other' => 'autre'],
        'intent'            => ['join' => 'rejoindre l\'agence', 'renew' => 'renouveler / changer d\'agent', 'advice' => 'demande de conseil', 'other' => 'autre'],
        'level'             => ['youth' => 'jeunes', 'amateur' => 'amateur', 'semi_pro' => 'semi-pro', 'pro' => 'pro'],
        'role'              => [
            'coach' => 'entraîneur', 'sporting_director' => 'directeur sportif', 'scout' => 'scout',
            'president' => 'président', 'journalist' => 'journaliste', 'editor' => 'rédacteur',
            'producer' => 'producteur', 'other' => 'autre',
        ],
        'interest'          => ['player' => 'un joueur de l\'agence', 'profile' => 'un profil recherché', 'partnership' => 'partenariat', 'other' => 'autre'],
        'purpose'           => ['interview_player' => 'interview d\'un joueur', 'article' => 'article', 'documentary' => 'documentaire', 'other' => 'autre'],
    ];

    private const MESSAGE_LIMIT = 2500;

    public static function build(ContactSubmission $s): string
    {
        [$icon, $label] = self::REASONS[$s->reason] ?? ['✉️', ucfirst((string) $s->reason)];

        $lines = [
            "{$icon} <b>Nouvelle demande de contact · ".e($label).'</b>',
            '',
            '<b>'.e($s->name).'</b>',
            '📧 '.e($s->email),
        ];
        if ($s->phone) {
            $lines[] = '📞 '.e($s->phone);
        }

        $details = [];
        $payload = is_array($s->payload) ? $s->payload : [];
        foreach (self::FIELDS as $key => $fieldLabel) {
            $value = $payload[$key] ?? null;
            if ($value === null || $value === '' || is_array($value)) {
                continue;
            }
            $text = self::VALUES[$key][$value] ?? (string) $value;
            $details[] = '• '.$fieldLabel.' : '.e(Str::limit($text, 300));
        }
        if ($details) {
            $lines[] = '';
            array_push($lines, ...$details);
        }

        $lines[] = '';
        $lines[] = '<b>Message</b>';
        $lines[] = e(Str::limit((string) $s->message, self::MESSAGE_LIMIT));

        if ($s->cv_path) {
            $lines[] = '';
            $lines[] = '📎 CV joint, à ouvrir dans le back-office.';
        }

        $admin = rtrim((string) config('app.url'), '/').'/admin/contact';
        $lines[] = '';
        $lines[] = '<a href="'.e($admin).'">Ouvrir dans le back-office</a> · demande #'.$s->id;

        return implode("\n", $lines);
    }
}
