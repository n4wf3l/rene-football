<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class ContactController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason'  => 'required|in:joueur,club,medias,autre',
            'name'    => 'required|string|min:2|max:120',
            'email'   => 'required|email:rfc|max:160',
            'phone'   => 'nullable|string|max:40',
            'subject' => 'nullable|string|max:200',
            'message' => 'required|string|min:10|max:5000',
            'consent' => 'required|accepted',
        ]);

        $submission = ContactSubmission::create([
            'reason'     => $validated['reason'],
            'name'       => trim($validated['name']),
            'email'      => strtolower(trim($validated['email'])),
            'phone'      => $validated['phone'] ?? null,
            'subject'    => $validated['subject'] ?? null,
            'message'    => trim($validated['message']),
            'consent_at' => now(),
            'ip'         => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
        ]);

        // Best-effort notification — never fail the user submission if mail breaks.
        try {
            $to = config('mail.contact_recipient', env('CONTACT_RECIPIENT', 'contact@renefootball.com'));
            $body = sprintf(
                "Nouvelle demande (#%d)\n\nType: %s\nNom: %s\nEmail: %s\nTéléphone: %s\nSujet: %s\n\nMessage:\n%s\n\nIP: %s",
                $submission->id,
                $submission->reason,
                $submission->name,
                $submission->email,
                $submission->phone ?: '—',
                $submission->subject ?: '—',
                $submission->message,
                $submission->ip ?: '—',
            );
            Mail::raw($body, function ($message) use ($to, $submission) {
                $message->to($to)
                    ->subject('[Rene Football] Demande de contact — ' . $submission->name)
                    ->replyTo($submission->email, $submission->name);
            });
        } catch (Throwable $e) {
            Log::warning('Contact mail dispatch failed', [
                'submission_id' => $submission->id,
                'error'         => $e->getMessage(),
            ]);
        }

        return response()->json([
            'data' => [
                'id'         => $submission->id,
                'created_at' => $submission->created_at->toIso8601String(),
            ],
        ], 201);
    }
}
