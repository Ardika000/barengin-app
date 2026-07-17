<?php

namespace App\Support;

/**
 * Filter lokasi yang "cukup dekat", seragam untuk jastip, pergi bareng & trip.
 *
 * Pencarian sengaja TIDAK strict: teks bebas ("Rumah Talenta BCA Sentul")
 * di-resolve jadi { province, city } lalu dicocokkan pada granularitas
 * kabupaten/kota. Jadi walau tak ada listing tepat di titik yang dicari,
 * listing lain di kota yang sama tetap muncul — masih terjangkau jalan kaki
 * atau kendaraan dari titik tersebut.
 *
 * Dua bentuk penyimpanan lokasi ditangani terpisah:
 *  - structured() : tabel punya kolom province & city sendiri (jastip_items).
 *  - freeText()   : lokasi hanya satu kolom teks bebas, mis. "Puncak, Bogor"
 *                   (pergi_barengs) atau nama provinsi (trips.location).
 */
class LocationFilter
{
    /**
     * Kolom province/city terstruktur.
     *
     *  - provinsi saja → semua listing di provinsi itu (semua kabupaten/kota),
     *  - provinsi+kota → kabupaten/kota tsb (LIKE inti nama, toleran "Kabupaten/Kota"),
     * dengan fallback LIKE gabungan kolom bila resolusi gagal (mis. lokasi luar negeri).
     */
    public static function structured($query, string $q, string $provinceCol, string $cityCol, string $concatExpr): void
    {
        $q = trim($q);
        if ($q === '') {
            return;
        }

        $region = (new RegionResolver())->resolve($q);

        if (! empty($region['city'])) {
            // Radius "cukup dekat" = satu kabupaten/kota. Cocokkan inti nama kota
            // (LIKE) sehingga "Kabupaten Bogor" & "Kota Bogor" sama-sama masuk, tapi
            // TIDAK melebar ke seluruh provinsi.
            $core = RegionResolver::core($region['city']);

            $query->where(function ($sub) use ($cityCol, $core, $concatExpr, $q) {
                if ($core !== '') {
                    $sub->whereRaw("LOWER($cityCol) LIKE ?", ['%' . $core . '%']);
                }
                // Jaring pengaman: cocokkan teks asli pada gabungan kolom.
                $sub->orWhereRaw("$concatExpr LIKE ?", ['%' . $q . '%']);
            });

            return;
        }

        if (! empty($region['province'])) {
            $province = $region['province'];
            $query->where(function ($sub) use ($provinceCol, $province, $concatExpr, $q) {
                $sub->where($provinceCol, $province)
                    ->orWhereRaw("$concatExpr LIKE ?", ['%' . $q . '%']);
            });

            return;
        }

        // Resolusi gagal → perilaku lama (LIKE substring pada gabungan kolom).
        $query->whereRaw("$concatExpr LIKE ?", ['%' . $q . '%']);
    }

    /**
     * Kolom lokasi berteks bebas.
     *
     * Sebuah baris lolos bila SALAH SATU terpenuhi:
     *  - teksnya mirip kata kunci asli (fuzzy, toleran salah ketik),
     *  - memuat inti nama kabupaten/kota hasil resolusi ("bogor"),
     *  - memuat nama provinsi hasil resolusi ("jawa barat").
     *
     * Provinsi ikut dicocokkan — bukan hanya kota — karena kolom bebas seperti
     * trips.location justru berisi nama provinsi, sehingga pencarian "Bromo"
     * tetap menemukan trip yang lokasinya ditulis "Jawa Timur".
     *
     * @param  array<int, string>  $columns
     */
    public static function freeText($query, string $q, array $columns, ?string $idColumn = null): void
    {
        $q = trim($q);
        if ($q === '' || empty($columns)) {
            return;
        }

        $idColumn = $idColumn ?: FuzzySearch::guessIdColumn($query);
        $region   = (new RegionResolver())->resolve($q);

        $needles = [];
        if (! empty($region['city'])) {
            $needles = RegionResolver::cityNeedles($region['city']);
        }
        if (! empty($region['province'])) {
            $needles = array_merge($needles, RegionResolver::provinceNeedles($region['province']));
        }
        $needles = array_values(array_unique($needles));

        // Dihitung sebelum where() ditambahkan agar kandidat fuzzy tidak ikut
        // tersaring oleh kondisi lokasi yang sedang kita susun.
        $fuzzyIds = FuzzySearch::ids($query, $q, $columns, $idColumn);

        $query->where(function ($sub) use ($columns, $needles, $fuzzyIds, $idColumn) {
            $matched = false;

            if (! empty($fuzzyIds)) {
                $sub->orWhereIn($idColumn, $fuzzyIds);
                $matched = true;
            }

            foreach ($needles as $needle) {
                foreach ($columns as $col) {
                    $sub->orWhereRaw("LOWER($col) LIKE ?", ['%' . $needle . '%']);
                    $matched = true;
                }
            }

            // Tidak ada satu pun kondisi → jangan biarkan where kosong (yang
            // justru meloloskan semua baris); kembalikan hasil kosong.
            if (! $matched) {
                $sub->whereRaw('1 = 0');
            }
        });
    }
}
