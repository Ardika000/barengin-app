<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ForumPeopleController extends Controller
{
    private function followingLookupFor(?User $auth): array
    {
        if (!$auth) return [];

        $ids = $auth->followings()->pluck('following_id')->all();
        return array_fill_keys($ids, true);
    }

    private function mapUsers($users, array $followingLookup)
    {
        return $users->map(function ($u) use ($followingLookup) {
            return [
                'id' => $u->id,
                'full_name' => $u->full_name,
                'username' => $u->username,
                'bio' => $u->bio,
                'avatar' => $u->public_profile_image ?? '/assets/default-profile.png',
                'is_following' => isset($followingLookup[$u->id]),
            ];
        })->values();
    }

    public function people(Request $request)
    {
        $auth = Auth::user();
        $followingLookup = $this->followingLookupFor($auth);

        $users = User::query()
            ->select(['id', 'full_name', 'username', 'bio', 'profile_image'])
            ->whereNotNull('username')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $this->mapUsers($users, $followingLookup),
        ]);
    }

    public function followers(Request $request, string $username)
    {
        $auth = Auth::user();
        $followingLookup = $this->followingLookupFor($auth);

        $user = User::query()
            ->where('username', $username)
            ->firstOrFail();

        $followers = $user->followerUsers()
            ->select(['users.id', 'users.full_name', 'users.username', 'users.bio', 'users.profile_image'])
            ->whereNotNull('users.username')
            ->orderByDesc('users.id')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $this->mapUsers($followers, $followingLookup),
        ]);
    }

    public function following(Request $request, string $username)
    {
        $auth = Auth::user();
        $followingLookup = $this->followingLookupFor($auth);

        $user = User::query()
            ->where('username', $username)
            ->firstOrFail();

        $following = $user->followingUsers()
            ->select(['users.id', 'users.full_name', 'users.username', 'users.bio', 'users.profile_image'])
            ->whereNotNull('users.username')
            ->orderByDesc('users.id')
            ->limit(200)
            ->get();

        return response()->json([
            'data' => $this->mapUsers($following, $followingLookup),
        ]);
    }
}