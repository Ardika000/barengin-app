<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage; // <-- UBAH IMPORT INI
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminMessageController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $filter = $request->input('filter', 'all'); // all | today | week | month

        $messages = ContactMessage::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('body', 'like', "%{$search}%");
                });
            })
            ->when($filter === 'today', fn ($q) => $q->whereDate('created_at', today()))
            ->when($filter === 'week', fn ($q) => $q->where('created_at', '>=', now()->subDays(7)))
            ->when($filter === 'month', fn ($q) => $q->where('created_at', '>=', now()->subDays(30)))
            ->latest()
            ->paginate(5)
            ->withQueryString();

        return Inertia::render('Admin/Message', [
            'messages' => $messages,
            // Selalu kirim sebagai objek (bukan array kosong) agar di JS tidak
            // mengakses Array.prototype.filter saat tidak ada query.
            'filters' => [
                'search' => $search,
                'filter' => $filter,
            ],
        ]);
    }

    public function destroy($id)
    {
        // <-- UBAH PEMANGGILAN MODEL INI
        $message = ContactMessage::findOrFail($id);
        $senderName = $message->name ?? '-';
        $message->delete();

        \App\Models\ActivityLog::record('Menghapus pesan dari: ' . $senderName);

        return redirect()->back()->with('success', 'Pesan berhasil dihapus.');
    }
}