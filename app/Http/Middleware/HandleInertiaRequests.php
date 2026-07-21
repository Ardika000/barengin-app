<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /** @var string */
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /** @return array<string, mixed> */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => fn () => $request->user(),
            ],
            'locale' => fn () => app()->getLocale(),
            'translations' => function () {
                $path = base_path('lang/' . app()->getLocale() . '.json');

                return file_exists($path)
                    ? (json_decode(file_get_contents($path), true) ?: [])
                    : [];
            },
            'languages' => function () {
                try {
                    return \App\Models\Language::where('is_active', true)
                        ->orderBy('sort_order')
                        ->get(['code', 'name', 'native_name'])
                        ->toArray();
                } catch (\Throwable $e) {
                    return [];
                }
            },
            // Hitung percakapan, bukan pesan - /chat/poll pakai satuan yang sama.
            'chat_unread_count' => function () use ($request) {
                $user = $request->user();

                if (! $user) {
                    return 0;
                }

                return (int) \Illuminate\Support\Facades\DB::table('conversation_participants as cp')
                    ->join('messages as m', 'm.conversation_id', '=', 'cp.conversation_id')
                    ->where('cp.user_id', $user->id)
                    ->where('m.sender_id', '!=', $user->id)
                    ->where(function ($q) {
                        $q->whereNull('cp.last_read_at')
                            ->orWhereColumn('m.created_at', '>', 'cp.last_read_at');
                    })
                    ->distinct()
                    ->count('cp.conversation_id');
            },
            'notif_unread_count' => function () use ($request) {
                $user = $request->user();

                if (! $user) {
                    return 0;
                }

                return (int) \App\Models\UserNotification::query()
                    ->where('user_id', $user->id)
                    ->whereNull('read_at')
                    ->count();
            },
            // Per baris produk, bukan total qty.
            'jastip_cart_count' => function () use ($request) {
                $cart = $request->session()->get('jastip_cart', []);
                return count($cart);
            },
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
