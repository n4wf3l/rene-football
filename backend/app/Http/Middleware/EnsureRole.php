<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Restricts a route to some back-office roles: ->middleware('role:superadmin,scout'). */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! in_array($request->user()?->role, $roles, true)) {
            return response()->json(['message' => 'Cette partie de la plateforme n\'est pas ouverte à votre rôle.'], 403);
        }

        return $next($request);
    }
}
