<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Bukan `Notification` karena bentrok dengan relasi bawaan trait Notifiable.
class UserNotification extends Model
{
    // Kategori = kunci preferensi di users.notification_prefs.
    public const CATEGORY_PERGI_BARENG   = 'pergi_bareng';
    public const CATEGORY_GROUP          = 'group';
    public const CATEGORY_ORDER          = 'order';
    public const CATEGORY_PAYMENT        = 'payment';
    public const CATEGORY_SPLIT_BILL     = 'split_bill';
    public const CATEGORY_JASTIP_REQUEST = 'jastip_request';
    public const CATEGORY_SELLING        = 'selling';
    public const CATEGORY_WALLET         = 'wallet';
    public const CATEGORY_FORUM          = 'forum';
    public const CATEGORY_ACTIVITY       = 'activity';

    // Kategori yang bisa dimatikan pengguna, berikut tipe di dalamnya.
    public const CATEGORIES = [
        self::CATEGORY_PERGI_BARENG => [
            'pergi_bareng.approved',
            'pergi_bareng.rejected',
            'pergi_bareng.requested',
        ],
        self::CATEGORY_GROUP        => ['group.joined', 'group.removed'],
        self::CATEGORY_ORDER        => ['order.created'],
        self::CATEGORY_PAYMENT      => ['payment.paid'],
        self::CATEGORY_SPLIT_BILL   => ['split_bill.created', 'split_bill.settled'],
        self::CATEGORY_JASTIP_REQUEST => [
            'jastip_request.quoted',
            'jastip_request.rejected',
        ],
        self::CATEGORY_SELLING => ['selling.order_paid', 'selling.request_received'],
        self::CATEGORY_WALLET => ['wallet.credited', 'wallet.debited'],
        self::CATEGORY_FORUM => ['forum.followed'],
        self::CATEGORY_ACTIVITY => [
            'activity.trip_ongoing',
            'activity.trip_finished',
            'activity.pergi_bareng_ongoing',
            'activity.pergi_bareng_finished',
            'activity.jastip_pickup',
            'activity.jastip_finished',
        ],
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

    // $data berisi parameter kalimat (['trip' => 'Bali']), bukan kalimat jadi.
    // Dirakit di frontend lewat t() supaya ikut bahasa aktif.
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

        // Indeks unik dedupe_key: aman walau webhook & sync manual datang bareng.
        return self::firstOrCreate(['dedupe_key' => $dedupeKey], $attributes);
    }

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
