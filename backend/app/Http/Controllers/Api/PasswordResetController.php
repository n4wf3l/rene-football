<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * "Mot de passe oublié" for the admin space.
 *
 *   POST /api/admin/forgot-password  { email }
 *     Always answers with the same message, whether or not an account
 *     exists, so the form can't be used to discover admin emails. When the
 *     address belongs to an admin, a single-use link valid 60 minutes
 *     (config/auth.php) is emailed: /admin/reinitialiser?token=…&email=…
 *
 *   POST /api/admin/reset-password   { email, token, password, password_confirmation }
 *     Sets the new password and revokes every open admin session (Sanctum
 *     tokens), so a stolen session can't outlive the reset.
 */
class PasswordResetController extends Controller
{
    public const SENT_MESSAGE = 'Si un compte existe pour cette adresse, un lien de réinitialisation vient de lui être envoyé.';

    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['email' => ['required', 'email']],
            ['email.required' => 'Indiquez votre adresse email.', 'email.email' => 'Adresse email invalide.'],
        );

        $user = User::where('email', $data['email'])->where('is_admin', true)->first();
        $broker = Password::broker();

        // One email per minute per account at most (auth.passwords.users.throttle).
        if ($user && ! $broker->getRepository()->recentlyCreatedToken($user)) {
            $token = $broker->createToken($user);
            $link = rtrim((string) config('app.url'), '/').'/admin/reinitialiser?'.http_build_query([
                'token' => $token,
                'email' => $user->email,
            ]);
            $minutes = (int) config('auth.passwords.users.expire', 60);

            try {
                Mail::raw(implode("\n", [
                    "Bonjour {$user->name},",
                    '',
                    "Une réinitialisation du mot de passe de votre accès à l'espace agence Rene Football a été demandée.",
                    '',
                    'Pour choisir un nouveau mot de passe, ouvrez ce lien :',
                    $link,
                    '',
                    "Ce lien est valable {$minutes} minutes et ne peut servir qu'une fois.",
                    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste inchangé.",
                    '',
                    'Rene Football',
                ]), function ($message) use ($user) {
                    $message->to($user->email, $user->name)->subject('Réinitialisation de votre mot de passe · Rene Football');
                });
            } catch (Throwable $e) {
                Log::warning('Password reset email failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        return response()->json(['message' => self::SENT_MESSAGE]);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(10)->letters()->numbers()],
        ], [
            'password.required'  => 'Choisissez un nouveau mot de passe.',
            'password.confirmed' => 'Les deux mots de passe ne correspondent pas.',
            'password.min'       => 'Le mot de passe doit contenir au moins 10 caractères.',
            'password.letters'   => 'Le mot de passe doit contenir au moins une lettre.',
            'password.numbers'   => 'Le mot de passe doit contenir au moins un chiffre.',
        ]);

        $status = Password::broker()->reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password'       => Hash::make($password),
                'remember_token' => Str::random(60),
            ])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => ["Ce lien n'est plus valide. Demandez un nouveau lien de réinitialisation."],
            ]);
        }

        return response()->json(['message' => 'Mot de passe modifié. Vous pouvez vous connecter.']);
    }
}
