<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Pencarian toleran salah-ketik (fuzzy) yang seragam untuk seluruh aplikasi.
 *
 * Filosofinya sama seperti pencarian jastip di halaman depan: gunakan
 * substring biasa, tetapi tetap temukan data yang MIRIP walau ada typo,
 * mis. mencari "edwin henddll" tetap menemukan "edwin hendly".
 *
 * Cara kerja (aman untuk pagination):
 *  1. Kumpulkan kandidat lewat SQL LIKE longgar (substring + prefix pendek)
 *     agar himpunan kecil tapi mencakup calon yang salah ketik.
 *  2. Saring & konfirmasi di PHP dengan levenshtein + similar_text per kata.
 *  3. Batasi query utama dengan whereIn(id) hasil saringan.
 *
 * Pemakaian:
 *   FuzzySearch::apply($query, $search, ['full_name', 'email', 'username']);
 *
 * Untuk query dengan JOIN atau kondisi tambahan (mis. OR ke relasi), pakai
 * `ids()` lalu susun where sendiri:
 *   $ids = FuzzySearch::ids($itemsQuery, $search, ['jastip_items.name'], 'jastip_items.id');
 *   $itemsQuery->where(fn ($w) => $w->whereIn('jastip_items.id', $ids)->orWhereHas(...));
 */
class FuzzySearch
{
    /** Ambang kemiripan kata (persen) untuk lolos sebagai kecocokan typo. */
    private const MIN_SIMILAR_PCT = 70;

    /** Batas jumlah baris kandidat yang dievaluasi (jaga performa). */
    private const MAX_CANDIDATES = 3000;

    /**
     * Terapkan pencarian fuzzy langsung pada $query (in place).
     *
     * @param  \Illuminate\Database\Eloquent\Builder|\Illuminate\Database\Query\Builder  $query
     * @param  array<int, string>  $columns  kolom teks yang dicari
     * @param  string|null  $idColumn  kolom id untuk whereIn (auto bila null)
     */
    public static function apply($query, string $term, array $columns, ?string $idColumn = null): void
    {
        $term = trim($term);
        if ($term === '' || empty($columns)) {
            return;
        }

        $idColumn = $idColumn ?: self::guessIdColumn($query);
        $query->whereIn($idColumn, self::ids($query, $term, $columns, $idColumn));
    }

    /**
     * Kembalikan daftar id baris yang cocok secara fuzzy dengan $term.
     *
     * @return array<int, mixed>
     */
    public static function ids($query, string $term, array $columns, ?string $idColumn = null): array
    {
        $term = trim($term);
        if ($term === '' || empty($columns)) {
            return [];
        }

        $idColumn = $idColumn ?: self::guessIdColumn($query);
        $tokens   = self::tokenize($term);
        if (empty($tokens)) {
            return [];
        }

        // Kandidat: baris yang mengandung salah satu kata (atau prefix pendeknya)
        // pada salah satu kolom. Kloning agar filter dasar $query ikut terpakai.
        $candidate = clone $query;
        if (method_exists($candidate, 'setEagerLoads')) {
            $candidate->setEagerLoads([]); // jangan eager-load saat mengambil kandidat
        }

        $candidate->where(function ($q) use ($tokens, $columns) {
            foreach ($columns as $col) {
                foreach ($tokens as $tok) {
                    $q->orWhere($col, 'like', '%' . self::escapeLike($tok) . '%');
                    $prefix = self::loosePrefix($tok);
                    if ($prefix !== $tok) {
                        $q->orWhere($col, 'like', '%' . self::escapeLike($prefix) . '%');
                    }
                }
            }
        });

        $select = [DB::raw($idColumn . ' as barengin_fuzzy_key')];
        foreach ($columns as $col) {
            $select[] = $col;
        }

        // Timpa kolom SELECT secara eksplisit. get($select) diabaikan bila query
        // sudah punya ->select() sebelumnya (Laravel onceWithColumns), jadi kita
        // paksa lewat ->select() agar alias id & kolom teks pasti terbawa.
        $rows = $candidate->select($select)->limit(self::MAX_CANDIDATES)->get();

        $matched = [];
        foreach ($rows as $row) {
            // Model Eloquent menyimpan nilai di $attributes (bukan properti objek),
            // sedangkan Query Builder mengembalikan stdClass.
            $arr = $row instanceof Model ? $row->getAttributes() : (array) $row;

            $texts = [];
            foreach ($columns as $col) {
                $key = self::baseColumn($col);
                $val = $arr[$key] ?? null;
                if ($val !== null && $val !== '') {
                    $texts[] = mb_strtolower((string) $val);
                }
            }

            if (self::rowMatches($tokens, $texts)) {
                $matched[] = $arr['barengin_fuzzy_key'] ?? null;
            }
        }

        return array_values(array_filter($matched, fn ($v) => $v !== null));
    }

    /** Pecah kata pencarian jadi token huruf-kecil. */
    private static function tokenize(string $term): array
    {
        $parts = preg_split('/\s+/u', mb_strtolower(trim($term))) ?: [];

        return array_values(array_filter($parts, fn ($p) => $p !== ''));
    }

    /**
     * Setiap token harus menemukan kata yang cocok/mirip di salah satu kolom.
     */
    private static function rowMatches(array $tokens, array $texts): bool
    {
        // Kumpulkan kata + teks utuh tiap kolom sebagai target pembanding.
        $words = [];
        foreach ($texts as $text) {
            $words[] = $text; // teks utuh (cocok untuk substring frasa)
            foreach (preg_split('/\s+/u', $text) ?: [] as $w) {
                if ($w !== '') {
                    $words[] = $w;
                }
            }
        }

        foreach ($tokens as $tok) {
            $ok = false;
            $tokLen = mb_strlen($tok);
            foreach ($words as $w) {
                if (str_contains($w, $tok)) {
                    $ok = true;
                    break;
                }
                // Levenshtein aman untuk kata pendek; lewati yang terlalu panjang.
                if (mb_strlen($w) <= 60) {
                    $lev = levenshtein($tok, $w);
                    if ($lev <= max(1, (int) floor($tokLen / 3))) {
                        $ok = true;
                        break;
                    }
                    similar_text($tok, $w, $pct);
                    if ($pct >= self::MIN_SIMILAR_PCT) {
                        $ok = true;
                        break;
                    }
                }
            }
            if (! $ok) {
                return false;
            }
        }

        return true;
    }

    /** Prefix longgar untuk memperluas jaring kandidat (menangkap typo). */
    private static function loosePrefix(string $token): string
    {
        $len = mb_strlen($token);
        if ($len <= 3) {
            return $token;
        }

        return mb_substr($token, 0, max(3, (int) floor($len * 0.5)));
    }

    /** Escape karakter khusus LIKE (% dan _). */
    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /** Ambil nama kolom tanpa prefix tabel (users.full_name → full_name). */
    private static function baseColumn(string $column): string
    {
        $pos = strrpos($column, '.');

        return $pos === false ? $column : substr($column, $pos + 1);
    }

    /** Tebak kolom id untuk whereIn dari $query. */
    public static function guessIdColumn($query): string
    {
        if (method_exists($query, 'getModel')) {
            return $query->getModel()->getQualifiedKeyName(); // mis. users.id
        }

        $from = $query->from ?? null;
        if (is_string($from) && $from !== '') {
            $table = preg_split('/\s+as\s+/i', $from)[0];

            return trim($table) . '.id';
        }

        return 'id';
    }
}
