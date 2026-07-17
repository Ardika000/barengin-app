<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\JastipItem;
use App\Models\JastipRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Permintaan titipan (request barang di luar katalog) yang masuk ke jastip
 * milik jastiper. Aksi: beri penawaran (quote) atau tolak.
 */
class AdminJastipRequestController extends Controller
{
    public function requests(Request $request)
    {
        $status = (string) $request->query('status', 'all');
        $itemId = (int) $request->query('item_id', 0);

        $query = JastipRequest::query()
            ->whereHas('jastipItem', fn ($q) => $q->where('user_id', Auth::id()))
            ->with(['jastipItem', 'user'])
            ->latest();

        if ($status !== 'all') {
            $query->where('status', $status);
        }
        if ($itemId > 0) {
            $query->where('jastip_item_id', $itemId);
        }

        $requests = $query->paginate(10)->withQueryString()
            ->through(fn ($req) => [
                'id'          => $req->id,
                'item_name'   => $req->item_name,
                'description' => $req->description,
                'quantity'    => (int) $req->quantity,
                'budget'      => $req->budget !== null ? (float) $req->budget : null,
                'note'        => $req->note,
                'image'       => $req->image_name ? $this->resolveStoredImage($req->image_name) : null,
                'status'      => $req->status,
                'quoted_item_price' => $req->quoted_item_price !== null ? (float) $req->quoted_item_price : null,
                'quoted_fee'  => $req->quoted_fee !== null ? (float) $req->quoted_fee : null,
                'quoted_total' => $req->status !== JastipRequest::STATUS_PENDING ? $req->quotedTotal() : null,
                'created_label' => $req->created_at->translatedFormat('d M Y'),
                // Destinasi = lokasi pembelian; pengambilan = lokasi ambil pada item
                'destination' => $req->jastipItem?->purchase_city ?: $req->jastipItem?->purchase_province,
                'context_item' => $req->jastipItem?->name,
                'requester'   => [
                    'id'       => $req->user?->id,
                    'name'     => $req->user?->full_name,
                    'username' => $req->user?->username,
                    'avatar'   => $this->resolveAvatarUrl($req->user?->profile_image),
                ],
            ]);

        // Opsi filter: jastip milik jastiper yang menerima request titipan
        $itemOptions = JastipItem::where('user_id', Auth::id())
            ->where('allow_requests', true)
            ->orderByDesc('created_at')
            ->get(['id', 'name'])
            ->map(fn ($i) => ['id' => $i->id, 'label' => $i->name]);

        return Inertia::render('Admin/Jastip/Requests', [
            'requests' => $requests,
            'item_options' => $itemOptions,
            'filters' => ['status' => $status, 'item_id' => $itemId ?: null],
        ]);
    }

    /** Beri penawaran harga (barang + biaya jastip) untuk request pending. */
    public function quote(Request $request, $id)
    {
        $req = JastipRequest::whereHas('jastipItem', fn ($q) => $q->where('user_id', Auth::id()))
            ->findOrFail($id);

        if ($req->status !== JastipRequest::STATUS_PENDING) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Hanya request yang menunggu penawaran yang bisa ditawar.']);
        }

        $validated = $request->validate([
            'quoted_item_price' => 'required|numeric|min:0',
            'quoted_fee'        => 'required|numeric|min:0',
        ]);

        $req->update([
            'quoted_item_price' => $validated['quoted_item_price'],
            'quoted_fee'        => $validated['quoted_fee'],
            'status'            => JastipRequest::STATUS_QUOTED,
            'quoted_at'         => now(),
        ]);

        // Tanpa ini pemohon tidak punya cara tahu penawarannya sudah masuk selain
        // mengecek halaman profilnya sendiri berulang kali.
        \App\Models\UserNotification::send(
            (int) $req->user_id,
            'jastip_request.quoted',
            [
                'name' => $req->item_name,
                'amount' => (float) ($validated['quoted_item_price'] + $validated['quoted_fee']),
            ],
            '/profile-history?tab=requests',
            'jastip_request.quoted:req:' . $req->id,
        );

        ActivityLog::record('Memberi penawaran request titipan: ' . $req->item_name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Penawaran terkirim. Pemohon dapat membayar dari halaman profilnya.']);
    }

    public function reject($id)
    {
        $req = JastipRequest::whereHas('jastipItem', fn ($q) => $q->where('user_id', Auth::id()))
            ->findOrFail($id);

        // Request yang sudah dibayar tidak bisa ditolak
        if (! in_array($req->status, [JastipRequest::STATUS_PENDING, JastipRequest::STATUS_QUOTED], true)) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Request ini tidak dapat ditolak lagi.']);
        }

        $req->update(['status' => JastipRequest::STATUS_REJECTED]);

        \App\Models\UserNotification::send(
            (int) $req->user_id,
            'jastip_request.rejected',
            ['name' => $req->item_name],
            '/profile-history?tab=requests',
            'jastip_request.rejected:req:' . $req->id,
        );

        ActivityLog::record('Menolak request titipan: ' . $req->item_name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Request titipan ditolak.']);
    }
}
