<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class ChatUserController extends Controller
{
    public function index(Request $request){
        $me = $request->user();

        $q = trim((string) $request->query('q', ''));

        $users = User::query()
            ->where('id', '!=', $me->id)
            ->when($q, function ($query) use ($q) {
                $query->where(function ($w) use ($q) {
                    $w->where('full_name', 'like', "%{$q}%")
                      ->orWhere('username', 'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->orderBy('full_name')
            ->limit(50)
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->full_name,
                'username' => $u->username ?? null,
                // Gunakan accessor public_profile_image agar path storage (mis. hasil unggah
                // kamera: "profile-images/xxx.jpg") diubah jadi URL /storage/... yang valid.
                'avatar' => $u->public_profile_image ?? asset('assets/default-profile.png'),
            ]);

        return response()->json([
            'data' => $users,
        ]);
    }
}
