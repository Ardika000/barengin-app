<?php

namespace App\Http\Controllers;

use App\Models\Jastip;
use App\Models\JastipRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Sisi pembeli fitur Request Titipan: telusuri destinasi jastiper yang
 * menerima request, ajukan permintaan, lalu bayar setelah ditawar.
 */
class JastipRequestController extends Controller
{
    /** Biaya layanan tetap — selaras dengan checkout jastip biasa. */
    private const SERVICE_FEE = 5000;

    /** Halaman "Request Titipan": destinasi jastiper yang menerima request. */
    public function browse(Request $request)
    {
        $trips = Jastip::query()
            ->openForRequests()
            ->with('user')
            ->orderBy('end_date')
            ->paginate(9)
            ->withQueryString();

        // Rating jastiper untuk semua pemilik di halaman ini — satu query agregat
        $ownerIds = collect($trips->items())->pluck('user_id')->unique()->values();
        $ratings = DB::table('user_ratings')
            ->whereIn('rated_user_id', $ownerIds)
            ->where('type', 'jastiper')
            ->groupBy('rated_user_id')
            ->selectRaw('rated_user_id, AVG(rating_amount) as avg_rating, COUNT(*) as cnt')
            ->get()
            ->keyBy('rated_user_id');

        $trips->through(function ($trip) use ($ratings) {
            $rating = $ratings->get($trip->user_id);

            return [
                'id'               => $trip->id,
                'title'            => $trip->title,
                'origin_city'      => $trip->origin_city,
                'destination_city' => $trip->destination_city,
                'pickup_location'  => $trip->pickup_location,
                'deadline_label'   => optional($trip->end_date)->translatedFormat('d M Y'),
                'window_label'     => optional($trip->start_date)->translatedFormat('d M Y')
                    . ' – ' . optional($trip->end_date)->translatedFormat('d M Y'),
                'jastiper'         => [
                    'id'       => $trip->user?->id,
                    'name'     => $trip->user?->full_name,
                    'username' => $trip->user?->username,
                    'avatar'   => $this->resolveAvatarUrl($trip->user?->profile_image),
                    'rating'   => $rating ? round((float) $rating->avg_rating, 1) : null,
                    'reviews'  => $rating ? (int) $rating->cnt : 0,
                ],
            ];
        });

        return Inertia::render('Jastip/Requests/Browse', ['trips' => $trips]);
    }

    /** Ajukan request titipan ke satu destinasi jastiper. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'jastip_id' => 'required|integer|exists:jastips,id',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'quantity'  => 'required|integer|min:1|max:100',
            'budget'    => 'nullable|numeric|min:0',
            'note'      => 'nullable|string|max:1000',
            'image'     => 'nullable|image|max:5120',
        ]);

        $trip = Jastip::openForRequests()->findOrFail($validated['jastip_id']);

        if ($trip->user_id === $request->user()->id) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Anda tidak bisa mengajukan titipan ke destinasi sendiri.']);
        }

        $imageName = null;
        if ($request->hasFile('image')) {
            $imageName = $request->file('image')->store('jastip-request-images', 'public');
        }

        JastipRequest::create([
            'jastip_id' => $trip->id,
            'user_id'   => $request->user()->id,
            'item_name' => $validated['item_name'],
            'description' => $validated['description'] ?? null,
            'quantity'  => $validated['quantity'],
            'budget'    => $validated['budget'] ?? null,
            'note'      => $validated['note'] ?? null,
            'image_name' => $imageName,
            'status'    => JastipRequest::STATUS_PENDING,
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Request titipan terkirim. Pantau status & penawarannya di halaman profil Anda.',
        ]);
    }

    /**
     * Bayar request yang sudah ditawar — membuat transaksi Midtrans khusus
     * (type: jastip_request) dan mengembalikan Snap token.
     */
    public function pay(Request $request, $id)
    {
        $user = $request->user();

        $req = JastipRequest::with('jastip')
            ->where('user_id', $user->id)
            ->findOrFail($id);

        if ($req->status !== JastipRequest::STATUS_QUOTED) {
            return response()->json(['error' => 'Request ini belum/tidak bisa dibayar.'], 422);
        }

        // Masih ada transaksi berjalan? Pakai ulang snap token-nya bila belum kedaluwarsa.
        if ($req->transaction_id) {
            $existing = DB::table('transactions')->where('id', $req->transaction_id)->first();
            if ($existing && $existing->snap_token && now()->lt($existing->expired_at)) {
                return response()->json([
                    'snap_token'     => $existing->snap_token,
                    'transaction_id' => $existing->id,
                ]);
            }
        }

        // Semua nominal dibulatkan ke integer agar gross_amount = sum(item_details)
        // persis (aturan Midtrans, lihat #12 di checkout jastip).
        $itemPrice = (int) round((float) $req->quoted_item_price);
        $fee       = (int) round((float) $req->quoted_fee);
        $qty       = (int) $req->quantity;
        $totalAmount = $itemPrice * $qty + $fee + self::SERVICE_FEE;

        $transactionId = (string) Str::uuid();

        try {
            DB::transaction(function () use ($transactionId, $user, $totalAmount, $req) {
                DB::table('transactions')->insert([
                    'id'             => $transactionId,
                    'user_id'        => $user->id,
                    'total_amount'   => $totalAmount,
                    'type'           => 'jastip_request',
                    'payment_method' => 'Midtrans',
                    'expired_at'     => now()->addHours(24),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);

                $req->update(['transaction_id' => $transactionId]);
            });
        } catch (\Throwable $e) {
            Log::error('[BARENGIN] Gagal insert transaksi request titipan: ' . $e->getMessage());
            return response()->json(['error' => 'Gagal menyimpan transaksi.'], 500);
        }

        \Midtrans\Config::$serverKey    = config('midtrans.server_key');
        \Midtrans\Config::$isProduction = config('midtrans.is_production', false);
        \Midtrans\Config::$isSanitized  = true;
        \Midtrans\Config::$is3ds        = true;

        $itemDetails = [
            [
                'id'       => 'JREQ-' . $req->id,
                'price'    => $itemPrice,
                'quantity' => $qty,
                'name'     => substr($req->item_name, 0, 50),
            ],
            [
                'id'       => 'JREQ-FEE-' . $req->id,
                'price'    => $fee,
                'quantity' => 1,
                'name'     => 'Biaya Jastip',
            ],
            [
                'id'       => 'SERVICE-FEE',
                'price'    => self::SERVICE_FEE,
                'quantity' => 1,
                'name'     => 'Biaya Layanan',
            ],
        ];

        $params = [
            'transaction_details' => [
                'order_id'     => $transactionId,
                'gross_amount' => $totalAmount,
            ],
            'item_details'     => $itemDetails,
            'customer_details' => [
                'first_name' => $user->full_name ?? $user->name ?? 'Pengguna',
                'email'      => $user->email,
                'phone'      => $user->phone ?? '08000000000',
            ],
        ];

        try {
            $snapToken = \Midtrans\Snap::getSnapToken($params);

            DB::table('transactions')->where('id', $transactionId)->update([
                'snap_token' => $snapToken,
                'updated_at' => now(),
            ]);

            return response()->json([
                'snap_token'     => $snapToken,
                'transaction_id' => $transactionId,
            ]);
        } catch (\Throwable $e) {
            // Rollback bila Midtrans gagal — lepaskan transaksi dari request
            $req->update(['transaction_id' => null]);
            DB::table('transactions')->where('id', $transactionId)->delete();

            Log::error('[BARENGIN] Gagal Snap Token request titipan: ' . $e->getMessage());
            return response()->json([
                'error'  => 'Gagal menghubungi Midtrans.',
                'detail' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /** Batalkan request sendiri (selama belum dibayar). */
    public function cancel(Request $request, $id)
    {
        $req = JastipRequest::where('user_id', $request->user()->id)->findOrFail($id);

        if (! in_array($req->status, [JastipRequest::STATUS_PENDING, JastipRequest::STATUS_QUOTED], true)) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Request ini tidak dapat dibatalkan lagi.']);
        }

        $req->update(['status' => JastipRequest::STATUS_CANCELLED]);

        return back()->with('flash', ['type' => 'success', 'message' => 'Request titipan dibatalkan.']);
    }
}
