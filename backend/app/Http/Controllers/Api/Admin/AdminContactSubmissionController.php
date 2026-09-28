<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;

/**
 * Admin inbox for the public Contact wizard. Lists submissions with
 * lightweight filters (reason / status / search) and lets the operator
 * transition each one through the workflow (new → read → handled → archived).
 */
class AdminContactSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ContactSubmission::query()->latest();

        if ($reason = $request->query('reason')) {
            $q->where('reason', $reason);
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($search = trim((string) $request->query('search'))) {
            $q->where(function ($qq) use ($search) {
                $qq->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->query('per_page', 25), 5), 100);
        $rows = $q->paginate($perPage);

        // Counts by status - so the admin UI can badge the tabs.
        $counts = ContactSubmission::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status')
            ->toArray();

        return response()->json([
            'data'   => $rows->through(fn (ContactSubmission $s) => $this->presentSummary($s))->items(),
            'meta'   => [
                'current_page' => $rows->currentPage(),
                'per_page'     => $rows->perPage(),
                'total'        => $rows->total(),
                'last_page'    => $rows->lastPage(),
                'counts'       => array_merge(['new' => 0, 'read' => 0, 'handled' => 0, 'archived' => 0], $counts),
            ],
        ]);
    }

    public function show(ContactSubmission $submission): JsonResponse
    {
        // Opening a "new" submission automatically flips it to "read" so the
        // admin badge on the sidebar reflects unread count without an extra
        // click.
        if ($submission->status === 'new') {
            $submission->update(['status' => 'read']);
        }

        return response()->json([
            'data' => $this->presentDetail($submission),
        ]);
    }

    public function updateStatus(Request $request, ContactSubmission $submission): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(ContactSubmission::STATUSES)],
        ]);
        $submission->update(['status' => $validated['status']]);

        return response()->json([
            'data' => $this->presentDetail($submission),
        ]);
    }

    public function destroy(ContactSubmission $submission): JsonResponse
    {
        // Wipe the CV blob when purging the row so we don't accumulate
        // orphaned uploads on disk (RGPD data minimisation).
        if ($submission->cv_path) {
            Storage::disk('local')->delete($submission->cv_path);
            Storage::disk('public')->delete($submission->cv_path); // legacy layout
        }
        $submission->delete();
        return response()->json(['data' => ['deleted' => true]]);
    }

    /**
     * Return a short-lived signed URL to the CV attached to this submission.
     * The URL points at a public route protected by Laravel's `signed`
     * middleware: only holders of a signature we minted in this authed
     * endpoint can download the file, and the signature expires after
     * 15 minutes. This is the "URLs signées" mechanism advertised in the
     * privacy policy.
     */
    public function cvLink(ContactSubmission $submission): JsonResponse
    {
        if (! $submission->cv_path) {
            return response()->json(['message' => 'Aucun CV joint à cette demande.'], 404);
        }

        $url = URL::temporarySignedRoute(
            'contact.cv.download',
            now()->addMinutes(15),
            ['submission' => $submission->id],
        );

        return response()->json(['data' => ['url' => $url, 'expires_in' => 900]]);
    }

    /**
     * Guarantee valid UTF-8 for JSON output - historical rows may carry
     * Latin-1 bytes from older curl/client tests, and one bad byte would
     * otherwise blow up the whole list response with
     * "Malformed UTF-8 characters, possibly incorrectly encoded".
     */
    private function utf8(?string $v): ?string
    {
        if ($v === null || $v === '') return $v;
        if (mb_check_encoding($v, 'UTF-8')) return $v;
        $converted = @iconv('UTF-8', 'UTF-8//IGNORE', $v);
        if ($converted === false || $converted === '') {
            $converted = @mb_convert_encoding($v, 'UTF-8', 'ISO-8859-1');
        }
        return $converted !== false ? $converted : '';
    }

    private function presentSummary(ContactSubmission $s): array
    {
        return [
            'id'         => $s->id,
            'reason'     => $s->reason,
            'name'       => $this->utf8($s->name),
            'email'      => $s->email,
            'phone'      => $this->utf8($s->phone),
            'status'     => $s->status,
            'snippet'    => $this->utf8(mb_substr((string) $s->message, 0, 140)),
            'created_at' => $s->created_at?->toIso8601String(),
            'has_cv'     => (bool) $s->cv_path,
        ];
    }

    private function presentDetail(ContactSubmission $s): array
    {
        $payload = is_array($s->payload) ? $s->payload : [];

        // Resolve the referenced player (club/media flows) so the admin
        // sees the full record instead of just an id.
        $player = null;
        if (! empty($payload['player_id'])) {
            $p = Player::find($payload['player_id']);
            if ($p) {
                $player = [
                    'id'        => $p->id,
                    'slug'      => $p->slug,
                    'name'      => $p->name,
                    'club'      => $p->club,
                    'position'  => $p->position,
                    'photo_url' => $p->photo_url,
                ];
            }
        }

        // Scrub any stray Latin-1 bytes so json_encode() never fails on
        // downstream serialisation.
        $safePayload = [];
        foreach ($payload as $k => $v) {
            $safePayload[$k] = is_string($v) ? $this->utf8($v) : $v;
        }

        return [
            'id'         => $s->id,
            'reason'     => $s->reason,
            'name'       => $this->utf8($s->name),
            'email'      => $s->email,
            'phone'      => $this->utf8($s->phone),
            'subject'    => $this->utf8($s->subject),
            'message'    => $this->utf8($s->message),
            'payload'    => $safePayload,
            'player'     => $player,
            'status'     => $s->status,
            // No direct /storage URL: the frontend calls /cv-link on demand
            // to receive a 15-minute signed URL (see cvLink()).
            'has_cv'     => (bool) $s->cv_path,
            'consent_at' => $s->consent_at?->toIso8601String(),
            'created_at' => $s->created_at?->toIso8601String(),
            'ip'         => $s->ip,
            'user_agent' => $this->utf8($s->user_agent),
        ];
    }
}
