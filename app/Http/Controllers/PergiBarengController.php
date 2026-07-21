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

        $joined = (int) $trip->pergi_bareng_participants->sum('quantity');
        $remaining = max(0, $trip->people_amount - $joined);

        $isParticipant = $authId
            ? $trip->pergi_bareng_participants->contains('user_id', $authId)
            : false;
        $hasRequested = $authId
            ? $trip->pergi_bareng_requests->contains('user_id', $authId)
            : false;

        // Satu query, biar tombol Ikuti tiap baris tidak jadi N+1.
        $participantIds = $trip->pergi_bareng_participants->pluck('user_id')->filter()->unique();
        $followedIds = $authId && $participantIds->isNotEmpty()
            ? DB::table('follows')
                ->where('follower_id', $authId)
                ->whereIn('following_id', $participantIds)
                ->pluck('following_id')
                ->flip()
            : collect();

        return [
            'id' => $trip->id,
            'trip_id' => 'PERBAR-' . str_pad($trip->id, 6, '0', STR_PAD_LEFT),
            'title' => $trip->name,
            'date' => $parsedDate->translatedFormat('d M Y'),
            'time' => $parsedDate->format('H:i'),
            'capacity' => $trip->people_amount,
            'joined' => $joined,
            'remaining' => $remaining,
            'status' => $trip->status(),
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
            'participants' => $trip->pergi_bareng_participants->flatMap(function ($p) use ($authId, $followedIds) {
                $entry = [
                    'user_id' => $p->user_id,
                    'name' => $p->user?->full_name ?? 'Partisipan',
                    'username' => $p->user?->username,
                    'avatar' => $p->user?->public_profile_image ?? '/assets/default-profile.png',
                    'verified' => (bool) $p->user_id,
                    'is_self' => $authId !== null && (int) $p->user_id === (int) $authId,
                    'is_following' => $followedIds->has($p->user_id),
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
        $sortBy  = $request->query('sort', 'schedule');
        $dari    = trim((string) $request->query('dari', ''));
        $ke      = trim((string) $request->query('ke', ''));
        $tanggal   = $request->query('tanggal');
        $waktu     = $request->query('waktu');
        $kendaraan = trim((string) $request->query('kendaraan', ''));

        $query = PergiBareng::with(['initiator.received_ratings', 'pergi_bareng_participants'])
            ->where('time_appointment', '>=', now()); // sembunyikan yang sudah lewat

        // Yang gagal di-geocode tetap diproses biar pencarian tak ikut mati.
        $resolver = new RegionResolver();
        $foreignLocation = ($dari !== '' && $resolver->isForeign($dari))
            || ($ke !== '' && $resolver->isForeign($ke));

        if ($foreignLocation) {
            $query->whereRaw('1 = 0');
        } else {
            // Longgar: kalau tak ada yang persis, ambil yang sekabupaten/kota.
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
        if ($kendaraan !== '') {
            $query->where('transportation', $kendaraan);
        }

        if ($sortBy === 'schedule') {
            $query->orderBy('time_appointment', 'asc');
        } else {
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

        if ($sortBy === 'seats') {
            $formattedTrips = $formattedTrips->sortByDesc('remainingSeats')->values();
        } elseif ($sortBy === 'rating') {
            $formattedTrips = $formattedTrips->sortByDesc(function ($trip) {
                return (float) $trip['user']['rating'];
            })->values();
        }

        $perPage = 8;
        $page = LengthAwarePaginator::resolveCurrentPage('page');
        $paginatedTrips = new LengthAwarePaginator(
            $formattedTrips->forPage($page, $perPage)->values(),
            $formattedTrips->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return Inertia::render('PergiBareng/Index', [
            'trips' => $paginatedTrips,
            'foreignLocation' => $foreignLocation,
            'filters' => [
                'dari'      => $dari,
                'ke'        => $ke,
                'tanggal'   => $tanggal,
                'waktu'     => $waktu,
                'kendaraan' => $kendaraan,
                'sort'      => $sortBy,
            ],
        ]);
    }

    public function show($id)
    {
        $trip = PergiBareng::with([
            'initiator.user_ratings',
            'pergi_bareng_participants.user',
            'pergi_bareng_requests',
            'financing_estimate'
        ])->findOrFail($id);

        // Perjalanan yang sudah selesai jadi arsip milik rombongan: isinya (titik
        // kumpul, daftar peserta, estimasi biaya) tak ada gunanya bagi orang luar.
        // Listing sudah menyembunyikannya, ini menutup akses lewat URL langsung /
        // tautan lama (favorit, riwayat, kartu referensi di chat).
        if ($trip->status() === 'finish' && ! $this->isMemberOf($trip)) {
            return redirect()
                ->route('pergi-bareng.index')
                ->with('flash', [
                    'type' => 'info',
                    'message' => 'Perjalanan ini sudah selesai dan detailnya hanya untuk pesertanya.',
                ]);
        }

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

        abort_unless($userId, 403, 'Silakan login terlebih dahulu untuk bergabung.');

        if ((int) $trip->initiator_id === (int) $userId) {
            return back()->with('flash', [
                'type' => 'error',
                'message' => 'Anda adalah penyelenggara trip ini.',
            ]);
        }

        if ($trip->pergi_bareng_requests->contains('user_id', $userId)) {
            return redirect()->route('pergi-bareng.request-sent', $trip->id);
        }

        // Perjalanan yang sudah ditutup penyelenggara tidak menerima kursi baru.
        if ($trip->status() === 'finish') {
            return redirect()->route('pergi-bareng.show', $trip->id)
                ->with('flash', ['type' => 'info', 'message' => 'Perjalanan ini sudah selesai, jadi tidak menerima peserta baru.']);
        }

        // Peserta lama boleh minta kursi tambahan selama belum berangkat.
        if ($trip->pergi_bareng_participants->contains('user_id', $userId)
            && $trip->status() !== 'will_start') {
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

        if (! $myRequest) {
            return redirect()->route('pergi-bareng.show', $trip->id);
        }

        $data = $this->formatTripData($trip);
        $data['requested_quantity'] = (int) $myRequest->quantity;

        return Inertia::render('PergiBareng/RequestSent', [
            'trip' => $data,
        ]);
    }

    public function track($id)
    {
        $trip = PergiBareng::with('pergi_bareng_participants')->findOrFail($id);

        // Peta membocorkan posisi rombongan, jadi non-anggota dipulangkan ke detail.
        if (! $this->isMemberOf($trip)) {
            return redirect()
                ->route('pergi-bareng.show', $trip->id)
                ->with('flash', [
                    'type' => 'info',
                    'message' => 'Pantau perjalanan hanya untuk anggota perjalanan ini.',
                ]);
        }

        // Dijaga di server karena kartu lama di grup chat masih bisa diklik.
        if ($trip->status() === 'finish') {
            return redirect()
                ->route('pergi-bareng.show', $trip->id)
                ->with('flash', [
                    'type' => 'info',
                    'message' => 'Perjalanan ini sudah selesai, jadi pantau perjalanan sudah ditutup.',
                ]);
        }

        return Inertia::render('PergiBareng/Track', [
            'trip' => [
                'id' => (int) $trip->id,
                'name' => $trip->name,
                'departure_loc' => $trip->departure_loc,
                'destination_loc' => $trip->destination_loc,
                'status' => $trip->status(),
                'is_creator' => (int) $trip->initiator_id === (int) Auth::id(),
            ],
        ]);
    }

    // Anggota rombongan = penyelenggara atau peserta. Dipakai bersama oleh detail
    // perjalanan selesai & halaman pantau, supaya aturannya cuma ada di satu tempat.
    private function isMemberOf(PergiBareng $trip): bool
    {
        $userId = (int) Auth::id();

        if (! $userId) {
            return false;
        }

        return (int) $trip->initiator_id === $userId
            || $trip->pergi_bareng_participants->contains('user_id', $userId);
    }

    private function resolvePergiImage(?string $path): string
    {
        return $this->resolveStoredImage($path);
    }
}