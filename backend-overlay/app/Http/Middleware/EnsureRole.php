<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage in routes: ->middleware('role:owner,staff')
 * Authorization is enforced here on the server; hiding menu items in the
 * React app is only a convenience, never the security boundary.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active || ! in_array($user->role, $roles, true)) {
            abort(403, 'You do not have access to this resource.');
        }

        return $next($request);
    }
}
