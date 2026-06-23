<?php

namespace App\Http\Controllers;

use App\Models\PergiBareng;
use App\Models\PergiBarengParticipant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

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

        return [
            'id' => $trip->id,
            'trip_id' => 'PERBAR-' . str_pad($trip->id, 6, '0', STR_PAD_LEFT),
            'title' => $trip->name,
            'date' => $parsedDate->translatedFormat('d M Y'),
            'time' => $parsedDate->format('H:i'),
            'capacity' => $trip->people_amount,
            'joined' => $trip->pergi_bareng_participants->count(),
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
            'participants' => $trip->pergi_bareng_participants->map(function ($p) {
                // Hitung umur
                $age = '?'; // Default jika kosong
                if ($p->birth_date) {
                    $age = Carbon::parse($p->birth_date)->age; // Ini akan menghasilkan angka saja (misal: 25)
                }
                
                return [
                    'name' => $p->full_name,
                    'age' => $age, // <-- Cukup kirim angkanya saja atau '?'
                    'rating' => 5.0, 
                    'avatar' => $p->user ? ($p->user->public_profile_image ?? '/assets/default-profile.png') : '/assets/default-profile.png',
                    'verified' => $p->user_id ? true : false
                ];
            }),
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

        if ($dari !== '') {
            $query->where('departure_loc', 'like', "%{$dari}%");
        }
        if ($ke !== '') {
            $query->where('destination_loc', 'like', "%{$ke}%");
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
                'image' => $trip->img_name ? '/storage/' . $trip->img_name : '/assets/pergi-bareng/PergiBarengHeader.avif',
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

        // 4. Kirim data ke halaman Index.jsx
        return Inertia::render('PergiBareng/Index', [
            'trips' => $formattedTrips,
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

    public function join($id)
    {
        // Load semua relasi yang dibutuhkan termasuk user_ratings dari initiator
        $trip = PergiBareng::with([
            'initiator.user_ratings', 
            'pergi_bareng_participants.user'
        ])->findOrFail($id);
        
        return Inertia::render('PergiBareng/Join', [
            'trip' => $this->formatTripData($trip)
        ]);
    }

  public function store(Request $request, $id)
    {
        $trip = PergiBareng::findOrFail($id);

        $validated = $request->validate([
            'participants' => 'required|array|min:1',
            'participants.*.nama' => 'required|string|max:100', 
            'participants.*.tanggal_lahir' => 'required|date|before:today', 
            'participants.*.paspor' => 'nullable|string|max:12',
            'participants.*.telepon' => [
                'required', 
                'string', 
                'min:9',
                'max:14'
            ],
            'participants.*.nik' => [
                'required', 
                'regex:/^\d{16}$/'
            ],
        ], [
            'participants.*.tanggal_lahir.required' => 'Tanggal lahir wajib diisi',
            'participants.*.tanggal_lahir.date' => 'Format tanggal tidak valid',
            // --- PESAN ERROR ---
            'participants.*.telepon.required' => 'Nomor telepon wajib diisi.',
            'participants.*.telepon.min' => 'Nomor telepon terlalu pendek (minimal 9 angka).',
            'participants.*.telepon.max' => 'Nomor telepon terlalu panjang (maksimal 14 angka).',
            'participants.*.nik.regex' => 'NIK harus terdiri dari 16 digit angka',
            'participants.*.nik.required' => 'NIK wajib diisi',
        ]);

        foreach ($validated['participants'] as $participant) {
            // mengamankan dan merapikan nomor
            $phone = $this->normalizePhone($participant['telepon']);
            
            PergiBarengParticipant::create([
                'pergi_bareng_id' => $trip->id,
                'user_id' => Auth::id(),
                'full_name' => $participant['nama'], 
                'birth_date' => $participant['tanggal_lahir'], 
                'paspor' => $participant['paspor'] ?? null,
                'phone_number' => $phone,
                'nik' => $participant['nik'],
            ]);
        }

        return redirect()->route('pergi-bareng.success', $trip->id)
                        ->with('success', 'Anda berhasil bergabung dengan trip ini!');
    }

    public function success($id)
    {
        $trip = PergiBareng::with([
            'initiator.user_ratings', 
            'pergi_bareng_participants.user'
        ])->findOrFail($id);
        
        return Inertia::render('PergiBareng/Success', [
            'trip' => $this->formatTripData($trip)
        ]);
    }

    /**
     * Normalisasi nomor telepon ke format +62
     */
    private function normalizePhone(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }

        $phone = preg_replace('/[^\d+]/', '', $phone);
        
        if (str_starts_with($phone, '+62')) {
            return $phone;
        }
        
        if (str_starts_with($phone, '62')) {
            return '+' . $phone;
        }
        
        if (str_starts_with($phone, '0')) {
            return '+62' . substr($phone, 1);
        }
        
        return '+62' . $phone;
    }
}