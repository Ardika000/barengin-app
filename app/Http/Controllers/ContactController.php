<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage; // <-- UBAH IMPORT INI
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'body' => 'required|string',
        ]);

        // <-- UBAH PEMANGGILAN MODEL INI
        ContactMessage::create([
            'name' => $request->name,
            'email' => $request->email,
            'body' => $request->body,
        ]);

        return redirect()->back()->with('success', 'Pesan berhasil dikirim!');
    }
}