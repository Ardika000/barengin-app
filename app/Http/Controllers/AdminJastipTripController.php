<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Jastip;
use App\Models\JastipRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Destinasi Jastip (tabel jastips) + permintaan titipan yang masuk.
 * Jastiper mendata tempat yang akan ia kunjungi; tiap destinasi bisa
 * membuka/menutup "Request Titipan" dari pembeli.
 */
class AdminJastipTripController extends Controller
{
    // ── Destinasi ────────────────────────────────────────────────────────

    public function index()
    {
        $trips = Jastip::query()
            ->where('user_id', Auth::id())
            ->withCount([
                'jastip_requests as pending_requests_count' => fn ($q) => $q->where('status', JastipRequest::STATUS_PENDING),
            ])
            ->orderByDesc('end_date')
            ->paginate(10)
            ->withQueryString()
            ->through(fn ($trip) => [
                'id'               => $trip->id,
                'title'            => $trip->title,
                'origin_city'      => $trip->origin_city,
                'destination_city' => $trip->destination_city,
                'pickup_location'  => $trip->pickup_location,
                'start_date'       => optional($trip->start_date)->format('Y-m-d'),
                'end_date'         => optional($trip->end_date)->format('Y-m-d'),
                'window_label'     => optional($trip->start_date)->translatedFormat('d M Y')
                    . ' – ' . optional($trip->end_date)->translatedFormat('d M Y'),
                'allow_requests'   => (bool) $trip->allow_requests,
                'is_open'          => $trip->allow_requests && $trip->end_date && Carbon::today()->lte($trip->end_date),
                'pending_requests' => (int) $trip->pending_requests_count,
            ]);

        return Inertia::render('Admin/Jastip/Trips', ['trips' => $trips]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateTrip($request);

        $trip = Jastip::create([...$validated, 'user_id' => Auth::id()]);

        ActivityLog::record('Membuat destinasi jastip: ' . $trip->destination_city);

        return back()->with('flash', ['type' => 'success', 'message' => 'Destinasi jastip berhasil dibuat.']);
    }

    public function update(Request $request, $id)
    {
        $trip = Jastip::where('user_id', Auth::id())->findOrFail($id);

        $trip->update($this->validateTrip($request));

        ActivityLog::record('Memperbarui destinasi jastip: ' . $trip->destination_city);

        return back()->with('flash', ['type' => 'success', 'message' => 'Destinasi jastip berhasil diperbarui.']);
    }

    public function destroy($id)
    {
        $trip = Jastip::where('user_id', Auth::id())->findOrFail($id);

        // Request yang sudah ditawar/dibayar tidak boleh ikut terhapus (cascade)
        $hasActive = $trip->jastip_requests()
            ->whereIn('status', [JastipRequest::STATUS_QUOTED, JastipRequest::STATUS_PAID])
            ->exists();
        if ($hasActive) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Destinasi tidak dapat dihapus karena masih ada request yang ditawar atau sudah dibayar.',
            ]);
        }

        $name = $trip->destination_city;
        $trip->delete();

        ActivityLog::record('Menghapus destinasi jastip: ' . $name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Destinasi jastip berhasil dihapus.']);
    }

    private function validateTrip(Request $request): array
    {
        return $request->validate([
            'title'            => 'nullable|string|max:255',
            'origin_city'      => 'required|string|max:255',
            'destination_city' => 'required|string|max:255',
            'pickup_location'  => 'nullable|string|max:500',
            'start_date'       => 'required|date',
            'end_date'         => 'required|date|after_or_equal:start_date',
            'allow_requests'   => 'boolean',
        ]);
    }

    // ── Permintaan titipan masuk ─────────────────────────────────────────

    public function requests(Request $request)
    {
        $status = (string) $request->query('status', 'all');
        $tripId = (int) $request->query('trip_id', 0);

        $query = JastipRequest::query()
            ->whereHas('jastip', fn ($q) => $q->where('user_id', Auth::id()))
            ->with(['jastip', 'user'])
            ->latest();

        if ($status !== 'all') {
            $query->where('status', $status);
        }
        if ($tripId > 0) {
            $query->where('jastip_id', $tripId);
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
                'destination' => $req->jastip?->destination_city,
                'trip_id'     => $req->jastip_id,
                'requester'   => [
                    'id'       => $req->user?->id,
                    'name'     => $req->user?->full_name,
                    'username' => $req->user?->username,
                    'avatar'   => $this->resolveAvatarUrl($req->user?->profile_image),
                ],
            ]);

        // Opsi filter destinasi milik jastiper
        $tripOptions = Jastip::where('user_id', Auth::id())
            ->orderByDesc('end_date')
            ->get(['id', 'title', 'destination_city'])
            ->map(fn ($t) => ['id' => $t->id, 'label' => $t->title ?: $t->destination_city]);

        return Inertia::render('Admin/Jastip/Requests', [
            'requests' => $requests,
            'trip_options' => $tripOptions,
            'filters' => ['status' => $status, 'trip_id' => $tripId ?: null],
        ]);
    }

    /** Beri penawaran harga (barang + biaya jastip) untuk request pending. */
    public function quote(Request $request, $id)
    {
        $req = JastipRequest::whereHas('jastip', fn ($q) => $q->where('user_id', Auth::id()))
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

        ActivityLog::record('Memberi penawaran request titipan: ' . $req->item_name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Penawaran terkirim. Pemohon dapat membayar dari halaman profilnya.']);
    }

    public function reject($id)
    {
        $req = JastipRequest::whereHas('jastip', fn ($q) => $q->where('user_id', Auth::id()))
            ->findOrFail($id);

        // Request yang sudah dibayar tidak bisa ditolak
        if (! in_array($req->status, [JastipRequest::STATUS_PENDING, JastipRequest::STATUS_QUOTED], true)) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Request ini tidak dapat ditolak lagi.']);
        }

        $req->update(['status' => JastipRequest::STATUS_REJECTED]);

        ActivityLog::record('Menolak request titipan: ' . $req->item_name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Request titipan ditolak.']);
    }
}
