<?php

namespace App\Http\Controllers;

use App\Models\UserRating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReviewController extends Controller
{
    /**
     * Simpan ulasan untuk Trip Bareng / Pergi Bareng / Jastip.
     *
     * - trip         : nilai untuk trip (user_trip_ratings) + pemandu (user_ratings:trip_bareng)
     * - pergi_bareng : nilai untuk pembuat perjalanan (user_ratings:pergi_bareng)
     * - jastip       : nilai untuk jastiper/penjual (user_ratings:jastiper); id = user id jastiper
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'        => ['required', Rule::in(['trip', 'pergi_bareng', 'jastip'])],
            'id'          => ['required', 'integer'],
            'user_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'trip_rating' => ['nullable', 'integer', 'min:1', 'max:5', 'required_if:type,trip'],
            'comment'     => ['nullable', 'string', 'max:1000'],
        ], [
            'user_rating.required' => 'Rating wajib diberikan.',
            'user_rating.min'      => 'Rating wajib diberikan.',
            'trip_rating.required_if' => 'Rating trip wajib diberikan.',
            'trip_rating.min'      => 'Rating trip wajib diberikan.',
        ]);

        $user    = $request->user();
        $comment = $validated['comment'] ?? null;

        if ($validated['type'] === 'trip') {
            $trip = DB::table('trips')->where('id', $validated['id'])->first();
            if (! $trip) {
                abort(404);
            }

            // Ulasan untuk pemandu/pembuat trip
            UserRating::updateOrCreate(
                [
                    'user_id'       => $user->id,
                    'rated_user_id' => $trip->guider_id,
                    'type'          => 'trip_bareng',
                ],
                [
                    'rating_amount' => $validated['user_rating'],
                    'comment'       => $comment,
                ],
            );

            // Ulasan untuk trip itu sendiri
            DB::table('user_trip_ratings')->updateOrInsert(
                [
                    'user_id'  => $user->id,
                    'trips_id' => $validated['id'],
                ],
                [
                    'rating_amount' => $validated['trip_rating'],
                    'comment'       => $comment,
                    'updated_at'    => now(),
                    'created_at'    => now(),
                ],
            );
        } elseif ($validated['type'] === 'jastip') {
            // id = user id jastiper (penjual) yang diulas
            $jastiper = DB::table('users')->where('id', $validated['id'])->first();
            if (! $jastiper) {
                abort(404);
            }

            UserRating::updateOrCreate(
                [
                    'user_id'       => $user->id,
                    'rated_user_id' => $jastiper->id,
                    'type'          => 'jastiper',
                ],
                [
                    'rating_amount' => $validated['user_rating'],
                    'comment'       => $comment,
                ],
            );
        } else {
            $pergiBareng = DB::table('pergi_barengs')->where('id', $validated['id'])->first();
            if (! $pergiBareng) {
                abort(404);
            }

            // Ulasan untuk pembuat perjalanan
            UserRating::updateOrCreate(
                [
                    'user_id'       => $user->id,
                    'rated_user_id' => $pergiBareng->initiator_id,
                    'type'          => 'pergi_bareng',
                ],
                [
                    'rating_amount' => $validated['user_rating'],
                    'comment'       => $comment,
                ],
            );
        }

        return back(303)->with('flash', [
            'type'    => 'success',
            'message' => 'Ulasan berhasil dikirim. Terima kasih!',
        ]);
    }
}
