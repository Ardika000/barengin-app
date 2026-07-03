<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\FinancingEstimate;
use App\Models\PergiBareng;
use App\Models\PergiBarengParticipant;
use App\Models\PergiBarengRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminPergiBarengController extends Controller
{
    /** Pilihan transportasi sesuai enum di migrasi pergi_barengs */
    private const TRANSPORTATIONS = [
        'Mobil Pribadi',
        'Transportasi Online',
        'Transportasi Umum',
        'Sewa Mobil',
    ];

    /** Kode pendek untuk ditampilkan di tabel */
    private function shortCode($id): string
    {
        return '#' . strtoupper(substr(md5('pergi-bareng-' . $id), 0, 5));
    }

    public function index(Request $request)
    {
        $trips = PergiBareng::with(['pergi_bareng_participants', 'pergi_bareng_requests'])
            ->where('initiator_id', Auth::id())
            ->orderByDesc('created_at') // "Terbaru" = waktu dibuat, bukan tanggal trip
            ->orderByDesc('id')         // tie-break agar yang terbaru dibuat selalu di atas
            ->get()
            ->map(function ($trip) {
                $joined = (int) $trip->pergi_bareng_participants->sum('quantity');
                $date = $trip->time_appointment;

                return [
                    'id' => $trip->id,
                    'code' => $this->shortCode($trip->id),
                    'name' => $trip->name,
                    'destination' => $trip->destination_loc,
                    'departure' => $trip->departure_loc,
                    'image' => $trip->img_name ? '/storage/' . $trip->img_name : '/assets/pergi-bareng/PergiBarengHeader.avif',
                    'date_label' => $date->translatedFormat('d M Y'),
                    'time_label' => $date->format('H:i'),
                    'joined' => $joined,
                    'capacity' => $trip->people_amount,
                    'status' => $date->isFuture() ? 'aktif' : 'selesai',
                    'pending_requests' => $trip->pergi_bareng_requests->count(),
                ];
            });

        return Inertia::render('Admin/PergiBareng/Index', [
            'trips' => $trips,
        ]);
    }

    public function analytics()
    {
        $trips = PergiBareng::with('pergi_bareng_participants')
            ->where('initiator_id', Auth::id())
            ->get();

        $totalParticipants = (int) $trips->sum(fn ($t) => $t->pergi_bareng_participants->sum('quantity'));
        $totalCapacity = (int) $trips->sum('people_amount');

        $stats = [
            'total_trips' => $trips->count(),
            'active_trips' => $trips->filter(fn ($t) => $t->time_appointment->isFuture())->count(),
            'total_participants' => $totalParticipants,
            'fill_rate' => $totalCapacity > 0 ? round($totalParticipants / $totalCapacity * 100) : 0,
        ];

        $topRoutes = $trips
            ->map(function ($t) {
                $joined = (int) $t->pergi_bareng_participants->sum('quantity');
                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'route' => $t->departure_loc . ' → ' . $t->destination_loc,
                    'transportation' => $t->transportation,
                    'joined' => $joined,
                    'capacity' => $t->people_amount,
                ];
            })
            ->sortByDesc('joined')
            ->take(5)
            ->values();

        return Inertia::render('Admin/PergiBareng/Analytics', [
            'stats' => $stats,
            'topRoutes' => $topRoutes,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/PergiBareng/Create', [
            'transportations' => self::TRANSPORTATIONS,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'date' => 'required|date|after_or_equal:today',
            'time' => 'required|string',
            'transportation' => 'required|in:' . implode(',', self::TRANSPORTATIONS),
            'people_amount' => 'required|integer|min:1|max:100',
            'departure_loc' => 'required|string|max:500',
            'destination_loc' => 'required|string|max:500',
            'image' => 'nullable|image|max:4096',
            'financing_estimates' => 'nullable|array',
            'financing_estimates.*' => 'nullable|string|max:255',
        ], [
            'date.after_or_equal' => 'Tanggal keberangkatan tidak boleh di masa lalu.',
        ]);

        // Waktu keberangkatan wajib di masa depan agar tampil di halaman Pergi Bareng publik
        $appointment = Carbon::parse($validated['date'] . ' ' . $validated['time']);
        if ($appointment->isPast()) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'time' => 'Waktu keberangkatan harus di masa depan.',
            ]);
        }

        $imgName = null;
        if ($request->hasFile('image')) {
            // Simpan ke storage/app/public/pergi-bareng -> diakses via /storage/...
            $imgName = $request->file('image')->store('pergi-bareng', 'public');
        }

        $trip = DB::transaction(function () use ($validated, $imgName, $appointment) {
            $trip = PergiBareng::create([
                'initiator_id' => Auth::id(),
                'name' => $validated['name'],
                'description' => $validated['description'],
                'time_appointment' => $appointment,
                'transportation' => $validated['transportation'],
                'people_amount' => $validated['people_amount'],
                'departure_loc' => $validated['departure_loc'],
                'destination_loc' => $validated['destination_loc'],
                'img_name' => $imgName,
            ]);

            foreach ($validated['financing_estimates'] ?? [] as $name) {
                $name = trim((string) $name);
                if ($name !== '') {
                    FinancingEstimate::create([
                        'pergi_bareng_id' => $trip->id,
                        'name' => $name,
                    ]);
                }
            }

            return $trip;
        });

        \App\Models\ActivityLog::record('Membuat pergi bareng: ' . $trip->name);

        return redirect()->route('admin.pergi-bareng.index')
            ->with('flash', ['type' => 'success', 'message' => 'Pergi bareng "' . $trip->name . '" berhasil dibuat.']);
    }

    public function destroy($id)
    {
        $trip = PergiBareng::where('initiator_id', Auth::id())->findOrFail($id);
        $tripName = $trip->name;
        $trip->delete();

        \App\Models\ActivityLog::record('Menghapus pergi bareng: ' . $tripName);

        return back()->with('flash', ['type' => 'success', 'message' => 'Pergi bareng berhasil dihapus.']);
    }

    public function requests($id)
    {
        $trip = PergiBareng::with(['pergi_bareng_participants', 'pergi_bareng_requests.user'])
            ->where('initiator_id', Auth::id())
            ->findOrFail($id);

        $joined = (int) $trip->pergi_bareng_participants->sum('quantity');

        $requests = $trip->pergi_bareng_requests->map(fn ($req) => [
            'id' => $req->id,
            'quantity' => (int) $req->quantity,
            'requested_at' => $req->created_at?->translatedFormat('d M Y, H:i'),
            'user' => [
                'id' => $req->user?->id,
                'name' => $req->user?->full_name ?? 'Pengguna',
                'username' => $req->user?->username,
                'avatar' => $req->user?->public_profile_image ?? '/assets/default-profile.png',
            ],
        ])->values();

        return Inertia::render('Admin/PergiBareng/Requests', [
            'trip' => [
                'id' => $trip->id,
                'code' => $this->shortCode($trip->id),
                'name' => $trip->name,
                'destination' => $trip->destination_loc,
                'joined' => $joined,
                'capacity' => $trip->people_amount,
                'remaining' => max(0, $trip->people_amount - $joined),
            ],
            'requests' => $requests,
        ]);
    }

    public function approve($id, $requestId)
    {
        $trip = PergiBareng::with('pergi_bareng_participants')
            ->where('initiator_id', Auth::id())
            ->findOrFail($id);

        $req = PergiBarengRequest::where('pergi_bareng_id', $trip->id)->findOrFail($requestId);

        $joined = (int) $trip->pergi_bareng_participants->sum('quantity');
        if ($joined + (int) $req->quantity > $trip->people_amount) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Kuota tidak cukup untuk menyetujui permintaan ini.',
            ]);
        }

        DB::transaction(function () use ($trip, $req) {
            PergiBarengParticipant::create([
                'pergi_bareng_id' => $trip->id,
                'user_id' => $req->user_id,
                'quantity' => $req->quantity,
            ]);
            $req->delete();
        });

        // Undang user ke grup chat pergi bareng
        $this->ensureGroupAndAttach($trip, $req->user_id);

        \App\Models\ActivityLog::record('Menyetujui permintaan pergi bareng: ' . $trip->name);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Permintaan disetujui & pengguna ditambahkan ke grup chat.',
        ]);
    }

    public function reject($id, $requestId)
    {
        $trip = PergiBareng::where('initiator_id', Auth::id())->findOrFail($id);

        PergiBarengRequest::where('pergi_bareng_id', $trip->id)
            ->where('id', $requestId)
            ->delete();

        \App\Models\ActivityLog::record('Menolak permintaan pergi bareng: ' . $trip->name);

        return back()->with('flash', ['type' => 'info', 'message' => 'Permintaan ditolak.']);
    }

    /**
     * Pastikan grup chat pergi bareng ada lalu masukkan user (beserta penyelenggara).
     */
    private function ensureGroupAndAttach(PergiBareng $trip, $userId): void
    {
        $conversation = Conversation::firstOrCreate(
            ['pergi_bareng_id' => $trip->id, 'is_group' => true],
            ['trip_id' => null],
        );

        $memberIds = collect([$userId, $trip->initiator_id])->filter()->unique();
        $existingIds = $conversation->participants()->pluck('users.id');

        foreach ($memberIds->diff($existingIds) as $uid) {
            $conversation->participants()->attach($uid, ['last_read_at' => now()]);
        }
    }
}
