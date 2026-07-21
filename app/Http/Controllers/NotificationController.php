<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use App\Services\LifecycleNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        // Pengganti cron, di-throttle di dalam.
        LifecycleNotifier::freshenForUser((int) $user->id);

        $filter = $request->query('filter') === 'unread' ? 'unread' : 'all';

        $notifications = UserNotification::query()
            ->where('user_id', $user->id)
            ->when($filter === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (UserNotification $n) => $this->map($n));

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'filter' => $filter,
            'unread_count' => $this->unreadCount($user->id),
        ]);
    }

    public function poll()
    {
        // Pengganti cron juga, navbar mem-poll ini berkala.
        LifecycleNotifier::freshenForUser((int) Auth::id());

        return response()->json([
            'unread' => $this->unreadCount(Auth::id()),
        ]);
    }

    public function markRead($id)
    {
        // Dibatasi ke milik sendiri, id tebakan jangan sampai kena punya orang.
        UserNotification::where('user_id', Auth::id())
            ->whereKey($id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }

    public function markAllRead()
    {
        UserNotification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }

    public function updatePreferences(Request $request)
    {
        $categories = array_keys(UserNotification::CATEGORIES);

        $rules = ['prefs' => ['required', 'array']];
        foreach ($categories as $category) {
            $rules['prefs.' . $category] = ['required', 'boolean'];
        }

        $data = $request->validate($rules);

        // Cuma kategori dikenal, biar kunci asing dari klien tidak masuk kolom JSON.
        $prefs = [];
        foreach ($categories as $category) {
            $prefs[$category] = (bool) $data['prefs'][$category];
        }

        $user = Auth::user();
        $user->forceFill(['notification_prefs' => $prefs])->save();

        return back()->with('flash', [
            'type' => 'success',
            'message' => __('Pengaturan notifikasi disimpan.'),
        ]);
    }

    private function unreadCount(int $userId): int
    {
        return (int) UserNotification::where('user_id', $userId)
            ->whereNull('read_at')
            ->count();
    }

    // type + data dikirim mentah, kalimatnya dirakit di frontend lewat t().
    private function map(UserNotification $n): array
    {
        return [
            'id' => $n->id,
            'type' => $n->type,
            'category' => $n->category,
            'data' => $n->data ?? [],
            'url' => $n->url,
            'is_read' => $n->read_at !== null,
            'created_at' => $n->created_at?->toISOString(),
            'time_label' => $n->created_at?->diffForHumans(),
        ];
    }
}
