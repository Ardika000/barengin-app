<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => fn () => $request->user(),
            ],
            // Normalisasi flash dari berbagai pola controller -> {type, message}
            'flash' => function () use ($request) {
                $s = $request->session();

                if ($s->has('flash.message')) {
                    return ['type' => $s->get('flash.type', 'info'), 'message' => $s->get('flash.message')];
                }
                if ($s->has('success') || $s->has('success_message')) {
                    return ['type' => 'success', 'message' => $s->get('success', $s->get('success_message'))];
                }
                if ($s->has('error') || $s->has('error_message')) {
                    return ['type' => 'error', 'message' => $s->get('error', $s->get('error_message'))];
                }
                if ($s->has('warning')) {
                    return ['type' => 'warning', 'message' => $s->get('warning')];
                }
                if ($s->has('info')) {
                    return ['type' => 'info', 'message' => $s->get('info')];
                }

                return ['type' => null, 'message' => null];
            },
        ]);
    }
}
