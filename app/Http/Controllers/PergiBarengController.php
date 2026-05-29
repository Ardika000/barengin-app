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

        $avgRating = $trip->initiator?->allRating() ?? 0;
        $totalReviews = $trip->initiator?->user_ratings?->count() ?? 0;

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
                'name' => $trip->initiator?->name ?? 'Penyelenggara',
                'avatar' => $trip->initiator?->profile_photo_url ?? '/assets/default-avatar.png',
                'rating' => number_format($avgRating, 1), 
                'reviews' => (int)$totalReviews,
                'verified' => true,
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
                    'avatar' => $p->user ? ($p->user->profile_photo_url ?? '/assets/default-avatar.png') : '/assets/default-avatar.png',
                    'verified' => $p->user_id ? true : false
                ];
            }),
        ];
    }
    
    public function index(Request $request)
    {
        // 1. Tangkap parameter 'sort' dari React
        $sortBy = $request->query('sort', 'schedule');

        // 2. Siapkan query dasar beserta relasinya
        $query = PergiBareng::with(['initiator.user_ratings', 'pergi_bareng_participants']);

        // --- LOGIKA SORTING DATABASE ---
        if ($sortBy === 'schedule') {
            // Jadwal terdekat: Urutkan dari waktu terdekat dengan sekarang
            $query->orderBy('time_appointment', 'asc');
        } else {
            // Jika tidak ada sort atau sort tidak valid, kembalikan ke urutan default (terbaru)
            $query->latest();
        }

        $trips = $query->get();

        // 3. Format data agar sesuai dengan props yang diminta oleh PergiBarengCard.jsx di React
        $formattedTrips = $trips->map(function ($trip) {
            $parsedDate = $trip->time_appointment;
            
            $avgRating = $trip->initiator?->allRating() ?? 0;
            $totalReviews = $trip->initiator?->user_ratings?->count() ?? 0;
            $joined = $trip->pergi_bareng_participants->count();

            $transportIcon = 'car';

            if (str_contains(strtolower($trip->transportation), 'umum')) {
                $transportIcon = 'train';
            }

            return [
                'id' => $trip->id,
                'image' => $trip->img_name ? '/storage/' . $trip->img_name : '/assets/terminal-cibubur.jpg', 
                'title' => $trip->name,
                'address' => $trip->departure_loc,
                'date' => $parsedDate->translatedFormat('d M y'),
                'time' => $parsedDate->format('H:i'),
                'capacity' => $joined . '/' . $trip->people_amount . ' Orang',
                'remainingSeats' => max(0, $trip->people_amount - $joined),
                'user' => [
                    'name' => $trip->initiator?->name ?? 'Penyelenggara',
                    'avatar' => $trip->initiator?->profile_photo_url ?? '/assets/default-avatar.png',
                    'rating' => number_format($avgRating, 1),
                    'reviews' => (int)$totalReviews,
                    'verified' => true,
                ],
                'transportType' => $trip->transportation,
                'transportIcon' => $transportIcon,
                'href' => '/pergi-bareng/' . $trip->id,
            ];
        });

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
            'trips' => $formattedTrips
        ]);
    }

    public function show($id)
    {
        // Load semua relasi yang dibutuhkan termasuk user_ratings dari initiator
        $trip = PergiBareng::with([
            'initiator.user_ratings', 
            'pergi_bareng_participants.user'
        ])->findOrFail($id);
        
        return Inertia::render('PergiBareng/Show', [
            'trip' => $this->formatTripData($trip)
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
            // --- VALIDASI TELEPON DIBUAT LEBIH SIMPEL DAN ANTI-GAGAL ---
            'participants.*.telepon' => [
                'required', 
                'string', 
                'min:9',  // Minimal 9 karakter (tanpa +62)
                'max:14'  // Maksimal 14 karakter (tanpa +62)
            ],
            'participants.*.nik' => [
                'required', 
                'regex:/^\d{16}$/'
            ],
        ], [
            'participants.*.tanggal_lahir.required' => 'Tanggal lahir wajib diisi',
            'participants.*.tanggal_lahir.date' => 'Format tanggal tidak valid',
            // --- PESAN ERROR DISESUAIKAN ---
            'participants.*.telepon.required' => 'Nomor telepon wajib diisi.',
            'participants.*.telepon.min' => 'Nomor telepon terlalu pendek (minimal 9 angka).',
            'participants.*.telepon.max' => 'Nomor telepon terlalu panjang (maksimal 14 angka).',
            'participants.*.nik.regex' => 'NIK harus terdiri dari 16 digit angka',
            'participants.*.nik.required' => 'NIK wajib diisi',
        ]);

        foreach ($validated['participants'] as $participant) {
            // Fungsi ini yang akan mengamankan dan merapikan nomornya
            $phone = $this->normalizePhone($participant['telepon']);
            
            PergiBarengParticipant::create([
                'pergi_bareng_id' => $trip->id,
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