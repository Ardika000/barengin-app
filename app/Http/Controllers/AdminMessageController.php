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

        // <-- UBAH PEMANGGILAN MODEL INI
        $messages = ContactMessage::query()
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('body', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate(5)
            ->withQueryString();

        return Inertia::render('Admin/Message', [
            'messages' => $messages,
            'filters' => $request->only(['search'])
        ]);
    }

    public function destroy($id)
    {
        // <-- UBAH PEMANGGILAN MODEL INI
        $message = ContactMessage::findOrFail($id);
        $message->delete();

        return redirect()->back()->with('success', 'Pesan berhasil dihapus.');
    }
}