<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\FinancingEstimate;
use App\Models\PergiBareng;
use App\Models\PergiBarengParticipant;
use App\Models\PergiBarengRequest;
use App\Support\FuzzySearch;
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

    /** Resolusi gambar pergi bareng (samakan dengan halaman front). */
    private function resolvePergiImage(?string $path): string
    {
        return $this->resolveStoredImage($path);
    }

    /**
     * Status untuk tabel manajemen. PergiBareng::status() memakai kosakata
     * 'will_start', sedangkan halaman ini (dan Riwayat Jalan Bareng) memakai
     * 'waiting' untuk keadaan yang sama.
     */
    private function statusOf(PergiBareng $trip): string
    {
        return $trip->status() === 'will_start' ? 'waiting' : $trip->status();
    }

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $sort   = (string) $request->query('sort', 'latest');

        // Total peserta (sum quantity) sebagai subquery agar bisa di-sort di server
        $joinedSub = DB::table('pergi_bareng_participants')
            ->groupBy('pergi_bareng_id')
            ->select('pergi_bareng_id', DB::raw('COALESCE(SUM(quantity),0) as joined'));

        $query = PergiBareng::query()
            ->leftJoinSub($joinedSub, 'p', 'p.pergi_bareng_id', '=', 'pergi_barengs.id')
            ->where('pergi_barengs.initiator_id', Auth::id())
            ->withCount('pergi_bareng_requests')
            ->select('pergi_barengs.*', DB::raw('COALESCE(p.joined,0) as joined_count'));

        if ($search !== '') {
            FuzzySearch::apply(
                $query,
                $search,
                ['pergi_barengs.name', 'pergi_barengs.destination_loc', 'pergi_barengs.departure_loc'],
                'pergi_barengs.id',
            );
        }

        match ($sort) {
            'seats'  => $query->orderByDesc('joined_count'),
            // "status": waiting (jadwal terjauh) → finish (paling lampau)
            'status' => $query->orderByDesc('pergi_barengs.time_appointment'),
            default  => $query->orderByDesc('pergi_barengs.created_at')->orderByDesc('pergi_barengs.id'),
        };

        $trips = $query->paginate(10)->withQueryString()
            ->through(function ($trip) {
                $date = $trip->time_appointment;

                // Status selaras dengan Riwayat "Jalan Bareng" (ProfileHistory):
                // waiting (belum mulai) | ongoing (hari-H) | finish (sudah lewat
                // atau diselesaikan manual oleh penyelenggara).
                $status = $this->statusOf($trip);

                return [
                    'id' => $trip->id,
                    'code' => $this->shortCode($trip->id),
                    'name' => $trip->name,
                    'destination' => $trip->destination_loc,
                    'departure' => $trip->departure_loc,
                    'image' => $this->resolvePergiImage($trip->img_name),
                    'date_label' => $date->translatedFormat('d M Y'),
                    'time_label' => $date->format('H:i'),
                    'joined' => (int) $trip->joined_count,
                    'capacity' => $trip->people_amount,
                    'status' => $status,
                    'pending_requests' => (int) $trip->pergi_bareng_requests_count,
                ];
            });

        return Inertia::render('Admin/PergiBareng/Index', [
            'trips' => $trips,
            'ongoing' => $this->ongoingTrips(),
            'filters' => ['search' => $search, 'sort' => $sort],
        ]);
    }

    /**
     * Pergi bareng yang sedang berlangsung milik penyelenggara — ditampilkan
     * sebagai seksi tersendiri di atas tabel agar tombol "Selesaikan" mudah
     * dijangkau. Berlangsung = hari janji adalah hari ini & belum diselesaikan.
     */
    private function ongoingTrips()
    {
        return PergiBareng::query()
            ->where('initiator_id', Auth::id())
            ->whereNull('finished_at')
            ->whereDate('time_appointment', Carbon::today())
            ->withSum('pergi_bareng_participants as joined_count', 'quantity')
            ->orderBy('time_appointment')
            ->get()
            ->map(fn ($trip) => [
                'id' => $trip->id,
                'code' => $this->shortCode($trip->id),
                'name' => $trip->name,
                'destination' => $trip->destination_loc,
                'departure' => $trip->departure_loc,
                'image' => $this->resolvePergiImage($trip->img_name),
                'date_label' => $trip->time_appointment->translatedFormat('d M Y'),
                'time_label' => $trip->time_appointment->format('H:i'),
                'joined' => (int) ($trip->joined_count ?? 0),
                'capacity' => $trip->people_amount,
            ])
            ->values();
    }

    /**
     * Selesaikan pergi bareng lebih cepat dari waktu janji. Hanya penyelenggara,
     * dan hanya saat sedang berlangsung — yang belum mulai tidak bisa diselesaikan.
     */
    public function finish($id)
    {
        $trip = PergiBareng::where('initiator_id', Auth::id())->findOrFail($id);

        if ($trip->finished_at) {
            return back()->with('flash', [
                'type' => 'info',
                'message' => 'Pergi bareng ini sudah selesai.',
            ]);
        }

        if ($trip->status() !== 'ongoing') {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Hanya pergi bareng yang sedang berlangsung yang bisa diselesaikan.',
            ]);
        }

        $trip->forceFill(['finished_at' => now()])->save();

        \App\Models\ActivityLog::record('Menyelesaikan pergi bareng: ' . $trip->name);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Pergi bareng "' . $trip->name . '" ditandai selesai. Kamu sekarang bisa membagi tagihan ke anggota.',
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
            'rating' => $this->accountRating(Auth::id(), 'pergi_bareng'),
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
            'description' => 'nullable|string',
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
                'description' => $validated['description'] ?? null,
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

        // Buat grup chat langsung saat dibuat (penyelenggara jadi anggota pertama).
        (new \App\Services\Chat\GroupConversationService())->ensurePergiBarengGroup($trip->id, $trip->initiator_id);

        return redirect()->route('admin.pergi-bareng.index')
            ->with('flash', ['type' => 'success', 'message' => 'Pergi bareng "' . $trip->name . '" berhasil dibuat.']);
    }

    // #14: Buka ulang pergi bareng yang sudah selesai → tampilkan form buat baru
    // dengan data ter-isi (kecuali tanggal & waktu yang dikosongkan).
    public function reopen($id)
    {
        $trip = PergiBareng::with('financing_estimate')
            ->where('initiator_id', Auth::id())
            ->findOrFail($id);

        // Hanya yang berstatus "selesai" (waktu janji sudah lewat) yang bisa dibuka ulang
        $isFinished = Carbon::now()->gt($trip->time_appointment->copy()->endOfDay());
        if (! $isFinished) {
            return redirect()->route('admin.pergi-bareng.index')->with('flash', [
                'type' => 'info',
                'message' => 'Hanya pergi bareng yang sudah selesai yang dapat dibuka ulang.',
            ]);
        }

        return Inertia::render('Admin/PergiBareng/Create', [
            'transportations' => self::TRANSPORTATIONS,
            'prefill' => [
                'name'                => $trip->name,
                'destination_loc'     => $trip->destination_loc,
                'departure_loc'       => $trip->departure_loc,
                'transportation'      => $trip->transportation,
                'description'         => $trip->description,
                'people_amount'       => (string) $trip->people_amount,
                'financing_estimates' => $trip->financing_estimate->pluck('name')->filter()->values()->all() ?: [''],
            ],
        ]);
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

        \App\Models\UserNotification::send(
            (int) $req->user_id,
            'pergi_bareng.approved',
            ['name' => $trip->name],
            '/pergi-bareng/' . $trip->id,
            'pergi_bareng.approved:req:' . $req->id,
        );

        \App\Models\ActivityLog::record('Menyetujui permintaan pergi bareng: ' . $trip->name);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Permintaan disetujui & pengguna ditambahkan ke grup chat.',
        ]);
    }

    public function reject($id, $requestId)
    {
        $trip = PergiBareng::where('initiator_id', Auth::id())->findOrFail($id);

        // Pemohon dibaca sebelum dihapus — sesudahnya tidak ada lagi yang bisa
        // memberi tahu siapa yang harus dikabari.
        $req = PergiBarengRequest::where('pergi_bareng_id', $trip->id)
            ->where('id', $requestId)
            ->first();

        PergiBarengRequest::where('pergi_bareng_id', $trip->id)
            ->where('id', $requestId)
            ->delete();

        if ($req) {
            \App\Models\UserNotification::send(
                (int) $req->user_id,
                'pergi_bareng.rejected',
                ['name' => $trip->name],
                '/pergi-bareng/' . $trip->id,
                'pergi_bareng.rejected:req:' . $req->id,
            );
        }

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

            // Hanya anggota yang benar-benar baru masuk yang dikabari — diff()
            // di atas sudah menyaring yang sudah tergabung. Penyelenggara ikut
            // ter-attach di sini, tapi dia tidak perlu diberi tahu soal grupnya
            // sendiri.
            if ((int) $uid !== (int) $trip->initiator_id) {
                \App\Models\UserNotification::send(
                    (int) $uid,
                    'group.joined',
                    ['name' => $trip->name, 'kind' => 'pergi_bareng'],
                    '/chat?conversation=' . $conversation->id,
                    'group.joined:conv:' . $conversation->id . ':user:' . $uid,
                );
            }
        }
    }
}
