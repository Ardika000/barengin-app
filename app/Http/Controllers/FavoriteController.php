<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FavoriteController extends Controller
{
    /**
     * Toggle like/favorite untuk Trip atau Pergi Bareng.
     */
    public function toggle(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in([Favorite::TYPE_TRIP, Favorite::TYPE_PERGI_BARENG])],
            'id'   => ['required', 'integer'],
        ]);

        $user = $request->user();

        $favorite = Favorite::where('user_id', $user->id)
            ->where('favoritable_type', $validated['type'])
            ->where('favoritable_id', $validated['id'])
            ->first();

        if ($favorite) {
            $favorite->delete();
        } else {
            Favorite::create([
                'user_id'          => $user->id,
                'favoritable_type' => $validated['type'],
                'favoritable_id'   => $validated['id'],
            ]);
        }

        return back(303);
    }
}
