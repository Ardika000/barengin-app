<?php

namespace App\Http\Controllers;

use App\Models\JastipItem;
use App\Models\JastipRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

// Sisi pembeli fitur Request Titipan. Tiap request terikat ke satu jastip_item.
class JastipRequestController extends Controller
{
    // Public supaya ProfileHistoryController tak perlu menyalin angkanya.
    public const SERVICE_FEE = 5000;

    // Satu kartu = satu "trip" jastiper, id-nya jastip_item perwakilan.
    public function browse(Request $request)
    {
        $trips = JastipItem::query()
            ->join('users', 'users.id', '=', 'jastip_items.user_id')
            ->openForRequests()
            ->groupBy(
                'jastip_items.user_id', 'users.full_name', 'users.username', 'users.profile_image',
                'jastip_items.purchase_province', 'jastip_items.purchase_city',
                'jastip_items.pickup_province', 'jastip_items.pickup_city', 'jastip_items.end_date',
            )
            ->selectRaw(
                'MIN(jastip_items.id) as id, jastip_items.user_id,
                 users.full_name, users.username, users.profile_image,
                 jastip_items.purchase_province, jastip_items.purchase_city,
                 jastip_items.pickup_province, jastip_items.pickup_city,
                 jastip_items.end_date, COUNT(*) as item_count'
            )
            ->orderBy('jastip_items.end_date')
            ->paginate(9)
            ->withQueryString();

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
                'destination_city' => $trip->purchase_city ?: $trip->purchase_province,
                'origin_city'      => $trip->pickup_city ?: $trip->pickup_province,
                'deadline_label'   => optional($trip->end_date ? \Carbon\Carbon::parse($trip->end_date) : null)?->translatedFormat('d M Y'),
                'item_count'       => (int) $trip->item_count,
                'jastiper'         => [
                    'id'       => $trip->user_id,
                    'name'     => $trip->full_name,
                    'username' => $trip->username,
                    'avatar'   => $this->resolveAvatarUrl($trip->profile_image),
                    'rating'   => $rating ? round((float) $rating->avg_rating, 1) : null,
                    'reviews'  => $rating ? (int) $rating->cnt : 0,
                ],
            ];
        });

        return Inertia::render('Jastip/Requests/Browse', ['trips' => $trips]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'jastip_item_id' => 'required|integer|exists:jastip_items,id',
            'item_name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'quantity'  => 'required|integer|min:1|max:100',
            'budget'    => 'nullable|numeric|min:0',
            'note'      => 'nullable|string|max:1000',
            'image'     => 'nullable|image|max:5120',
        ]);

        $item = JastipItem::openForRequests()->findOrFail($validated['jastip_item_id']);

        if ($item->user_id === $request->user()->id) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Anda tidak bisa mengajukan titipan ke jastip milik sendiri.']);
        }

        $imageName = null;
        if ($request->hasFile('image')) {
            $imageName = $request->file('image')->store('jastip-request-images', 'public');
        }

        $req = JastipRequest::create([
            'jastip_item_id' => $item->id,
            'user_id'   => $request->user()->id,
            'item_name' => $validated['item_name'],
            'description' => $validated['description'] ?? null,
            'quantity'  => $validated['quantity'],
            'budget'    => $validated['budget'] ?? null,
            'note'      => $validated['note'] ?? null,
            'image_name' => $imageName,
            'status'    => JastipRequest::STATUS_PENDING,
        ]);

        \App\Models\UserNotification::send(
            (int) $item->user_id,
            'selling.request_received',
            [
                'name' => $req->item_name,
                'requester' => $request->user()->full_name,
                'quantity' => (int) $req->quantity,
            ],
            '/admin/jastip/requests',
            'selling.request_received:req:' . $req->id,
        );

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Request titipan terkirim. Pantau status & penawarannya di halaman profil Anda.',
        ]);
    }

    public function pay(Request $request, $id)
    {
        $user = $request->user();

        $req = JastipRequest::where('user_id', $user->id)->findOrFail($id);

        if ($req->status !== JastipRequest::STATUS_QUOTED) {
            return response()->json(['error' => 'Request ini belum/tidak bisa dibayar.'], 422);
        }

        $payWithWallet = $request->input('payment_method') === 'wallet';

        // Pakai ulang snap token yang belum kedaluwarsa.
        if (! $payWithWallet && $req->transaction_id) {
            $existing = DB::table('transactions')->where('id', $req->transaction_id)->first();
            if ($existing && $existing->snap_token && now()->lt($existing->expired_at)) {
                return response()->json([
                    'snap_token'     => $existing->snap_token,
                    'transaction_id' => $existing->id,
                ]);
            }
        }

        // Dibulatkan ke integer, kalau tidak gross_amount != sum(item_details).
        $itemPrice = (int) round((float) $req->quoted_item_price);
        $fee       = (int) round((float) $req->quoted_fee);
        $qty       = (int) $req->quantity;
        $totalAmount = $itemPrice * $qty + $fee + self::SERVICE_FEE;

        // Dikunci karena dua klik beruntun sama-sama lolos cek QUOTED di atas dan
        // menyisakan transaksi kembar. Aman ditahan di sini: jalur saldo tidak
        // memanggil layanan luar, beda dengan jalur Midtrans di bawah.
        if ($payWithWallet) {
            $wallet = \App\Models\Wallet::forUser((int) $user->id);
            if (! $wallet->hasSufficientBalance($totalAmount)) {
                return response()->json([
                    'error' => 'Saldo dompet tidak mencukupi. Silakan isi saldo terlebih dahulu.',
                    'balance' => (float) $wallet->balance,
                    'required' => (float) $totalAmount,
                ], 422);
            }

            try {
                $transactionId = DB::transaction(function () use ($user, $req, $totalAmount) {
                    $locked = JastipRequest::whereKey($req->id)->lockForUpdate()->first();

                    if (! $locked || $locked->status !== JastipRequest::STATUS_QUOTED) {
                        return null;
                    }

                    $transactionId = (string) Str::uuid();

                    DB::table('transactions')->insert([
                        'id'             => $transactionId,
                        'user_id'        => $user->id,
                        'total_amount'   => $totalAmount,
                        'type'           => 'jastip_request',
                        'payment_method' => 'Wallet',
                        'expired_at'     => now()->addHours(24),
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);

                    $locked->update(['transaction_id' => $transactionId]);

                    (new \App\Services\WalletPayment())->settle(
                        (int) $user->id,
                        $transactionId,
                        (float) $totalAmount,
                        'Titipan: ' . $req->item_name,
                        'jastip_request',
                        (int) $req->id,
                    );

                    return $transactionId;
                });
            } catch (\App\Exceptions\InsufficientBalanceException $e) {
                // Rollback DB sudah bersihkan baris transaksi & pointer-nya.
                return response()->json([
                    'error' => 'Saldo dompet tidak mencukupi. Kurang Rp' . number_format($e->shortfall(), 0, ',', '.') . '.',
                ], 422);
            } catch (\Throwable $e) {
                Log::error('[BARENGIN] Gagal melunasi request titipan dari saldo: ' . $e->getMessage());
                return response()->json(['error' => 'Gagal menyimpan transaksi.'], 500);
            }

            if ($transactionId === null) {
                return response()->json(['error' => 'Request ini belum/tidak bisa dibayar.'], 422);
            }

            return response()->json([
                'paid'           => true,
                'transaction_id' => $transactionId,
            ]);
        }

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
            $req->update(['transaction_id' => null]);
            DB::table('transactions')->where('id', $transactionId)->delete();

            Log::error('[BARENGIN] Gagal Snap Token request titipan: ' . $e->getMessage());
            return response()->json([
                'error'  => 'Gagal menghubungi Midtrans.',
                'detail' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

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
