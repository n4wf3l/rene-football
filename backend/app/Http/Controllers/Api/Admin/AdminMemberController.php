<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Back-office members (superadmin only, see routes/api.php).
 *
 * A new member gets no password from anyone: an invitation email carries a
 * one-time link (72 h, 'invitations' broker) to choose it on
 * /admin/reinitialiser. A superadmin can't change their own role nor
 * delete their own account, so there is always at least one superadmin.
 */
class AdminMemberController extends Controller
{
    public function index(): JsonResponse
    {
        $pending = DB::table('member_invitation_tokens')->pluck('email')->flip();

        $members = User::query()
            ->where('is_admin', true)
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => $this->present($u, $pending->has($u->email)));

        return response()->json(['data' => $members, 'roles' => User::ROLES]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')],
            'role'  => ['required', Rule::in(array_keys(User::ROLES))],
        ], $this->messages());

        $member = User::create($data + [
            'password' => Hash::make(Str::random(48)),
            'is_admin' => true,
        ]);

        $sent = $this->sendInvitation($member, $request->user());

        return response()->json(['data' => $this->present($member, true), 'invitation_sent' => $sent], 201);
    }

    public function update(Request $request, User $member): JsonResponse
    {
        abort_unless($member->is_admin, 404);

        $data = $request->validate([
            'name'  => ['sometimes', 'required', 'string', 'max:120'],
            'email' => ['sometimes', 'required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($member->id)],
            'role'  => ['sometimes', 'required', Rule::in(array_keys(User::ROLES))],
        ], $this->messages());

        if (isset($data['role']) && $data['role'] !== $member->role && $member->is($request->user())) {
            throw ValidationException::withMessages([
                'role' => ['Vous ne pouvez pas changer votre propre rôle.'],
            ]);
        }

        $oldEmail = $member->email;
        $member->update($data);
        if ($member->email !== $oldEmail) {
            // A pending invitation was addressed to the old email.
            DB::table('member_invitation_tokens')->where('email', $oldEmail)->delete();
        }

        $pending = DB::table('member_invitation_tokens')->where('email', $member->email)->exists();
        return response()->json(['data' => $this->present($member, $pending)]);
    }

    public function destroy(Request $request, User $member): JsonResponse
    {
        abort_unless($member->is_admin, 404);

        if ($member->is($request->user())) {
            throw ValidationException::withMessages([
                'member' => ['Vous ne pouvez pas supprimer votre propre compte.'],
            ]);
        }

        $member->tokens()->delete();
        DB::table('member_invitation_tokens')->where('email', $member->email)->delete();
        $member->delete();

        return response()->json(['ok' => true]);
    }

    /** Sends a fresh invitation link (the previous one stops working). */
    public function invite(Request $request, User $member): JsonResponse
    {
        abort_unless($member->is_admin, 404);

        if (! $this->sendInvitation($member, $request->user())) {
            return response()->json(['message' => 'L\'e-mail d\'invitation n\'a pas pu être envoyé.'], 502);
        }

        return response()->json(['data' => $this->present($member, true)]);
    }

    // ------------------------------------------------------------------ helpers

    private function sendInvitation(User $member, User $by): bool
    {
        $broker = Password::broker('invitations');
        $token = $broker->createToken($member);
        $link = rtrim((string) config('app.url'), '/').'/admin/reinitialiser?'.http_build_query([
            'token'      => $token,
            'email'      => $member->email,
            'invitation' => 1,
        ]);
        $hours = intdiv((int) config('auth.passwords.invitations.expire', 72 * 60), 60);
        $role = User::ROLES[$member->role] ?? $member->role;

        try {
            Mail::raw(implode("\n", [
                "Bonjour {$member->name},",
                '',
                "{$by->name} vous a ouvert un accès à l'espace agence Rene Football (rôle : {$role}).",
                '',
                'Pour choisir votre mot de passe et activer votre compte, ouvrez ce lien :',
                $link,
                '',
                "Ce lien est valable {$hours} heures et ne peut servir qu'une fois.",
                'Ensuite, connectez-vous avec votre adresse e-mail sur '.rtrim((string) config('app.url'), '/').'/admin/login',
                '',
                'Rene Football',
            ]), function ($message) use ($member) {
                $message->to($member->email, $member->name)->subject('Votre accès à l\'espace agence · Rene Football');
            });
            return true;
        } catch (Throwable $e) {
            Log::warning('Member invitation email failed', ['user_id' => $member->id, 'error' => $e->getMessage()]);
            return false;
        }
    }

    private function present(User $u, bool $invitationPending): array
    {
        return [
            'id'                 => $u->id,
            'name'               => $u->name,
            'email'              => $u->email,
            'role'               => $u->role,
            'invitation_pending' => $invitationPending,
            'created_at'         => $u->created_at?->toIso8601String(),
        ];
    }

    private function messages(): array
    {
        return [
            'name.required'  => 'Indiquez le nom du membre.',
            'email.required' => 'Indiquez l\'adresse e-mail du membre.',
            'email.email'    => 'Adresse e-mail invalide.',
            'email.unique'   => 'Un compte existe déjà avec cette adresse e-mail.',
            'role.required'  => 'Choisissez un rôle.',
            'role.in'        => 'Rôle inconnu.',
        ];
    }
}
