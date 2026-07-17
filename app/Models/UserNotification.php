<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Notifikasi untuk seorang penerima.
 *
 * Dinamai `UserNotification` (bukan `Notification`) dengan sengaja: User memakai
 * trait Notifiable milik Laravel yang sudah mendefinisikan relasi `notifications()`
 * ke tabel `notifications`. Memakai nama yang sama akan bentrok.
 */
class UserNotification extends Model
{
    /** Kategori = kunci preferensi di users.notification_prefs. */
    public const CATEGORY_PERGI_BARENG   = 'pergi_bareng';
    public const CATEGORY_GROUP          = 'group';
    public const CATEGORY_ORDER          = 'order';
    public const CATEGORY_PAYMENT        = 'payment';
    public const CATEGORY_SPLIT_BILL     = 'split_bill';
    public const CATEGORY_JASTIP_REQUEST = 'jastip_request';
    public const CATEGORY_SELLING        = 'selling';

    /** Semua kategori yang bisa dimatikan pengguna, berikut tipe di dalamnya. */
    public const CATEGORIES = [
        // Dua sisi sekaligus: pemohon dikabari hasil permintaannya, penyelenggara
        // dikabari ada permintaan masuk yang perlu ditindak.
        self::CATEGORY_PERGI_BARENG => [
            'pergi_bareng.approved',
            'pergi_bareng.rejected',
            'pergi_bareng.requested',
        ],
        self::CATEGORY_GROUP        => ['group.joined'],
        self::CATEGORY_ORDER        => ['order.created'],
        self::CATEGORY_PAYMENT      => ['payment.paid'],
        self::CATEGORY_SPLIT_BILL   => ['split_bill.created', 'split_bill.settled'],
        // Titipan yang diajukan pengguna ke jastiper.
        self::CATEGORY_JASTIP_REQUEST => [
            'jastip_request.quoted',
            'jastip_request.rejected',
        ],
        // Sisi penjual: ada yang membeli / menitip padaku.
        self::CATEGORY_SELLING => ['selling.order_paid', 'selling.request_received'],
    ];

    protected $fillable = [
        'user_id', 'type', 'category', 'data', 'url', 'dedupe_key', 'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Kirim satu notifikasi ke seorang pengguna.
     *
     * Mengembalikan null bila pengguna mematikan kategorinya, atau bila
     * `dedupeKey` yang sama sudah pernah dipakai — pemanggil tidak perlu tahu
     * bedanya, cukup panggil dan lupakan.
     *
     * `data` berisi PARAMETER kalimat (mis. ['trip' => 'Bali']), bukan kalimat
     * jadi — perakitannya di frontend lewat t() agar ikut bahasa aktif.
     *
     * Dinamai `send()` dan bukan `push()`: Eloquent\Model sudah punya method
     * push() non-static, jadi nama itu tidak bisa dipakai.
     */
    public static function send(
        ?int $userId,
        string $type,
        array $data = [],
        ?string $url = null,
        ?string $dedupeKey = null,
    ): ?self {
        if (! $userId) {
            return null;
        }

        $category = self::categoryOf($type);
        if (! $category) {
            return null;
        }

        $user = User::find($userId);
        if (! $user || ! $user->wantsNotification($category)) {
            return null;
        }

        $attributes = [
            'user_id'  => $userId,
            'type'     => $type,
            'category' => $category,
            'data'     => $data,
            'url'      => $url,
        ];

        if (! $dedupeKey) {
            return self::create($attributes);
        }

        // firstOrCreate + indeks unik pada dedupe_key: aman walau webhook Midtrans
        // dan sync manual datang bersamaan.
        return self::firstOrCreate(['dedupe_key' => $dedupeKey], $attributes);
    }

    /** Kategori yang menaungi sebuah tipe; null bila tipe tidak dikenal. */
    public static function categoryOf(string $type): ?string
    {
        foreach (self::CATEGORIES as $category => $types) {
            if (in_array($type, $types, true)) {
                return $category;
            }
        }

        return null;
    }
}
