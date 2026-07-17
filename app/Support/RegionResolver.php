<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Menerjemahkan teks lokasi bebas (provinsi, kabupaten/kota, atau nama tempat
 * spesifik seperti "Rumah Talenta BCA Sentul") menjadi { province, city } pada
 * granularitas kabupaten/kota. Dipakai pencarian jastip agar:
 *   - ketik provinsi  → cocok semua kabupaten/kota provinsi itu,
 *   - ketik kab/kota  → cocok kabupaten/kota tsb,
 *   - ketik tempat    → di-geocode (Nominatim) → kabupaten/kota tempat itu berada.
 *
 * Nama provinsi kanonik selaras dengan yang tersimpan di jastip_items.pickup_province
 * (lihat resources/js/lib/indonesiaProvinces.js).
 */
class RegionResolver
{
    private const PROVINCES = [
        'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
        'Jambi', 'Sumatera Selatan', 'Kepulauan Bangka Belitung', 'Bengkulu',
        'Lampung', 'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah',
        'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat',
        'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
        'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
        'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat',
        'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku', 'Maluku Utara',
        'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah',
        'Papua Pegunungan', 'Papua Barat Daya',
    ];

    /** Alias bahasa Inggris / umum (dari Nominatim) → nama kanonik. */
    private const PROVINCE_ALIASES = [
        'west java' => 'Jawa Barat',
        'central java' => 'Jawa Tengah',
        'east java' => 'Jawa Timur',
        'jakarta' => 'DKI Jakarta',
        'special capital region of jakarta' => 'DKI Jakarta',
        'yogyakarta' => 'DI Yogyakarta',
        'special region of yogyakarta' => 'DI Yogyakarta',
        'north sumatra' => 'Sumatera Utara',
        'west sumatra' => 'Sumatera Barat',
        'south sumatra' => 'Sumatera Selatan',
        'riau islands' => 'Kepulauan Riau',
        'bangka belitung islands' => 'Kepulauan Bangka Belitung',
        'west nusa tenggara' => 'Nusa Tenggara Barat',
        'east nusa tenggara' => 'Nusa Tenggara Timur',
        'west kalimantan' => 'Kalimantan Barat',
        'central kalimantan' => 'Kalimantan Tengah',
        'south kalimantan' => 'Kalimantan Selatan',
        'east kalimantan' => 'Kalimantan Timur',
        'north kalimantan' => 'Kalimantan Utara',
        'north sulawesi' => 'Sulawesi Utara',
        'central sulawesi' => 'Sulawesi Tengah',
        'west sulawesi' => 'Sulawesi Barat',
        'south sulawesi' => 'Sulawesi Selatan',
        'southeast sulawesi' => 'Sulawesi Tenggara',
        'north maluku' => 'Maluku Utara',
        'west papua' => 'Papua Barat',
    ];

    /** @return array{province: ?string, city: ?string} */
    public function resolve(string $q): array
    {
        $q = trim($q);
        if ($q === '') {
            return ['province' => null, 'city' => null];
        }

        // 1) Cocokkan langsung ke provinsi kanonik / alias.
        $prov = $this->matchProvince($q);
        if ($prov) {
            return ['province' => $prov, 'city' => null];
        }

        // 2) Geocode (Nominatim, dibatasi Indonesia) → provinsi + kabupaten/kota.
        return $this->geocode($q);
    }

    /**
     * Kata kunci LIKE untuk sebuah provinsi pada kolom lokasi berteks bebas.
     *
     * Kolom bebas sering menulis "Blok M, Jakarta" — bukan "DKI Jakarta" — maka
     * varian tanpa prefix "DKI"/"DI" ikut disertakan agar tetap tertangkap.
     *
     * @return array<int, string>
     */
    public static function provinceNeedles(string $province): array
    {
        $core     = self::core($province);
        $needles  = [$core];
        $stripped = preg_replace('/^(dki|di)\s+/u', '', $core);

        if ($stripped !== $core) {
            $needles[] = $stripped;
        }

        return array_values(array_unique(array_filter($needles, fn ($n) => $n !== '')));
    }

    /**
     * Kata kunci LIKE untuk sebuah kabupaten/kota pada kolom berteks bebas.
     *
     * Selain inti namanya, varian tanpa arah administratif ikut disertakan
     * ("Jakarta Pusat" → "jakarta") supaya pencarian sebuah titik spesifik
     * (mis. "Monas") tetap menemukan listing yang lokasinya ditulis lebih
     * longgar sebagai "Blok M, Jakarta".
     *
     * @return array<int, string>
     */
    public static function cityNeedles(string $city): array
    {
        $core = self::core($city);
        if ($core === '') {
            return [];
        }

        $needles = [$core];
        $base = preg_replace('/\s+(utara|selatan|timur|barat|pusat|tengah)$/u', '', $core);
        if ($base !== $core && $base !== '') {
            $needles[] = $base;
        }

        return array_values(array_unique($needles));
    }

    /**
     * Kode negara ISO alpha-2 dari sebuah teks lokasi, atau null bila tak
     * terpetakan. Berbeda dari resolve(), geocode di sini TIDAK dibatasi
     * Indonesia — justru dipakai untuk mengenali lokasi luar negeri.
     */
    public function countryCode(string $q): ?string
    {
        $q = trim($q);
        if ($q === '' || $this->matchProvince($q)) {
            return $q === '' ? null : 'id';
        }

        $address = $this->geocodeAddress($q, null, 'region:country:');

        return $address['country_code'] ?? null;
    }

    /**
     * True hanya bila lokasi TERBUKTI berada di luar Indonesia. Teks yang gagal
     * di-geocode (typo, Nominatim mati) sengaja dianggap "belum tentu asing"
     * agar pencarian tidak ikut mati saat layanan geocode bermasalah.
     */
    public function isForeign(string $q): bool
    {
        $code = $this->countryCode($q);

        return $code !== null && $code !== 'id';
    }

    /** Inti nama untuk pencocokan LIKE (buang prefix administratif). */
    public static function core(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = preg_replace(
            '/\b(kota administrasi|kabupaten administrasi|kabupaten|kotamadya|kota|kab\.?|kec\.?|provinsi|prov\.?|regency|city|of)\b/u',
            ' ',
            $s
        );
        return trim(preg_replace('/\s+/', ' ', $s));
    }

    private function matchProvince(string $q): ?string
    {
        $n = self::core($q);
        if ($n === '') {
            return null;
        }
        foreach (self::PROVINCES as $p) {
            if (self::core($p) === $n) {
                return $p;
            }
        }
        return self::PROVINCE_ALIASES[$n] ?? null;
    }

    /**
     * Ambil bagian `address` hasil geocode Nominatim (di-cache 24 jam).
     *
     * @param  ?string  $countryCodes  batasi ke negara tertentu, null = seluruh dunia
     * @return ?array<string, mixed>
     */
    private function geocodeAddress(string $q, ?string $countryCodes, string $cachePrefix): ?array
    {
        $base = config('services.nominatim.base_url');
        $email = config('services.nominatim.email');
        $ua = config('services.nominatim.user_agent') ?: 'barengin/1.0';

        $cacheKey = $cachePrefix . md5(mb_strtolower($q));

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($base, $email, $ua, $q, $countryCodes) {
            try {
                $params = [
                    'q' => $q,
                    'format' => 'jsonv2',
                    'addressdetails' => 1,
                    'limit' => 1,
                    'email' => $email,
                ];
                if ($countryCodes !== null) {
                    $params['countrycodes'] = $countryCodes;
                }

                $resp = Http::withHeaders([
                    'User-Agent' => $ua,
                    'Accept-Language' => 'id',
                ])->timeout(6)->get($base . '/search', $params);

                if (! $resp->ok()) {
                    return null;
                }

                $json = $resp->json();

                return is_array($json) && isset($json[0]['address']) ? $json[0]['address'] : null;
            } catch (\Throwable $e) {
                return null;
            }
        });
    }

    /** @return array{province: ?string, city: ?string} */
    private function geocode(string $q): array
    {
        $empty = ['province' => null, 'city' => null];

        $address = $this->geocodeAddress($q, 'id', 'region:resolve:');

        if (! $address) {
            return $empty;
        }

        $stateRaw = $address['state'] ?? $address['region'] ?? null;
        $countyRaw = $address['county'] ?? null;
        $cityRaw = $address['city'] ?? $address['town'] ?? $address['municipality'] ?? $address['village'] ?? null;

        $province = $stateRaw ? ($this->matchProvince($stateRaw) ?? $stateRaw) : null;
        // Kabupaten/kota: utamakan county (kabupaten), fallback kota/kecamatan.
        $city = $countyRaw ?: $cityRaw;

        return ['province' => $province, 'city' => $city];
    }
}
