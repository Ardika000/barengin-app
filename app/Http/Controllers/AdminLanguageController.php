<?php

namespace App\Http\Controllers;

use App\Models\Language;
use Inertia\Inertia;

class AdminLanguageController extends Controller
{
    public function index()
    {
        $languages = Language::orderBy('sort_order')->get();

        // Nb: dinamai `manageLanguages`, bukan `languages`, agar tidak menimpa shared
        // prop `languages` (khusus bahasa aktif) yang dipakai LanguageSwitcher.
        return Inertia::render('Admin/Languages', [
            'manageLanguages' => $languages,
        ]);
    }

    public function toggle(Language $language)
    {
        // Bahasa default wajib selalu aktif
        if ($language->is_default) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Bahasa default tidak bisa dinonaktifkan.',
            ]);
        }

        // Minimal satu bahasa harus tetap aktif
        if ($language->is_active && Language::where('is_active', true)->count() <= 1) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Minimal satu bahasa harus aktif.',
            ]);
        }

        $language->is_active = ! $language->is_active;
        $language->save();

        \App\Models\ActivityLog::record(
            ($language->is_active ? 'Mengaktifkan' : 'Menonaktifkan') . ' bahasa: ' . $language->name
        );

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Bahasa "' . $language->name . '" berhasil ' . ($language->is_active ? 'diaktifkan' : 'dinonaktifkan') . '.',
        ]);
    }
}
