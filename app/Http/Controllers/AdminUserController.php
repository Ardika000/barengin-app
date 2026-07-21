<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Support\FuzzySearch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminUserController extends Controller
{
    // 1. Tampilkan halaman daftar user (pencarian & filter server-side + URL params)
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $role   = (string) $request->query('role', '');

        $query = User::query();

        if ($search !== '') {
            FuzzySearch::apply($query, $search, ['full_name', 'email', 'username']);
        }

        if ($role === 'admin') {
            $query->where('is_admin', 1);
        } elseif ($role === 'guider') {
            $query->where('is_guider', 1);
        } elseif ($role === 'user') {
            $query->where('is_admin', 0)->where('is_guider', 0);
        }

        $users = $query->orderByDesc('id')->paginate(10)->withQueryString();

        return Inertia::render('Admin/ManagementUser', [
            'users'   => $users,
            'filters' => ['search' => $search, 'role' => $role],
        ]);
    }

    // 2. Tampilkan halaman edit role user
    public function edit($id)
    {
        $user = User::findOrFail($id);
        
        return Inertia::render('Admin/EditUser', [
            'user' => $user
        ]);
    }

    // 3. Simpan perubahan (Update role & verifikasi)
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        // Update role & verified status langsung ke kolom is_verified
        $user->update([
            'is_admin' => $request->is_admin,
            'is_guider' => $request->is_guider,
            'is_verified' => $request->verified,
        ]);

        ActivityLog::record('Mengubah izin pengguna: ' . $user->full_name);

        // Toast sukses ditangani di sisi klien (EditUser) agar terlokalisasi &
        // mendukung status gagal - jadi tidak perlu flash dari server di sini.
        return redirect()->route('management-user');
    }

    // 4. Hapus user
    public function destroy($id)
    {
        $user = User::find($id);
        User::destroy($id);

        ActivityLog::record('Menghapus pengguna: ' . ($user?->full_name ?? "#$id"));
        
        return redirect()->back()->with('success_message', 'Pengguna berhasil dihapus!');
    }
}