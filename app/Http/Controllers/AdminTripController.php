<?php

namespace App\Http\Controllers;

use App\Models\Facility;
use App\Models\ImageActivity;
use App\Models\Trip;
use App\Models\TripActivity;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminTripController extends Controller
{
    /** Status badge styling key sudah ditangani di frontend. */

    public function index()
    {
        // Selaraskan status (terjadwal/berlangsung/selesai) sesuai tanggal terkini
        Trip::refreshStatuses();

        $trips = Trip::with('detail_trips')
            ->where('guider_id', Auth::id())
            ->orderByDesc('created_at') // "Terbaru" = waktu dibuat
            ->orderByDesc('id')         // tie-break agar yang terbaru selalu di atas
            ->get()
            ->map(function ($trip) {
                $joined = (int) DB::table('trip_orders')
                    ->where('trip_id', $trip->id)
                    ->where('order_status', 'paid')
                    ->distinct()
                    ->count('user_id');

                return [
                    'id' => $trip->id,
                    'name' => $trip->name,
                    'location' => $trip->location,
                    'image' => $this->resolveImage($trip->image),
                    'price' => (float) $trip->price,
                    'date_label' => Carbon::parse($trip->start_date)->translatedFormat('d M Y'),
                    'joined' => $joined,
                    'capacity' => $trip->people_amount,
                    'status' => $trip->status,
                    'status_label' => $trip->statusLabel(),
                    'is_draft' => $trip->status === Trip::STATUS_DRAFT,
                ];
            });

        return Inertia::render('Admin/Trip/Index', [
            'trips' => $trips,
        ]);
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

        return redirect()->route('admin.trip.index')
            ->with('flash', ['type' => 'success', 'message' => 'Draft trip "' . $trip->name . '" berhasil disimpan.']);
    }

    public function edit($id)
    {
        $trip = Trip::with('detail_trips.image_activities', 'facilities')
            ->where('guider_id', Auth::id())
            ->findOrFail($id);

        // Hanya draft yang boleh diedit
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

            // Ganti seluruh aktivitas (paling sederhana & konsisten)
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

        // Minimal harus punya 1 aktivitas agar layak dipublish
        if ($trip->detail_trips()->count() < 1) {
            return back()->with('flash', ['type' => 'error', 'message' => 'Tambahkan minimal 1 aktivitas sebelum publish.']);
        }

        $trip->update([
            'status' => Trip::statusFromDates($trip->start_date, $trip->end_date),
        ]);

        \App\Models\ActivityLog::record('Mempublikasikan trip: ' . $trip->name);

        return back()->with('flash', ['type' => 'success', 'message' => 'Trip berhasil dipublish dan tampil di halaman Trip Bareng.']);
    }

    public function analytics()
    {
        Trip::refreshStatuses();

        $trips = Trip::where('guider_id', Auth::id())->get();

        $paidOrders = DB::table('trip_orders')
            ->join('trips', 'trip_orders.trip_id', '=', 'trips.id')
            ->where('trips.guider_id', Auth::id())
            ->where('trip_orders.order_status', 'paid');

        $stats = [
            'total_trips' => $trips->count(),
            'published' => $trips->where('status', '!=', Trip::STATUS_DRAFT)->count(),
            'participants' => (clone $paidOrders)->distinct()->count('trip_orders.user_id'),
            'revenue' => (float) (clone $paidOrders)->sum('trip_orders.total'),
        ];

        return Inertia::render('Admin/Trip/Analytics', [
            'stats' => $stats,
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────

    private function validateTrip(Request $request, bool $isUpdate = false): array
    {
        // Saat update draft, gambar utama boleh dikosongkan (memakai gambar lama)
        $imageRule = $isUpdate ? 'nullable|image|max:4096' : 'required|image|max:4096';

        return $request->validate([
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
            // Jika jam selesai lebih awal, anggap berakhir di hari yang sama setelah mulai
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

            // File gambar aktivitas (nested di FormData: activities.{i}.images.*)
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
