<?php

namespace App\Support;

// Filter lokasi se-kabupaten/kota. structured() = tabel punya kolom province/city,
// freeText() = lokasinya cuma satu kolom teks bebas.
class LocationFilter
{
    public static function structured($query, string $q, string $provinceCol, string $cityCol, string $concatExpr): void
    {
        $q = trim($q);
        if ($q === '') {
            return;
        }

        $region = (new RegionResolver())->resolve($q);

        if (! empty($region['city'])) {
            // Inti nama saja, biar "Kabupaten Bogor" & "Kota Bogor" sama-sama masuk.
            $core = RegionResolver::core($region['city']);

            $query->where(function ($sub) use ($cityCol, $core, $concatExpr, $q) {
                if ($core !== '') {
                    $sub->whereRaw("LOWER($cityCol) LIKE ?", ['%' . $core . '%']);
                }
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

        $query->whereRaw("$concatExpr LIKE ?", ['%' . $q . '%']);
    }

    // Provinsi ikut dicocokkan karena kolom seperti trips.location cuma berisi nama provinsi.
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

        // Harus sebelum where() di bawah, biar kandidatnya tidak ikut tersaring.
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

            if (! $matched) { // where kosong justru meloloskan semua baris
                $sub->whereRaw('1 = 0');
            }
        });
    }
}
