<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ContactController extends Controller
{
    /**
     * Store a submission from the public multi-step contact wizard. The
     * `reason` picks which audience-specific payload we validate; the base
     * fields (name/email/phone/message/consent) are shared across all
     * audiences and stored flat on the model. A CV upload is optional and
     * only accepted on the "joueur" flow.
     */
    public function store(Request $request): JsonResponse
    {
        $baseRules = [
            'reason'  => ['required', Rule::in(['joueur', 'club', 'medias', 'autre'])],
            'name'    => ['required', 'string', 'min:2', 'max:120'],
            'email'   => ['required', 'email:rfc', 'max:160'],
            'phone'   => ['nullable', 'string', 'max:40'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            'consent' => ['required', 'accepted'],
        ];

        // Payload rules per audience - kept flat with dot notation so
        // Illuminate reports individual field errors back to the wizard.
        $reason = (string) $request->input('reason');
        $payloadRules = match ($reason) {
            'joueur' => [
                'payload.intent'         => ['required', Rule::in(['join', 'renew', 'advice', 'other'])],
                'payload.player_name'    => ['required', 'string', 'max:120'],
                'payload.date_of_birth'  => ['nullable', 'date', 'before:today'],
                'payload.position'       => ['nullable', 'string', 'max:80'],
                'payload.current_club'   => ['nullable', 'string', 'max:120'],
                'payload.level'          => ['nullable', Rule::in(['youth', 'amateur', 'semi_pro', 'pro'])],
                'payload.video_url'      => ['nullable', 'url', 'max:500'],
                'payload.objective'      => ['nullable', 'string', 'max:1000'],
                'cv'                     => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:6144'], // 6 MB
            ],
            'club' => [
                'payload.club_name'      => ['required', 'string', 'max:160'],
                'payload.role'           => ['required', Rule::in(['coach', 'sporting_director', 'scout', 'president', 'other'])],
                'payload.interest'       => ['required', Rule::in(['player', 'profile', 'partnership', 'other'])],
                'payload.player_id'      => ['nullable', 'integer', 'exists:players,id'],
                'payload.player_name'    => ['nullable', 'string', 'max:120'],
                'payload.needed_position'=> ['nullable', 'string', 'max:80'],
                'payload.age_min'        => ['nullable', 'integer', 'min:12', 'max:45'],
                'payload.age_max'        => ['nullable', 'integer', 'min:12', 'max:45'],
                'payload.budget'         => ['nullable', 'string', 'max:120'],
            ],
            'medias' => [
                'payload.media_name'     => ['required', 'string', 'max:160'],
                'payload.role'           => ['required', Rule::in(['journalist', 'editor', 'producer', 'other'])],
                'payload.purpose'        => ['required', Rule::in(['interview_player', 'article', 'documentary', 'other'])],
                'payload.player_id'      => ['nullable', 'integer', 'exists:players,id'],
                'payload.player_name'    => ['nullable', 'string', 'max:120'],
                'payload.deadline'       => ['nullable', 'date'],
            ],
            'autre' => [
                'payload.subject'        => ['required', 'string', 'max:200'],
            ],
            default => [],
        };

        $validated = $request->validate(array_merge($baseRules, $payloadRules));

        // Payload is always sent as nested form fields (payload[intent], etc.)
        // Laravel already parsed it into the request via dot notation; grab
        // the whole payload subtree so we don't have to re-map each key.
        $payload = $request->input('payload', []);
        if (! is_array($payload)) $payload = [];

        // Store the CV upload (players only) under public/cvs so the admin
        // can download it via a signed public URL later. Filename is
        // randomised so the caller can't guess other players' documents.
        $cvPath = null;
        if ($reason === 'joueur' && $request->hasFile('cv')) {
            $ext = $request->file('cv')->getClientOriginalExtension() ?: 'pdf';
            $filename = 'cvs/'.now()->format('Y').'/'.Str::random(20).'.'.strtolower($ext);
            $cvPath = $request->file('cv')->storeAs('', $filename, 'public');
        }

        $submission = ContactSubmission::create([
            'reason'     => $validated['reason'],
            'name'       => $this->utf8(trim($validated['name'])),
            'email'      => strtolower(trim($validated['email'])),
            'phone'      => $this->utf8($validated['phone'] ?? null),
            // Legacy `subject` column is now filled from the "autre" payload
            // so old dashboards that read it still show something useful.
            'subject'    => $reason === 'autre' ? $this->utf8($payload['subject'] ?? null) : null,
            'message'    => $this->utf8(trim($validated['message'])),
            'payload'    => $this->normalisePayload($reason, $payload),
            'status'     => 'new',
            'cv_path'    => $cvPath,
            'consent_at' => now(),
            'ip'         => $request->ip(),
            'user_agent' => $this->utf8(substr((string) $request->userAgent(), 0, 500)),
        ]);

        $this->notify($submission);

        return response()->json([
            'data' => [
                'id'         => $submission->id,
                'created_at' => $submission->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Trim and coerce payload values into typed shape - keeps the JSON
     * blob clean regardless of what the browser posted.
     */
    /**
     * Coerce any string into valid UTF-8, replacing invalid bytes with
     * their nearest ASCII equivalent (or a "?" fallback). Prevents
     * downstream json_encode() failures when a client sent Latin-1 or
     * mixed-encoding input.
     */
    private function utf8(?string $v): ?string
    {
        if ($v === null) return null;
        if (mb_check_encoding($v, 'UTF-8')) return $v;
        // //TRANSLIT + //IGNORE picks a close match for Latin-1 accents,
        // then drops anything still un-mappable.
        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $v);
        if ($converted === false || $converted === '') {
            $converted = @mb_convert_encoding($v, 'UTF-8', 'ISO-8859-1');
        }
        return $converted !== false ? $converted : '';
    }

    private function normalisePayload(string $reason, array $payload): array
    {
        $clean = fn ($v) => is_string($v) ? $this->utf8(trim($v)) : $v;
        $payload = array_map($clean, $payload);
        // Drop empty strings so the JSON stays compact.
        $payload = array_filter($payload, static fn ($v) => $v !== '' && $v !== null);

        // Cast a couple of ints so admin filters can rely on numeric values.
        foreach (['player_id', 'age_min', 'age_max'] as $intKey) {
            if (isset($payload[$intKey])) {
                $payload[$intKey] = (int) $payload[$intKey];
            }
        }

        // Attach `reason` inside payload too, so the admin UI can render
        // audience-specific summaries without joining columns.
        $payload['_reason'] = $reason;
        return $payload;
    }

    /**
     * Best-effort email notification to the agency inbox. Never rethrows
     * so a broken SMTP config can't fail a public submission.
     */
    private function notify(ContactSubmission $submission): void
    {
        try {
            $to = config('mail.contact_recipient', env('CONTACT_RECIPIENT', 'contact@renefootball.com'));
            $lines = [
                "Nouvelle demande (#{$submission->id})",
                "",
                "Type: {$submission->reason}",
                "Nom: {$submission->name}",
                "Email: {$submission->email}",
                "Téléphone: ".($submission->phone ?: '-'),
                "",
                "Message:",
                $submission->message,
            ];
            if (! empty($submission->payload)) {
                $lines[] = "";
                $lines[] = "Détails:";
                foreach ($submission->payload as $k => $v) {
                    if (str_starts_with((string) $k, '_')) continue;
                    $lines[] = "  - {$k}: ".(is_scalar($v) ? $v : json_encode($v));
                }
            }
            if ($submission->cv_path) {
                $lines[] = "";
                $lines[] = "CV: /storage/".$submission->cv_path;
            }

            Mail::raw(implode("\n", $lines), function ($message) use ($to, $submission) {
                $message->to($to)
                    ->subject('[Rene Football] Nouvelle demande - '.$submission->name)
                    ->replyTo($submission->email, $submission->name);
            });
        } catch (Throwable $e) {
            Log::warning('Contact mail dispatch failed', [
                'submission_id' => $submission->id,
                'error'         => $e->getMessage(),
            ]);
        }
    }
}
