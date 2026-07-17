<?php

namespace App\Http\Controllers;

use App\Models\PergiBareng;
use App\Models\PergiBarengRequest;
use App\Support\LocationFilter;
use App\Support\RegionResolver;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Pagination\LengthAwarePaginator;

class PergiBarengController extends Controller
{

   private function formatTripData($trip)
    {
        $parsedDate = $trip->time_appointment;

        $avgRating = $trip->initiator?->receivedRatingAvg('pergi_bareng') ?? 0;
        $totalReviews = $trip->initiator?->receivedRatingCount('pergi_bareng') ?? 0;

        $authId = request()->user()?->id;
        $isFollowing = $authId && $trip->initiator
            ? DB::table('follows')
                ->where('follower_id', $authId)
                ->where('following_id', $trip->initiator->id)
                ->exists()
            : false;

        // Jumlah kursi yang sudah disetujui (akumulasi kuantitas tiap partisipan)
        $joined = (int) $trip->pergi_bareng_participants->sum('quantity');
        $remaining = max(0, $trip->people_amount - $joined);

        // Status user yang sedang login terhadap trip ini
        $isParticipant = $authId
            ? $trip->pergi_bareng_participants->contains('user_id', $authId)
            : false;
        $hasRequested = $authId
            ? $trip->pergi_bareng_requests->contains('user_id', $authId)
            : false;

        return [
            'id' => $trip->id,
            'trip_id' => 'PERBAR-' . str_pad($trip->id, 6, '0', STR_PAD_LEFT),
            'title' => $trip->name,
            'date' => $parsedDate->translatedFormat('d M Y'),
            'time' => $parsedDate->format('H:i'),
            'capacity' => $trip->people_amount,
            'joined' => $joined,
            'remaining' => $remaining,
            'is_participant' => $isParticipant,
            'has_requested' => $hasRequested,
            'description' => $trip->description,
            'img_name' => $trip->img_name,
            'details' => [
                'titik_kumpul' => $trip->departure_loc,
                'titik_tujuan' => $trip->destination_loc,
                'transportasi' => $trip->transportation,
                'jam_kumpul' => $parsedDate->format('H:i'),
            ],

            'organizer' => [
                'id' => $trip->initiator?->id,
                'username' => $trip->initiator?->username,
                'name' => $trip->initiator?->full_name ?? 'Penyelenggara',
                'avatar' => $trip->initiator?->public_profile_image ?? asset('assets/default-profile.png'),
                'rating' => number_format($avgRating, 1),
                'reviews' => (int)$totalReviews,
                'verified' => true,
                'is_following' => $isFollowing,
                'is_self' => $authId === $trip->initiator?->id,
            ],
            // Tiap partisipan diperluas sebanyak kuantitas kursi yang dipesan
            'participants' => $trip->pergi_bareng_participants->flatMap(function ($p) {
                $entry = [
                    'user_id' => $p->user_id,
                    'name' => $p->user?->full_name ?? 'Partisipan',
                    'username' => $p->user?->username,
                    'rating' => 5.0,
                    'avatar' => $p->user?->public_profile_image ?? '/assets/default-profile.png',
                    'verified' => (bool) $p->user_id,
                ];

                $qty = max(1, (int) $p->quantity);

                return collect(range(1, $qty))->map(fn ($seat) => array_merge($entry, [
                    'seat_label' => $qty > 1 ? "Kursi {$seat} dari {$qty}" : null,
                ]));
            })->values(),
            'financing_estimates' => $trip->financing_estimate
            ? $trip->financing_estimate->map(fn ($fe) => [
                'id' => $fe->id,
                'name' => $fe->name,
            ])->values()
            : [],
        ];
    }
    
    public function index(Request $request)
    {
        // 1. Tangkap parameter 'sort' & pencarian dari React
        $sortBy  = $request->query('sort', 'schedule');
        $dari    = trim((string) $request->query('dari', ''));
        $ke      = trim((string) $request->query('ke', ''));
        $tanggal = $request->query('tanggal');
        $waktu   = $request->query('waktu');
        $jumlah  = (int) $request->query('jumlah', 0);

        // 2. Siapkan query dasar beserta relasinya
        $query = PergiBareng::with(['initiator.received_ratings', 'pergi_bareng_participants'])
            ->where('time_appointment', '>=', now()); // sembunyikan yang sudah lewat

        // Pergi bareng hanya melayani perjalanan di dalam Indonesia. Lokasi yang
        // TERBUKTI asing dikosongkan hasilnya (teks yang gagal di-geocode tetap
        // diproses agar pencarian tak ikut mati saat Nominatim bermasalah).
        $resolver = new RegionResolver();
        $foreignLocation = ($dari !== '' && $resolver->isForeign($dari))
            || ($ke !== '' && $resolver->isForeign($ke));

        if ($foreignLocation) {
            $query->whereRaw('1 = 0');
        } else {
            // Pencarian longgar: bila tak ada yang tepat di titik itu, tampilkan
            // yang masih satu kabupaten/kota (lihat App\Support\LocationFilter).
            if ($dari !== '') {
                LocationFilter::freeText($query, $dari, ['departure_loc']);
            }
            if ($ke !== '') {
                LocationFilter::freeText($query, $ke, ['destination_loc']);
            }
        }
        if ($tanggal) {
            $query->whereDate('time_appointment', $tanggal);
        }
        if ($waktu) {
            $query->whereTime('time_appointment', '>=', $waktu);
        }

        // --- LOGIKA SORTING DATABASE ---
        if ($sortBy === 'schedule') {
            // Jadwal terdekat: Urutkan dari waktu terdekat dengan sekarang
            $query->orderBy('time_appointment', 'asc');
        } else {
            // Jika tidak ada sort atau sort tidak valid, kembalikan ke urutan default (terbaru)
            $query->latest();
        }

        $trips = $query->get();

        $likedIds = $request->user()
            ? DB::table('favorites')
                ->where('user_id', $request->user()->id)
                ->where('favoritable_type', 'pergi_bareng')
                ->pluck('favoritable_id')
                ->flip()
            : collect();

        // 3. Format data agar sesuai dengan props yang diminta oleh PergiBarengCard.jsx di React
        $formattedTrips = $trips->map(function ($trip) use ($likedIds) {
            $parsedDate = $trip->time_appointment;
            
            $avgRating = $trip->initiator?->receivedRatingAvg('pergi_bareng') ?? 0;
            $totalReviews = $trip->initiator?->receivedRatingCount('pergi_bareng') ?? 0;
            $joined = $trip->pergi_bareng_participants->count();

            $transportIcon = 'car';

            if (str_contains(strtolower($trip->transportation), 'umum')) {
                $transportIcon = 'train';
            }

            return [
                'id' => $trip->id,
                'image' => $this->resolvePergiImage($trip->img_name),
                'title' => $trip->name,
                'address' => $trip->departure_loc,
                'date' => $parsedDate->translatedFormat('d M y'),
                'time' => $parsedDate->format('H:i'),
                'capacity' => $joined . '/' . $trip->people_amount . ' Orang',
                'remainingSeats' => max(0, $trip->people_amount - $joined),
                'user' => [
                    'id' => $trip->initiator?->id,
                    'name' => $trip->initiator?->full_name ?? 'Penyelenggara',
                    'avatar' => $trip->initiator?->public_profile_image ?? asset('assets/default-profile.png'),
                    'rating' => number_format($avgRating, 1),
                    'reviews' => (int)$totalReviews,
                    'verified' => true,
                ],
                'transportType' => $trip->transportation,
                'transportIcon' => $transportIcon,
                'href' => '/pergi-bareng/' . $trip->id,
                'liked' => $likedIds->has($trip->id),
            ];
        });

        // Filter berdasarkan jumlah kursi tersisa (dihitung setelah format)
        if ($jumlah > 0) {
            $formattedTrips = $formattedTrips->filter(
                fn ($trip) => $trip['remainingSeats'] >= $jumlah
            )->values();
        }

        // --- LOGIKA SORTING COLLECTION ---
        if ($sortBy === 'seats') {
            $formattedTrips = $formattedTrips->sortByDesc('remainingSeats')->values();
        } elseif ($sortBy === 'rating') {
            $formattedTrips = $formattedTrips->sortByDesc(function ($trip) {
                return (float) $trip['user']['rating'];
            })->values();
        }

        // 4. Paginasi manual: 8 pergi bareng per halaman
        //    (filter & sorting dilakukan di koleksi, jadi paginasi setelahnya)
        $perPage = 8;
        $page = LengthAwarePaginator::resolveCurrentPage('page');
        $paginatedTrips = new LengthAwarePaginator(
            $formattedTrips->forPage($page, $perPage)->values(),
            $formattedTrips->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        // 5. Kirim data ke halaman Index.jsx
        return Inertia::render('PergiBareng/Index', [
            'trips' => $paginatedTrips,
            // Peringatan di daftar saat user mengetik lokasi di luar Indonesia.
            'foreignLocation' => $foreignLocation,
            'filters' => [
                'dari'    => $dari,
                'ke'      => $ke,
                'tanggal' => $tanggal,
                'waktu'   => $waktu,
                'jumlah'  => $jumlah ?: '',
                'sort'    => $sortBy,
            ],
        ]);
    }

    public function show($id)
    {
        // Load semua relasi yang dibutuhkan termasuk user_ratings dari initiator
        $trip = PergiBareng::with([
            'initiator.user_ratings',
            'pergi_bareng_participants.user',
            'pergi_bareng_requests',
            'financing_estimate'
        ])->findOrFail($id);

        $data = $this->formatTripData($trip);
        $data['liked'] = request()->user()
            ? DB::table('favorites')
                ->where('user_id', request()->user()->id)
                ->where('favoritable_type', 'pergi_bareng')
                ->where('favoritable_id', $trip->id)
                ->exists()
            : false;

        return Inertia::render('PergiBareng/Show', [
            'trip' => $data
        ]);
    }

    public function store(Request $request, $id)
    {
        $trip = PergiBareng::with(['pergi_bareng_participants', 'pergi_bareng_requests'])
            ->findOrFail($id);

        $userId = Auth::id();

        // Hanya user yang login yang boleh mengajukan
        abort_unless($userId, 403, 'Silakan login terlebih dahulu untuk bergabung.');

        // Penyelenggara tidak bisa bergabung ke trip-nya sendiri
        if ((int) $trip->initiator_id === (int) $userId) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Anda adalah penyelenggara trip ini.',
            ]);
        }

        // Cegah pengajuan / keikutsertaan ganda
        if ($trip->pergi_bareng_requests->contains('user_id', $userId)) {
            return redirect()->route('pergi-bareng.request-sent', $trip->id);
        }
        if ($trip->pergi_bareng_participants->contains('user_id', $userId)) {
            return redirect()->route('pergi-bareng.show', $trip->id)
                ->with('flash', ['type' => 'info', 'message' => 'Anda sudah tergabung dalam trip ini.']);
        }

        $joined = (int) $trip->pergi_bareng_participants->sum('quantity');
        $remaining = max(0, $trip->people_amount - $joined);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:' . max(1, $remaining)],
        ], [
            'quantity.max' => 'Jumlah kursi melebihi kuota yang tersisa.',
        ]);

        $req = PergiBarengRequest::create([
            'pergi_bareng_id' => $trip->id,
            'user_id' => $userId,
            'quantity' => $validated['quantity'],
        ]);

        \App\Models\UserNotification::send(
            (int) $userId,
            'order.created',
            ['name' => $trip->name, 'kind' => 'pergi_bareng', 'quantity' => (int) $validated['quantity']],
            '/pergi-bareng/' . $trip->id,
            'order.created:pb_req:' . $req->id,
        );

        // Sisi penyelenggara: tanpa ini dia tidak tahu ada permintaan yang
        // menunggu persetujuan kecuali membuka halaman permintaan sendiri.
        \App\Models\UserNotification::send(
            (int) $trip->initiator_id,
            'pergi_bareng.requested',
            [
                'name' => $trip->name,
                'requester' => Auth::user()?->full_name,
                'quantity' => (int) $validated['quantity'],
            ],
            '/admin/pergi-bareng/' . $trip->id . '/requests',
            'pergi_bareng.requested:pb_req:' . $req->id,
        );

        return redirect()->route('pergi-bareng.request-sent', $trip->id);
    }

    public function requestSent($id)
    {
        $trip = PergiBareng::with([
            'initiator.user_ratings',
            'pergi_bareng_participants.user',
            'pergi_bareng_requests',
        ])->findOrFail($id);

        $myRequest = $trip->pergi_bareng_requests
            ->firstWhere('user_id', Auth::id());

        // Tidak ada permintaan tertunda -> kembali ke detail
        if (! $myRequest) {
            return redirect()->route('pergi-bareng.show', $trip->id);
        }

        $data = $this->formatTripData($trip);
        $data['requested_quantity'] = (int) $myRequest->quantity;

        return Inertia::render('PergiBareng/RequestSent', [
            'trip' => $data,
        ]);
    }

    /**
     * Ubah path gambar pergi bareng dari DB menjadi URL untuk <img>.
     * - kosong  -> gambar default generik
     * - http/absolut (/assets/..) -> dipakai apa adanya
     * - relatif -> diarahkan ke storage link
     */
    private function resolvePergiImage(?string $path): string
    {
        return $this->resolveStoredImage($path);
    }
}