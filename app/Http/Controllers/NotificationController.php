<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /** Halaman daftar notifikasi. */
    public function index(Request $request)
    {
        $user = Auth::user();

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

    /**
     * Polling ringan untuk lencana navbar — dipakai pada hosting tanpa
     * WebSocket, sepola dengan /chat/poll.
     */
    public function poll()
    {
        return response()->json([
            'unread' => $this->unreadCount(Auth::id()),
        ]);
    }

    /** Tandai satu notifikasi terbaca. */
    public function markRead($id)
    {
        // Dibatasi ke milik sendiri: tanpa ini id tebakan bisa menandai
        // notifikasi orang lain.
        UserNotification::where('user_id', Auth::id())
            ->whereKey($id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }

    /** Tandai semua terbaca. */
    public function markAllRead()
    {
        UserNotification::where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return back();
    }

    /** Simpan preferensi notifikasi per pengguna (dari tab Pengaturan). */
    public function updatePreferences(Request $request)
    {
        $categories = array_keys(UserNotification::CATEGORIES);

        $rules = ['prefs' => ['required', 'array']];
        foreach ($categories as $category) {
            $rules['prefs.' . $category] = ['required', 'boolean'];
        }

        $data = $request->validate($rules);

        // Hanya kategori yang dikenal yang disimpan — kunci asing dari klien
        // tidak boleh menyusup ke kolom JSON.
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

    /**
     * Bentuk payload untuk UI. `type` + `data` sengaja dikirim mentah: kalimatnya
     * dirakit di frontend lewat t() supaya ikut bahasa yang sedang aktif.
     */
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
            // diffForHumans() mengikuti locale aktif yang dipasang SetLocale,
            // jadi "20 menit yang lalu" / "20 minutes ago" ikut bahasa pengguna.
            'time_label' => $n->created_at?->diffForHumans(),
        ];
    }
}
