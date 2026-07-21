<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\PergiBareng;
use App\Models\SplitBill;
use App\Models\SplitBillShare;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

// Bagi tagihan pergi bareng. Pelunasan share diselesaikan webhook Midtrans,
// lihat MidtransController::applyStatus.
class SplitBillController extends Controller
{
    public function create($pergiBarengId)
    {
        $trip = PergiBareng::with('pergi_bareng_participants.user')
            ->where('initiator_id', Auth::id())
            ->findOrFail($pergiBarengId);

        $members = $this->billableMembers($trip);

        return response()->json([
            'trip' => [
                'id' => $trip->id,
                'name' => $trip->name,
                'is_finished' => $trip->status() === 'finish',
            ],
            'total_people' => $this->totalPeople($trip),
            'members' => $members->values(),
        ]);
    }

    public function store(Request $request, $pergiBarengId)
    {
        $trip = PergiBareng::with('pergi_bareng_participants.user')
            ->where('initiator_id', Auth::id())
            ->findOrFail($pergiBarengId);

        if ($trip->status() !== 'finish') {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Bagi tagihan hanya bisa dibuat setelah pergi bareng selesai.',
            ]);
        }

        if ($trip->split_bills()->exists()) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Tagihan untuk pergi bareng ini sudah pernah dibuat.',
            ]);
        }

        $members = $this->billableMembers($trip);

        if ($members->isEmpty()) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Belum ada anggota lain yang bisa ditagih.',
            ]);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:2000'],
            'shares' => ['required', 'array', 'min:1'],
            'shares.*.user_id' => ['required', 'integer'],
            'shares.*.amount' => ['required', 'integer', 'min:1'],
        ]);

        $allowedIds = $members->pluck('id')->all();
        $rows = collect($data['shares'])
            ->filter(fn ($s) => in_array((int) $s['user_id'], $allowedIds, true))
            ->unique(fn ($s) => (int) $s['user_id'])
            ->values();

        if ($rows->isEmpty()) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Tidak ada anggota valid yang dipilih.',
            ]);
        }

        $bill = DB::transaction(function () use ($trip, $data, $rows) {
            $bill = SplitBill::create([
                'pergi_bareng_id' => $trip->id,
                'creator_id' => Auth::id(),
                'title' => $data['title'],
                'note' => $data['note'] ?? null,
                'total_amount' => $rows->sum(fn ($s) => (int) $s['amount']),
                'status' => 'open',
            ]);

            foreach ($rows as $s) {
                SplitBillShare::create([
                    'split_bill_id' => $bill->id,
                    'user_id' => (int) $s['user_id'],
                    'amount' => (int) $s['amount'],
                    'status' => SplitBillShare::STATUS_UNPAID,
                ]);
            }

            return $bill;
        });

        $conversationId = $this->postBillToGroup($trip, $bill);

        // Diarahkan ke kartu grup: tagihan belum dibayar belum punya transaksi.
        foreach ($bill->shares()->with('user')->get() as $share) {
            \App\Models\UserNotification::send(
                (int) $share->user_id,
                'split_bill.created',
                [
                    'title' => $bill->title,
                    'amount' => (float) $share->amount,
                    'name' => $trip->name,
                ],
                $conversationId ? '/chat/' . $conversationId : '/profile-history?tab=transactions',
                'split_bill.created:share:' . $share->id,
            );
        }

        \App\Models\ActivityLog::record('Membuat bagi tagihan: ' . $bill->title);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Tagihan dikirim ke grup chat pergi bareng.',
        ]);
    }

    // lockForUpdate di bawah: tanpa itu dua klik beruntun sama-sama lolos cek PAID
    // dan bikin baris transactions kembar.
    private function payShareWithWallet($user, SplitBillShare $share, int $amount)
    {
        // Cek longgar di luar kunci; yang mengikat ada di Wallet::debit().
        $wallet = \App\Models\Wallet::forUser((int) $user->id);

        if (! $wallet->hasSufficientBalance($amount)) {
            return response()->json([
                'error' => 'Saldo dompet tidak mencukupi. Silakan isi saldo terlebih dahulu.',
                'balance' => (float) $wallet->balance,
                'required' => (float) $amount,
            ], 422);
        }

        try {
            $transactionId = DB::transaction(function () use ($user, $share, $amount) {
                $locked = SplitBillShare::whereKey($share->id)->lockForUpdate()->first();

                if (! $locked || $locked->status === SplitBillShare::STATUS_PAID) {
                    return null;
                }

                $transactionId = (string) Str::uuid();

                DB::table('transactions')->insert([
                    'id' => $transactionId,
                    'user_id' => $user->id,
                    'total_amount' => $amount,
                    'type' => 'split_bill',
                    'payment_method' => 'Wallet',
                    'expired_at' => now()->addHours(24),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $locked->forceFill([
                    'transaction_id' => $transactionId,
                    'status' => SplitBillShare::STATUS_PENDING,
                ])->save();

                (new \App\Services\WalletPayment())->settle(
                    (int) $user->id,
                    $transactionId,
                    (float) $amount,
                    'Patungan: ' . $share->split_bill->title,
                    'split_bill_share',
                    (int) $share->id,
                );

                return $transactionId;
            });
        } catch (\App\Exceptions\InsufficientBalanceException $e) {
            return response()->json([
                'error' => 'Saldo dompet tidak mencukupi. Kurang Rp' . number_format($e->shortfall(), 0, ',', '.') . '.',
            ], 422);
        }

        if ($transactionId === null) {
            return response()->json(['error' => 'Tagihan ini sudah dibayar.'], 422);
        }

        return response()->json([
            'paid' => true,
            'transaction_id' => $transactionId,
        ]);
    }

    public function pay(Request $request, $shareId)
    {
        $user = $request->user();

        $share = SplitBillShare::with('split_bill.pergi_bareng')->findOrFail($shareId);

        if ((int) $share->user_id !== (int) $user->id) {
            return response()->json(['error' => 'Ini bukan tagihan kamu.'], 403);
        }

        if ($share->status === SplitBillShare::STATUS_PAID) {
            return response()->json(['error' => 'Tagihan ini sudah dibayar.'], 422);
        }

        // Pakai token lama biar tak menumpuk transaksi menggantung di Midtrans.
        if ($share->transaction_id) {
            $existing = DB::table('transactions')->where('id', $share->transaction_id)->first();

            if ($existing && $existing->snap_token && now()->lt($existing->expired_at)) {
                return response()->json([
                    'snap_token' => $existing->snap_token,
                    'transaction_id' => $existing->transaction_id ?? $existing->id,
                ]);
            }
        }

        $amount = (int) round((float) $share->amount);

        $payWithWallet = $request->input('payment_method') === 'wallet';

        if ($payWithWallet) {
            return $this->payShareWithWallet($user, $share, $amount);
        }

        $transactionId = (string) Str::uuid();

        DB::table('transactions')->insert([
            'id' => $transactionId,
            'user_id' => $user->id,
            'total_amount' => $amount,
            'type' => 'split_bill',
            'payment_method' => 'Midtrans',
            'expired_at' => now()->addHours(24),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $share->forceFill([
            'transaction_id' => $transactionId,
            'status' => SplitBillShare::STATUS_PENDING,
        ])->save();

        \Midtrans\Config::$serverKey    = config('midtrans.server_key');
        \Midtrans\Config::$isProduction = config('midtrans.is_production', false);
        \Midtrans\Config::$isSanitized  = true;
        \Midtrans\Config::$is3ds        = true;

        $params = [
            'transaction_details' => [
                'order_id' => $transactionId,
                'gross_amount' => $amount,
            ],
            'item_details' => [[
                'id' => 'SPLITBILL-' . $share->split_bill_id,
                'price' => $amount,
                'quantity' => 1,
                'name' => substr('Patungan: ' . $share->split_bill->title, 0, 50),
            ]],
            'customer_details' => [
                'first_name' => $user->full_name ?? 'Pengguna',
                'email' => $user->email,
                'phone' => $user->phone ?? '08000000000',
            ],
        ];

        try {
            $snapToken = \Midtrans\Snap::getSnapToken($params);

            DB::table('transactions')->where('id', $transactionId)->update([
                'snap_token' => $snapToken,
                'updated_at' => now(),
            ]);

            return response()->json([
                'snap_token' => $snapToken,
                'transaction_id' => $transactionId,
            ]);
        } catch (\Throwable $e) {
            // Batalkan, kalau tidak share-nya tersangkut di 'pending'.
            $share->forceFill([
                'transaction_id' => null,
                'status' => SplitBillShare::STATUS_UNPAID,
            ])->save();

            DB::table('transactions')->where('id', $transactionId)->delete();

            Log::error('[BARENGIN] Gagal Snap Token split bill: ' . $e->getMessage());

            return response()->json([
                'error' => 'Gagal menghubungi Midtrans: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function totalPeople(PergiBareng $trip): int
    {
        return (int) $trip->pergi_bareng_participants->sum('quantity') + 1;
    }

    private function billableMembers(PergiBareng $trip)
    {
        $totalPeople = max(1, $this->totalPeople($trip));

        return $trip->pergi_bareng_participants
            ->filter(fn ($p) => $p->user && (int) $p->user_id !== (int) $trip->initiator_id)
            ->unique('user_id')
            ->map(fn ($p) => [
                'id' => (int) $p->user_id,
                'name' => $p->user->full_name ?? 'Pengguna',
                'avatar' => $p->user->public_profile_image ?? asset('assets/default-profile.png'),
                'quantity' => (int) $p->quantity,
                'share_of' => $totalPeople,
            ])
            ->values();
    }

    // Gelembungnya cuma ringkasan; status lunas dikirim terpisah oleh ChatController.
    private function postBillToGroup(PergiBareng $trip, SplitBill $bill): ?int
    {
        $conversation = Conversation::where('pergi_bareng_id', $trip->id)
            ->where('is_group', true)
            ->first();

        if (! $conversation) {
            return null;
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $bill->creator_id,
            'message_text' => '',
            'reference' => [
                'type' => 'split_bill',
                'id' => (int) $bill->id,
                'title' => $bill->title,
                'subtitle' => $trip->name,
                'url' => null,
            ],
        ]);

        broadcast(new \App\Events\MessageSent($message))->toOthers();

        return (int) $conversation->id;
    }
}
