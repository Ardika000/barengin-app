<?php

namespace App\Http\Controllers;

use App\Models\Facility;
use App\Models\ImageActivity;
use App\Models\Trip;
use App\Models\TripActivity;
use App\Models\TripHistory;
use App\Support\FuzzySearch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminTripController extends Controller
{

    public function index(Request $request)
    {
        Trip::refreshStatuses();

        $search = trim((string) $request->query('search', ''));
        $sort   = (string) $request->query('sort', 'latest');

        // Subquery kursi terisi biar bisa di-sort & dipaginasi di server; hanya run aktif.
        $joinedSub = DB::table('trip_orders')
            ->join('trips as jt', 'jt.id', '=', 'trip_orders.trip_id')
            ->where('trip_orders.order_status', 'paid')
            ->whereRaw('(jt.current_run_started_at IS NULL OR trip_orders.created_at >= jt.current_run_started_at)')
            ->groupBy('trip_orders.trip_id')
            ->select('trip_orders.trip_id', DB::raw('SUM(trip_orders.quantity) as joined'));

        // Harus setelah select(): select() mengganti daftar kolom, avg/count jadi NULL.
        $query = Trip::query()
            ->with(['detail_trips', 'histories'])
            ->leftJoinSub($joinedSub, 'j', 'j.trip_id', '=', 'trips.id')
            ->where('trips.guider_id', Auth::id())
            ->select('trips.*', DB::raw('COALESCE(j.joined, 0) as joined_count'))
            ->withAvg('ratings as rating_avg', 'rating_amount')
            ->withCount('ratings as rating_count');

        if ($search !== '') {
            FuzzySearch::apply($query, $search, ['trips.name', 'trips.location'], 'trips.id');
        }

        match ($sort) {
            'seats'  => $query->orderByDesc('joined_count'),
            'status' => $query->orderBy('trips.status')->orderByDesc('trips.created_at'),
            default  => $query->orderByDesc('trips.created_at')->orderByDesc('trips.id'),
        };

        $trips = $query->paginate(10)->withQueryString()
            ->through(fn ($trip) => [
                'id' => $trip->id,
                'name' => $trip->name,
                'location' => $trip->location,
                'image' => $this->resolveImage($trip->image),
                'price' => (float) $trip->price,
                'date_label' => Carbon::parse($trip->start_date)->translatedFormat('d M Y'),
                'joined' => (int) $trip->joined_count,
                'capacity' => $trip->people_amount,
                'rating_avg' => $trip->rating_avg !== null ? round((float) $trip->rating_avg, 1) : null,
                'rating_count' => (int) $trip->rating_count,
                'status' => $trip->status,
                'status_label' => $trip->statusLabel(),
                'is_draft' => $trip->status === Trip::STATUS_DRAFT,
                'is_done' => $trip->status === Trip::STATUS_DONE,
                // Riwayat run sebelumnya (hasil re-trip)
                'histories' => $trip->histories->map(fn ($h) => [
                    'id' => $h->id,
                    'period_label' => Carbon::parse($h->start_date)->translatedFormat('d M Y')
                        . ' – ' . Carbon::parse($h->end_date)->translatedFormat('d M Y'),
                    'joined' => (int) $h->joined_count,
                    'revenue' => (float) $h->revenue,
                    'completed_label' => Carbon::parse($h->completed_at)->translatedFormat('d M Y'),
                ])->values(),
            ]);

        return Inertia::render('Admin/Trip/Index', [
            'trips' => $trips,
            'ongoing' => $this->ongoingTrips(),
            'filters' => ['search' => $search, 'sort' => $sort],
        ]);
    }

    private function ongoingTrips()
    {
        return Trip::query()
            ->where('guider_id', Auth::id())
            ->where('status', Trip::STATUS_ONGOING)
            ->whereNull('finished_at')
            ->orderBy('end_date')
            ->get()
            ->map(fn ($trip) => [
                'id' => $trip->id,
                'name' => $trip->name,
                'location' => $trip->location,
                'image' => $this->resolveImage($trip->image),
                'period_label' => Carbon::parse($trip->start_date)->translatedFormat('d M Y')
                    . ' – ' . Carbon::parse($trip->end_date)->translatedFormat('d M Y'),
                'end_label' => Carbon::parse($trip->end_date)->translatedFormat('d M Y'),
            ])
            ->values();
    }

    public function finish($id)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);

        if ($trip->status === Trip::STATUS_DONE) {
            return back()->with('flash', ['type' => 'info', 'message' => 'Trip ini sudah selesai.']);
        }

        if ($trip->status !== Trip::STATUS_ONGOING) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Hanya trip yang sedang berlangsung yang bisa diselesaikan.',
            ]);
        }

        $trip->update([
            'status' => Trip::STATUS_DONE,
            // Tahan Trip::refreshStatuses() agar tidak balik ke ongoing sebelum end_date.
            'finished_at' => now(),
        ]);

        \App\Models\ActivityLog::record('Menyelesaikan trip: ' . $trip->name);

        return back()->with('flash', [
            'type' => 'success',
            'message' => 'Trip "' . $trip->name . '" ditandai selesai.',
        ]);
    }

    public function participants($id)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);
        $runStart = $trip->current_run_started_at;

        // Sengaja tidak di-agregat & urut menaik, biar rincian per kursi bisa dikelompokkan.
        $orders = DB::table('trip_orders')
            ->join('users', 'trip_orders.user_id', '=', 'users.id')
            ->where('trip_orders.trip_id', $trip->id)
            ->where('trip_orders.order_status', 'paid')
            ->when($runStart, fn ($q) => $q->where('trip_orders.created_at', '>=', $runStart))
            ->select(
                'users.id as user_id',
                'users.full_name',
                'users.username',
                'users.profile_image',
                'trip_orders.quantity',
                'trip_orders.total',
                'trip_orders.participants',
                'trip_orders.created_at',
            )
            ->orderBy('trip_orders.created_at')
            ->get();

        $participants = $orders->groupBy('user_id')->map(function ($rows) {
            $first = $rows->first();

            $seatDetails = [];
            foreach ($rows as $r) {
                $decoded = json_decode($r->participants ?? '', true);
                if (! is_array($decoded)) {
                    continue;
                }
                foreach ($decoded as $seat) {
                    $seatDetails[] = [
                        'name'     => trim((string) ($seat['name'] ?? '')) ?: '-',
                        'phone'    => trim((string) ($seat['phone'] ?? '')) ?: null,
                        'nik'      => trim((string) ($seat['nik'] ?? '')) ?: null,
                        'passport' => trim((string) ($seat['passport'] ?? '')) ?: null,
                    ];
                }
            }

            return [
                'user_id' => (int) $first->user_id,
                'name' => $first->full_name ?? 'Peserta',
                'username' => $first->username,
                'avatar' => $this->resolveAvatarUrl($first->profile_image),
                'seats' => (int) $rows->sum('quantity'),
                'total_paid' => (float) $rows->sum('total'),
                'joined_label' => Carbon::parse($rows->min('created_at'))->translatedFormat('d M Y, H:i'),
                'seat_details' => $seatDetails,
            ];
        })->values();

        $seatsFilled = (int) $participants->sum('seats');

        return Inertia::render('Admin/Trip/Participants', [
            'trip' => [
                'id' => $trip->id,
                'name' => $trip->name,
                'location' => $trip->location,
                'joined' => $seatsFilled,
                'capacity' => (int) $trip->people_amount,
                'remaining' => max(0, (int) $trip->people_amount - $seatsFilled),
            ],
            'participants' => $participants,
        ]);
    }

    public function kickParticipant($id, $userId)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);

        $refunded = (new \App\Services\ParticipantRemoval())->fromTrip($trip, (int) $userId);

        return back()->with('flash', $refunded
            ? ['type' => 'success', 'message' => 'Peserta dikeluarkan & dananya dikembalikan ke dompetnya.']
            : ['type' => 'info', 'message' => 'Tidak ada pesanan berbayar peserta ini pada trip berjalan.']);
    }

    public function create()
    {
        return Inertia::render('Admin/Trip/Create', [
            'facilities' => $this->facilityOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateTrip($request);

        $trip = DB::transaction(function () use ($request, $validated) {
            $trip = Trip::create([
                'guider_id' => Auth::id(),
                'name' => $validated['name'],
                'description' => $validated['description'],
                'people_amount' => $validated['people_amount'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'price' => $validated['price'],
                'location' => $validated['location'],
                'image' => $request->hasFile('image')
                    ? $request->file('image')->store('trips', 'public')
                    : null,
                'status' => Trip::STATUS_DRAFT,
            ]);

            $this->syncFacilities($trip, $validated['facilities'] ?? []);
            $this->syncActivities($request, $trip, $validated['activities'] ?? []);

            return $trip;
        });

        \App\Models\ActivityLog::record('Membuat draft trip: ' . $trip->name);

        (new \App\Services\Chat\GroupConversationService())->ensureTripGroup($trip->id, $trip->guider_id);

        return redirect()->route('admin.trip.index')
            ->with('flash', ['type' => 'success', 'message' => 'Draft trip "' . $trip->name . '" berhasil disimpan.']);
    }

    public function edit($id)
    {
        $trip = Trip::with('detail_trips.image_activities', 'facilities')
            ->where('guider_id', Auth::id())
            ->findOrFail($id);

        if ($trip->status !== Trip::STATUS_DRAFT) {
            return redirect()->route('admin.trip.index')
                ->with('flash', ['type' => 'error', 'message' => 'Trip yang sudah dipublish tidak bisa diedit.']);
        }

        return Inertia::render('Admin/Trip/Edit', [
            'facilities' => $this->facilityOptions(),
            'trip' => [
                'id' => $trip->id,
                'name' => $trip->name,
                'location' => $trip->location,
                'description' => $trip->description,
                'people_amount' => $trip->people_amount,
                'start_date' => Carbon::parse($trip->start_date)->toDateString(),
                'end_date' => Carbon::parse($trip->end_date)->toDateString(),
                'price' => (float) $trip->price,
                'image' => $this->resolveImage($trip->image),
                'facilities' => $trip->facilities->pluck('name')->values(),
                'activities' => $trip->detail_trips
                    ->sortBy('activity_order')
                    ->map(fn ($a) => [
                        'name' => $a->activity_name,
                        'date' => Carbon::parse($a->activity_start_datetime)->toDateString(),
                        'start_time' => Carbon::parse($a->activity_start_datetime)->format('H:i'),
                        'end_time' => Carbon::parse($a->activity_end_datetime)->format('H:i'),
                        'description' => $a->activity_description,
                        'existing_images' => $a->image_activities
                            ->map(fn ($img) => $this->resolveImage($img->activity_img_name))
                            ->values(),
                    ])->values(),
            ],
        ]);
    }

    public function update(Request $request, $id)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);

        if ($trip->status !== Trip::STATUS_DRAFT) {
            return redirect()->route('admin.trip.index')
                ->with('flash', ['type' => 'error', 'message' => 'Trip yang sudah dipublish tidak bisa diedit.']);
        }

        $validated = $this->validateTrip($request, true);

        DB::transaction(function () use ($request, $trip, $validated) {
            $trip->update([
                'name' => $validated['name'],
                'description' => $validated['description'],
                'people_amount' => $validated['people_amount'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'price' => $validated['price'],
                'location' => $validated['location'],
                'image' => $request->hasFile('image')
                    ? $request->file('image')->store('trips', 'public')
                    : $trip->image,
            ]);

            $this->syncFacilities($trip, $validated['facilities'] ?? []);

            $trip->detail_trips()->delete();
            $this->syncActivities($request, $trip, $validated['activities'] ?? []);
        });

        \App\Models\ActivityLog::record('Memperbarui draft trip: ' . $trip->name);

        return redirect()->route('admin.trip.index')
            ->with('flash', ['type' => 'success', 'message' => 'Draft trip berhasil diperbarui.']);
    }

    public function destroy($id)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);

        if ($trip->status !== Trip::STATUS_DRAFT) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Trip yang sudah dipublish tidak bisa dihapus.']);
        }

        $tripName = $trip->name;
        $trip->delete();

        \App\Models\ActivityLog::record('Menghapus draft trip: ' . $tripName);

        return back()->with('flash', ['type' => 'success', 'message' => 'Draft trip berhasil dihapus.']);
    }

    public function publish($id)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);

        if ($trip->status !== Trip::STATUS_DRAFT) {
            return back()->with('flash', ['type' => 'info', 'message' => 'Trip ini sudah dipublish.']);
        }

        if ($trip->detail_trips()->count() < 1) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Tambahkan minimal 1 aktivitas sebelum publish.']);
        }

        $trip->update([
            'status' => Trip::statusFromDates($trip->start_date, $trip->end_date),
        ]);

        \App\Models\ActivityLog::record('Mempublikasikan trip: ' . $trip->name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Trip berhasil dipublish dan tampil di halaman Trip Bareng.']);
    }

    // Pakai form create/edit penuh, bukan modal, biar data trip bisa diubah.
    public function reopen($id)
    {
        $trip = Trip::with('detail_trips.image_activities', 'facilities')
            ->where('guider_id', Auth::id())
            ->findOrFail($id);

        if ($trip->status !== Trip::STATUS_DONE) {
            return redirect()->route('admin.trip.index')
                ->with('flash', ['type' => 'error', 'message' => 'Hanya trip yang sudah selesai yang bisa dibuka ulang.']);
        }

        return Inertia::render('Admin/Trip/Reopen', [
            'facilities' => $this->facilityOptions(),
            'trip' => [
                'id' => $trip->id,
                'name' => $trip->name,
                'location' => $trip->location,
                'description' => $trip->description,
                'people_amount' => $trip->people_amount,
                'price' => (float) $trip->price,
                'image' => $this->resolveImage($trip->image),
                'facilities' => $trip->facilities->pluck('name')->values(),
                'activities' => $trip->detail_trips
                    ->sortBy('activity_order')
                    ->map(fn ($a) => [
                        'name' => $a->activity_name,
                        'start_time' => Carbon::parse($a->activity_start_datetime)->format('H:i'),
                        'end_time' => Carbon::parse($a->activity_end_datetime)->format('H:i'),
                        'description' => $a->activity_description,
                        'existing_images' => $a->image_activities
                            ->map(fn ($img) => $this->resolveImage($img->activity_img_name))
                            ->values(),
                    ])->values(),
            ],
        ]);
    }

    public function retrip(Request $request, $id)
    {
        $trip = Trip::where('guider_id', Auth::id())->findOrFail($id);

        if ($trip->status !== Trip::STATUS_DONE) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Hanya trip yang sudah selesai yang bisa dibuka ulang.']);
        }

        $validated = $this->validateTrip($request, true);

        DB::transaction(function () use ($request, $trip, $validated) {
            $runStart = $trip->current_run_started_at ?? '1970-01-01 00:00:00';

            // Arsipkan run yang baru selesai. Pendapatan = total − Rp10.000/kursi milik platform.
            $stats = DB::table('trip_orders')
                ->where('trip_id', $trip->id)
                ->where('order_status', 'paid')
                ->where('created_at', '>=', $runStart)
                ->selectRaw('COUNT(DISTINCT user_id) as joined, COALESCE(SUM(total), 0) as total, COALESCE(SUM(quantity), 0) as seats')
                ->first();

            TripHistory::create([
                'trip_id'      => $trip->id,
                'start_date'   => $trip->start_date,
                'end_date'     => $trip->end_date,
                'joined_count' => (int) ($stats->joined ?? 0),
                'revenue'      => max(0.0, (float) ($stats->total ?? 0) - 10000 * (int) ($stats->seats ?? 0)),
                'completed_at' => now(),
            ]);

            $trip->update([
                'description'   => $validated['description'],
                'people_amount' => $validated['people_amount'],
                'start_date'    => $validated['start_date'],
                'end_date'      => $validated['end_date'],
                'price'         => $validated['price'],
                'image'         => $request->hasFile('image')
                    ? $request->file('image')->store('trips', 'public')
                    : $trip->image,
                'status'        => Trip::statusFromDates($validated['start_date'], $validated['end_date']),
                'current_run_started_at' => now(),
                // Lepas tanda "selesai manual" run sebelumnya biar status ikut tanggal lagi.
                'finished_at'   => null,
            ]);

            $this->syncFacilities($trip, $validated['facilities'] ?? []);

            $trip->detail_trips()->delete();
            $this->syncActivities($request, $trip, $validated['activities'] ?? []);

            // Grup dipakai ulang, peserta run lama dikeluarkan; yang baru masuk lewat openOrCreateTripGroup.
            (new \App\Services\Chat\GroupConversationService())
                ->resetTripGroupToOwner($trip->id, (int) $trip->guider_id);
        });

        \App\Models\ActivityLog::record('Membuka ulang trip: ' . $trip->name);

        return redirect()->route('admin.trip.index')
            ->with('flash', ['type' => 'success', 'message' => 'Trip berhasil dibuka ulang dengan jadwal baru.']);
    }

    public function analytics()
    {
        Trip::refreshStatuses();

        $trips = Trip::where('guider_id', Auth::id())->get();

        $paidOrders = DB::table('trip_orders')
            ->join('trips', 'trip_orders.trip_id', '=', 'trips.id')
            ->where('trips.guider_id', Auth::id())
            ->where('trip_orders.order_status', 'paid');

        // Pendapatan = total − Rp10.000/kursi platform, sama dengan yang dikredit ke dompet.
        $revenueAgg = (clone $paidOrders)
            ->selectRaw('COALESCE(SUM(trip_orders.total), 0) as total, COALESCE(SUM(trip_orders.quantity), 0) as seats')
            ->first();

        $stats = [
            'total_trips' => $trips->count(),
            'published' => $trips->where('status', '!=', Trip::STATUS_DRAFT)->count(),
            'participants' => (clone $paidOrders)->distinct()->count('trip_orders.user_id'),
            'revenue' => max(0.0, (float) $revenueAgg->total - 10000 * (int) $revenueAgg->seats),
        ];

        return Inertia::render('Admin/Trip/Analytics', [
            'stats' => $stats,
            'rating' => $this->accountRating(Auth::id(), 'trip_bareng'),
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────

    private function validateTrip(Request $request, bool $isUpdate = false): array
    {
        $imageRule = $isUpdate ? 'nullable|image|max:4096' : 'required|image|max:4096';

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'description' => 'required|string',
            'people_amount' => 'required|integer|min:1|max:1000',
            'start_date' => 'required|date|after:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'price' => 'required|numeric|min:0',
            'image' => $imageRule,
            'facilities' => 'required|array|min:1',
            'facilities.*' => 'required|string|max:100',
            'activities' => 'required|array|min:1',
            'activities.*.name' => 'required|string|max:255',
            'activities.*.date' => 'required|date|after_or_equal:start_date|before_or_equal:end_date',
            'activities.*.start_time' => 'required|string',
            'activities.*.end_time' => 'required|string',
            'activities.*.description' => 'nullable|string',
            'activities.*.images' => 'nullable|array',
            'activities.*.images.*' => 'image|max:4096',
        ], [
            'start_date.after' => 'Tanggal mulai harus setelah hari ini.',
            'end_date.after_or_equal' => 'Tanggal berakhir tidak boleh sebelum tanggal mulai.',
            'image.required' => 'Gambar utama trip wajib diunggah.',
            'facilities.required' => 'Pilih minimal 1 fasilitas.',
            'facilities.min' => 'Pilih minimal 1 fasilitas.',
            'activities.required' => 'Tambahkan minimal 1 aktivitas.',
            'activities.min' => 'Tambahkan minimal 1 aktivitas.',
            'activities.*.name.required' => 'Nama aktivitas wajib diisi.',
            'activities.*.date.required' => 'Tanggal aktivitas wajib diisi.',
            'activities.*.date.after_or_equal' => 'Tanggal aktivitas harus dalam rentang tanggal trip.',
            'activities.*.date.before_or_equal' => 'Tanggal aktivitas harus dalam rentang tanggal trip.',
            'activities.*.start_time.required' => 'Jam mulai wajib diisi.',
            'activities.*.end_time.required' => 'Jam selesai wajib diisi.',
        ]);

        // Aktivitas harus berurutan & tidak tumpang tindih: mulai aktivitas ke-i
        // tidak boleh sebelum aktivitas sebelumnya selesai (kembaran aturan
        // min tanggal/jam di TripForm, ditegakkan lagi di server).
        $validator->after(function ($v) use ($request) {
            $prevEnd = null;

            foreach ((array) $request->input('activities', []) as $i => $act) {
                if (empty($act['date']) || empty($act['start_time']) || empty($act['end_time'])) {
                    continue; // biar aturan required yang menangani yang kosong
                }

                try {
                    $start = Carbon::parse($act['date'] . ' ' . $act['start_time']);
                    $end = Carbon::parse($act['date'] . ' ' . $act['end_time']);
                } catch (\Exception $e) {
                    continue;
                }

                if ($end->lte($start)) {
                    $v->errors()->add("activities.$i.end_time", 'Jam selesai harus setelah jam mulai.');
                }

                if ($prevEnd && $start->lt($prevEnd)) {
                    $v->errors()->add(
                        "activities.$i.start_time",
                        'Aktivitas harus dimulai setelah aktivitas sebelumnya selesai (' . $prevEnd->format('d M H:i') . ').',
                    );
                }

                $prevEnd = $end->gt($start) ? $end : $start;
            }
        });

        return $validator->validate();
    }

    private function syncFacilities(Trip $trip, array $names): void
    {
        $ids = [];
        foreach ($names as $name) {
            $name = trim((string) $name);
            if ($name === '') {
                continue;
            }
            $facility = Facility::firstOrCreate(
                ['name' => $name],
                ['slug' => Str::slug($name)],
            );
            $ids[] = $facility->id;
        }
        $trip->facilities()->sync($ids);
    }

    private function syncActivities(Request $request, Trip $trip, array $activities): void
    {
        foreach ($activities as $i => $activity) {
            $date = $activity['date'];
            $start = Carbon::parse($date . ' ' . $activity['start_time']);
            $end = Carbon::parse($date . ' ' . $activity['end_time']);
            if ($end->lt($start)) {
                $end = $start->copy();
            }

            $tripActivity = TripActivity::create([
                'trip_id' => $trip->id,
                'activity_order' => $i + 1,
                'activity_name' => $activity['name'],
                'activity_start_datetime' => $start,
                'activity_end_datetime' => $end,
                'activity_description' => $activity['description'] ?? null,
            ]);

            $files = $request->file("activities.$i.images", []);
            foreach ($files as $file) {
                ImageActivity::create([
                    'trip_activity_id' => $tripActivity->id,
                    'activity_img_name' => $file->store('trip-activities', 'public'),
                ]);
            }
        }
    }

    private function facilityOptions(): array
    {
        $defaults = ['Wifi', 'Bus', 'Sarapan', 'Tiket', 'Hotel'];

        $existing = Facility::orderBy('name')->pluck('name')->all();

        return collect($defaults)->merge($existing)->unique()->values()->all();
    }

    private function resolveImage(?string $path): string
    {
        $fallback = '/assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg';

        if (! $path) {
            return $fallback;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }
        return '/storage/' . $path;
    }
}
