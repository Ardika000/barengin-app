<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

// Pencarian toleran typo: jaring kandidat lewat LIKE longgar, lalu
// konfirmasi di PHP dengan levenshtein/similar_text.
class FuzzySearch
{
    private const MIN_SIMILAR_PCT = 70;

    private const MAX_CANDIDATES = 3000;

    public static function apply($query, string $term, array $columns, ?string $idColumn = null): void
    {
        $term = trim($term);
        if ($term === '' || empty($columns)) {
            return;
        }

        $idColumn = $idColumn ?: self::guessIdColumn($query);
        $query->whereIn($idColumn, self::ids($query, $term, $columns, $idColumn));
    }

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

        // Klon agar filter dasar $query ikut terpakai.
        $candidate = clone $query;
        if (method_exists($candidate, 'setEagerLoads')) {
            $candidate->setEagerLoads([]);
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

        // Harus ->select(): argumen get() diabaikan kalau query sudah punya select.
        $rows = $candidate->select($select)->limit(self::MAX_CANDIDATES)->get();

        $matched = [];
        foreach ($rows as $row) {
            // Eloquent menyimpan nilai di $attributes, Query Builder di stdClass.
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

    private static function tokenize(string $term): array
    {
        $parts = preg_split('/\s+/u', mb_strtolower(trim($term))) ?: [];

        return array_values(array_filter($parts, fn ($p) => $p !== ''));
    }

    // Tiap token wajib punya kata mirip di salah satu kolom.
    private static function rowMatches(array $tokens, array $texts): bool
    {
        $words = [];
        foreach ($texts as $text) {
            $words[] = $text; // teks utuh, agar frasa ikut cocok
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

    private static function loosePrefix(string $token): string
    {
        $len = mb_strlen($token);
        if ($len <= 3) {
            return $token;
        }

        return mb_substr($token, 0, max(3, (int) floor($len * 0.5)));
    }

    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    // users.full_name -> full_name
    private static function baseColumn(string $column): string
    {
        $pos = strrpos($column, '.');

        return $pos === false ? $column : substr($column, $pos + 1);
    }

    public static function guessIdColumn($query): string
    {
        if (method_exists($query, 'getModel')) {
            return $query->getModel()->getQualifiedKeyName();
        }

        $from = $query->from ?? null;
        if (is_string($from) && $from !== '') {
            $table = preg_split('/\s+as\s+/i', $from)[0];

            return trim($table) . '.id';
        }

        return 'id';
    }
}
