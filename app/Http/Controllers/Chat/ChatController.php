<?php

namespace App\Http\Controllers\Chat;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Carbon;

class ChatController extends Controller
{
    // Sengaja lebih longgar dari irama heartbeat/poll biar toleran jitter jaringan.
    private const ONLINE_WINDOW_SECONDS = 90;

    public function index()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->forceFill(['last_seen_at' => now()])->save();

        $conversations = $this->sidebarConversations($user);

        return Inertia::render('Chat/Index', [
            'conversations' => $conversations,
        ]);
    }

    public function show(Conversation $conversation)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->forceFill(['last_seen_at' => now()])->save();

        abort_unless(
            $conversation->participants()->where('users.id', $user->id)->exists(),
            403,
            'Kamu bukan partisipan pada percakapan ini'
        );

        $this->shareTrackCardIfOngoing($conversation);

        $conversations = $this->sidebarConversations($user);

        $conversation->load([
            'participants:id,full_name,profile_image',
            // `status`/`finished_at` wajib ikut, kalau tidak status() selalu null.
            'trip:id,name,guider_id,image,start_date,end_date,status,finished_at',
            'pergi_bareng:id,name,img_name,initiator_id,time_appointment,finished_at',
            'jastip_item:id,name,user_id',
            'jastip_item.jastip_item_images:id,jastip_item_id,image_name',
        ]);

        $peer = $conversation->participants->firstWhere('id', '!=', $user->id);
        $peerLastReadAt = $peer?->pivot?->last_read_at
            ? Carbon::parse($peer->pivot->last_read_at)->toISOString()
            : null;

        $title = $conversation->is_group
            ? $this->groupTitle($conversation)
            : optional($conversation->participants->firstWhere('id', '!=', $user->id))->full_name;

        $ownerId = $conversation->is_group
            ? ($conversation->trip?->guider_id ?? $conversation->pergi_bareng?->initiator_id ?? $conversation->jastip_item?->user_id)
            : null;

        $messages = $conversation->messages()
            ->with(['sender:id,full_name,profile_image', 'replyTo.sender:id,full_name'])
            ->orderBy('created_at')
            ->get()
            ->map(fn ($m) => $this->mapMessage($m));

        $this->syncPendingSplitBills($messages); // localhost tak punya webhook publik

        $headerAvatar = $conversation->is_group
            ? ($this->groupAvatar($conversation) ?? asset('assets/default-profile.png'))
            : ($peer?->public_profile_image ?? asset('assets/default-profile.png'));

        $pendingReference = $conversation->is_group
            ? null
            : $this->buildReference(request()->query('ref_type'), request()->query('ref_id'));

        // storeMessage back() ke URL yang masih bawa ref_id, tanpa ini kartunya nempel terus.
        if ($pendingReference && $this->referenceAlreadySent($conversation, $pendingReference)) {
            $pendingReference = null;
        }

        return Inertia::render('Chat/Show', [
            'conversations' => $conversations,
            // Kartu di pesan isinya beku, status terkini dikirim terpisah.
            'splitBills' => $this->splitBillStates($messages, $user),
            'trackStates' => $this->trackStates($messages),
            'midtrans_client_key' => config('midtrans.client_key'),
            'conversation' => [
                'id' => $conversation->id,
                'is_group' => (bool) $conversation->is_group,
                'title' => $title ?? 'Chat',
                'avatar' => $headerAvatar,
                'peer_last_read_at' => $peerLastReadAt,
                'owner_id' => $ownerId ? (int) $ownerId : null,
                'is_owner' => $ownerId !== null && (int) $ownerId === (int) $user->id,
                'group_meta' => $conversation->is_group ? $this->groupMeta($conversation) : null,
                'group_type' => $conversation->is_group ? $this->groupType($conversation) : null,
                'group_url' => $conversation->is_group ? $this->groupUrl($conversation) : null,
                'group_status' => $conversation->is_group ? $this->groupStatus($conversation) : null,
                'participants' => $conversation->participants->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->full_name,
                    'avatar' => $p->public_profile_image ?? asset('assets/default-profile.png'),
                    'last_seen_at' => $p->last_seen_at
                        ? Carbon::parse($p->last_seen_at)->toISOString()
                        : null,
                ])->values(),
            ],
            'messages' => $messages,
            'pendingReference' => $pendingReference,
        ]);
    }

    public function storeMessage(Request $request, Conversation $conversation)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->forceFill(['last_seen_at' => now()])->save();

        abort_unless(
            $conversation->participants()->where('users.id', $user->id)->exists(),
            403,
            'You are not a participant of this conversation.'
        );

        $data = $request->validate([
            'message_text' => ['nullable', 'string', 'max:5000'],
            'reply_to_id' => [
                'nullable',
                'integer',
                Rule::exists('messages', 'id')->where('conversation_id', $conversation->id),
            ],
            'reference_type' => ['nullable', 'in:trip,pergi_bareng,jastip'],
            'reference_id' => ['nullable', 'integer'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => [
                'file',
                function ($attribute, $value, $fail) {
                    if (! $value) return;

                    $mime = $value->getMimeType();
                    $size = $value->getSize();

                    $imageMimes = ['image/jpeg', 'image/png', 'image/webp'];
                    $pdfMime = 'application/pdf';

                    if (in_array($mime, $imageMimes, true)) {
                        if ($size > 5 * 1024 * 1024) {
                            $fail('Gambar maksimal 5MB.');
                        }
                        return;
                    }

                    if ($mime === $pdfMime) {
                        if ($size > 5 * 1024 * 1024) {
                            $fail('PDF maksimal 5MB.');
                        }
                        return;
                    }

                    $fail('File harus berupa jpg, jpeg, png, webp, atau pdf.');
                },
            ],
        ]);

        $text = $data['message_text'] ?? '';
        $files = $request->file('attachments', []);

        // Dibangun ulang di server, jangan percaya kiriman klien.
        $reference = $this->buildReference(
            $data['reference_type'] ?? null,
            $data['reference_id'] ?? null,
        );

        if (! $text && empty($files) && ! $reference) {
            return back()->withErrors(['message_text' => 'Pesan kosong.']);
        }

        $attachments = [];
        foreach ($files as $file) {
            $attachments[] = [
                'path' => $file->store('chat-attachments', 'public'),
                'type' => $file->getMimeType(),
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
            ];
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'reply_to_id' => $data['reply_to_id'] ?? null,
            'message_text' => $text,
            'attachments' => $attachments ?: null,
            'reference' => $reference,
        ]);

        broadcast(new MessageSent($message))->toOthers();

        return back();
    }

    // Fallback kalau WebSocket mati. Cuma pesan lawan, mirror `->toOthers()` biar tak dobel.
    public function pollMessages(Request $request, Conversation $conversation)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        abort_unless(
            $conversation->participants()->where('users.id', $user->id)->exists(),
            403,
            'Kamu bukan partisipan pada percakapan ini'
        );

        $this->touchLastSeen($user);

        // Harus sebelum pesan diambil, biar kartunya ikut di tick yang sama.
        $this->shareTrackCardIfOngoing($conversation);

        $afterId = (int) $request->query('after', 0);

        $messages = $conversation->messages()
            ->where('id', '>', $afterId)
            ->where('sender_id', '!=', $user->id)
            ->with(['sender:id,full_name,profile_image', 'replyTo.sender:id,full_name'])
            ->orderBy('id')
            ->get()
            ->map(fn ($m) => $this->mapMessage($m));

        $peer = $conversation->is_group
            ? null
            : $conversation->participants()->where('users.id', '!=', $user->id)->first();

        $peerLastRead = $peer?->pivot?->last_read_at
            ? Carbon::parse($peer->pivot->last_read_at)->toISOString()
            : null;

        $referenceMessages = $this->referenceMessages($conversation);
        $this->syncPendingSplitBills($referenceMessages);

        return response()->json([
            'messages' => $messages->values(),
            'peer_last_read_at' => $peerLastRead,
            'peer_online' => $this->isOnline($peer?->last_seen_at),
            'peer_last_seen_at' => $peer?->last_seen_at
                ? Carbon::parse($peer->last_seen_at)->toISOString()
                : null,
            'splitBills' => $this->splitBillStates($referenceMessages, $user),
            'trackStates' => $this->trackStates($referenceMessages),
            'group_status' => $conversation->is_group
                ? $this->groupStatus($conversation->loadMissing(['trip', 'pergi_bareng']))
                : null,
        ]);
    }

    // Tanpa ini kartu lama terus menawarkan peta live walau perjalanan/pengambilan
    // sudah ditutup. Kunci state-nya per jenis kartu karena id-nya bisa bentrok.
    private function trackStates($messages): array
    {
        $idsOf = fn (string $type) => collect($messages)
            ->map(fn ($m) => ($m['reference']['type'] ?? null) === $type
                ? (int) ($m['reference']['id'] ?? 0)
                : null)
            ->filter()
            ->unique()
            ->values();

        $states = [];

        $pergiIds = $idsOf('pergi_track');
        if ($pergiIds->isNotEmpty()) {
            foreach (\App\Models\PergiBareng::whereIn('id', $pergiIds)->get() as $trip) {
                $states['pergi_track'][$trip->id] = ['status' => $trip->status()];
            }
        }

        $jastipIds = $idsOf('jastip_track');
        if ($jastipIds->isNotEmpty()) {
            foreach (\App\Models\JastipItem::whereIn('id', $jastipIds)->get() as $item) {
                // Kartunya menutup diri begitu masa pengambilan lewat; sisi klien
                // cuma mengenal hidup/selesai, jadi dipetakan ke dua nilai itu.
                $states['jastip_track'][$item->id] = [
                    'status' => $item->jastiperStatus() === 'pickup_time' ? 'ongoing' : 'finish',
                ];
            }
        }

        return $states;
    }

    // Dipanggil dari show & polling supaya tetap jalan di hosting tanpa cron. share() idempoten.
    private function shareTrackCardIfOngoing(Conversation $conversation): void
    {
        if (! $conversation->is_group) {
            return;
        }

        if ($conversation->pergi_bareng_id) {
            $trip = \App\Models\PergiBareng::find($conversation->pergi_bareng_id);

            if ($trip) {
                \App\Services\Chat\PergiBarengTrackShare::share($trip);
            }
        }

        if ($conversation->jastip_item_id) {
            $item = \App\Models\JastipItem::find($conversation->jastip_item_id);

            if ($item) {
                \App\Services\Chat\JastipTrackShare::share($item);
            }
        }
    }

    private function referenceMessages(Conversation $conversation)
    {
        return $conversation->messages()
            ->whereNotNull('reference')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($m) => $this->mapMessage($m));
    }

    public function pollConversations()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $this->touchLastSeen($user);

        return response()->json([
            'conversations' => $this->sidebarConversations($user),
        ]);
    }

    public static function unreadCountFor($user): int
    {
        if (! $user) {
            return 0;
        }

        return (int) \Illuminate\Support\Facades\DB::table('messages as m')
            ->join('conversation_participants as cp', function ($join) use ($user) {
                $join->on('cp.conversation_id', '=', 'm.conversation_id')
                    ->where('cp.user_id', '=', $user->id);
            })
            ->where('m.sender_id', '!=', $user->id)
            ->where(function ($q) {
                $q->whereNull('cp.last_read_at')
                    ->orWhereColumn('m.created_at', '>', 'cp.last_read_at');
            })
            ->count();
    }

    public function unreadCount(Request $request)
    {
        return response()->json(['count' => self::unreadCountFor($request->user())]);
    }

    private function touchLastSeen($user): void
    {
        if (! $user->last_seen_at || $user->last_seen_at->lt(now()->subSeconds(15))) {
            $user->forceFill(['last_seen_at' => now()])->saveQuietly();
        }
    }

    private function isOnline($lastSeenAt): bool
    {
        return $lastSeenAt
            && Carbon::parse($lastSeenAt)->gt(now()->subSeconds(self::ONLINE_WINDOW_SECONDS));
    }

    private function mapMessage(Message $m): array
    {
        return [
            'id' => $m->id,
            'conversation_id' => $m->conversation_id,
            'sender_id' => $m->sender_id,
            'text' => $m->message_text,
            'created_at' => $m->created_at?->toISOString(),
            'attachments' => self::mapAttachments($m),
            'reply_to' => $this->mapReply($m->replyTo),
            'reference' => $m->reference ?: null,
            'sender' => [
                'id' => $m->sender?->id,
                'name' => $m->sender?->full_name,
                'avatar' => $m->sender?->public_profile_image ?? asset('assets/default-profile.png'),
            ],
        ];
    }

    private function buildReference(?string $type, $id): ?array
    {
        if (! $type || ! $id) {
            return null;
        }

        if ($type === 'trip') {
            $trip = \App\Models\Trip::find($id);
            if (! $trip) {
                return null;
            }

            return [
                'type' => 'trip',
                'id' => (int) $trip->id,
                'title' => $trip->name,
                'image_url' => $this->resolveTripImage($trip->image),
                'subtitle' => $trip->location ?? null,
                'url' => '/trip-bareng/' . $trip->id,
            ];
        }

        if ($type === 'pergi_bareng') {
            $pb = \App\Models\PergiBareng::find($id);
            if (! $pb) {
                return null;
            }

            $img = $pb->img_name;
            if (! $img) {
                $imageUrl = asset('assets/default-image.png');
            } elseif (str_starts_with($img, 'http://') || str_starts_with($img, 'https://') || str_starts_with($img, '/')) {
                $imageUrl = $img;
            } else {
                $imageUrl = asset('storage/' . $img);
            }

            return [
                'type' => 'pergi_bareng',
                'id' => (int) $pb->id,
                'title' => $pb->name,
                'image_url' => $imageUrl,
                'subtitle' => $pb->destination_loc ?? null,
                'url' => '/pergi-bareng/' . $pb->id,
            ];
        }

        if ($type === 'jastip') {
            $item = \App\Models\JastipItem::with('jastip_item_images:id,jastip_item_id,image_name')->find($id);
            if (! $item) {
                return null;
            }

            return [
                'type' => 'jastip',
                'id' => (int) $item->id,
                'title' => $item->name,
                'image_url' => $this->resolveJastipImage(
                    $item->jastip_item_images->first()?->image_name
                ) ?? asset('assets/default-image.png'),
                'subtitle' => $item->purchase_city ?? $item->pickup_city ?? null,
                'url' => '/jastip/' . $item->id,
            ];
        }

        return null;
    }

    // Dicek di PHP, bukan query path JSON, biar tak terikat dialek DB.
    private function referenceAlreadySent(Conversation $conversation, array $reference): bool
    {
        $type = $reference['type'] ?? null;
        $id = (int) ($reference['id'] ?? 0);

        if (! $type || ! $id) {
            return false;
        }

        return $conversation->messages()
            ->whereNotNull('reference')
            ->get(['reference'])
            ->contains(function (Message $m) use ($type, $id) {
                $ref = $m->reference;
                return is_array($ref)
                    && ($ref['type'] ?? null) === $type
                    && (int) ($ref['id'] ?? 0) === $id;
            });
    }

    // Fallback ke kolom tunggal untuk pesan lama.
    public static function mapAttachments(Message $m): array
    {
        $list = [];

        if (is_array($m->attachments) && count($m->attachments)) {
            foreach ($m->attachments as $a) {
                $list[] = [
                    'url' => self::attachmentUrl($a['path'] ?? null),
                    'type' => $a['type'] ?? null,
                    'name' => $a['name'] ?? null,
                    'size' => $a['size'] ?? null,
                ];
            }
        } elseif ($m->attachment_path) {
            $list[] = [
                'url' => self::attachmentUrl($m->attachment_path),
                'type' => $m->attachment_type,
                'name' => $m->attachment_name,
                'size' => $m->attachment_size,
            ];
        }

        return $list;
    }

    private static function attachmentUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }
        return asset('storage/'.$path);
    }

    public static function mapReply(?Message $reply): ?array
    {
        if (! $reply) {
            return null;
        }

        return [
            'id' => $reply->id,
            'sender_name' => $reply->sender?->full_name ?? 'Pengguna',
            'text' => $reply->message_text,
            'attachment_type' => $reply->attachment_type,
            'has_attachment' => (bool) $reply->attachment_path,
        ];
    }

    private function sidebarConversations($user)
    {
        return $user->conversations()
            ->with([
                'participants:id,full_name,profile_image',
                'trip:id,name,image,start_date,end_date',
                'pergi_bareng:id,name,img_name,time_appointment',
                'jastip_item:id,name,user_id',
                'jastip_item.jastip_item_images:id,jastip_item_id,image_name',
            ])
            ->get()
            ->map(function ($c) use ($user) {
                $lastMessage = $c->messages()->latest()->with('sender:id,full_name')->first();

                $title = $c->is_group
                    ? $this->groupTitle($c)
                    : optional($c->participants->firstWhere('id', '!=', $user->id))->full_name;

                $avatar = $c->is_group
                    ? ($this->groupAvatar($c) ?? asset('assets/default-profile.png'))
                    : ($c->participants->firstWhere('id', '!=', $user->id)?->public_profile_image ?? asset('assets/default-profile.png'));

                $me = $c->participants->firstWhere('id', $user->id);
                $lastReadAt = $me?->pivot?->last_read_at;

                $unread = $lastReadAt
                    ? $c->messages()
                        ->where('sender_id', '!=', $user->id)
                        ->where('created_at', '>', $lastReadAt)
                        ->count()
                    : $c->messages()
                        ->where('sender_id', '!=', $user->id)
                        ->count();

                $subtitle = $lastMessage?->message_text;
                if (! $subtitle && $lastMessage) {
                    $type = self::mapAttachments($lastMessage)[0]['type'] ?? null;
                    if ($type) {
                        if (str_starts_with($type, 'image/')) {
                            $subtitle = 'Foto';
                        } elseif ($type === 'application/pdf') {
                            $subtitle = 'PDF';
                        } else {
                            $subtitle = 'Lampiran';
                        }
                    }
                }

                return [
                    'id' => $c->id,
                    'is_group' => (bool) $c->is_group,
                    'title' => $title ?? 'Chat',
                    'avatar' => $avatar,
                    'subtitle' => $subtitle ?? '',
                    'group_meta' => $c->is_group ? $this->groupMeta($c) : null,
                    'group_type' => $c->is_group ? $this->groupType($c) : null,
                    'group_url' => $c->is_group ? $this->groupUrl($c) : null,
                    'last_message_at' => $lastMessage?->created_at?->toISOString(),
                    'unread' => $unread,
                ];
            })
            ->sortByDesc(fn ($c) => $c['last_message_at'] ?? 0)
            ->values();
    }

    // Pembeda buat grup yang namanya kembar. Jastip null, namanya sudah unik.
    private function groupMeta(Conversation $conversation): ?string
    {
        if ($conversation->trip && $conversation->trip->start_date) {
            $start = Carbon::parse($conversation->trip->start_date)->translatedFormat('d M Y');
            $end = $conversation->trip->end_date
                ? Carbon::parse($conversation->trip->end_date)->translatedFormat('d M Y')
                : null;

            return ($end && $end !== $start) ? "$start – $end" : $start;
        }

        if ($conversation->pergi_bareng && $conversation->pergi_bareng->time_appointment) {
            return Carbon::parse($conversation->pergi_bareng->time_appointment)
                ->translatedFormat('d M Y, H:i');
        }

        return null;
    }

    // Perlu di localhost yang tanpa webhook publik.
    private function syncPendingSplitBills($messages): void
    {
        $ids = collect($messages)
            ->map(fn ($m) => ($m['reference']['type'] ?? null) === 'split_bill'
                ? (int) ($m['reference']['id'] ?? 0)
                : null)
            ->filter()
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return;
        }

        $transactionIds = \App\Models\SplitBillShare::whereIn('split_bill_id', $ids)
            ->where('status', \App\Models\SplitBillShare::STATUS_PENDING)
            ->whereNotNull('transaction_id')
            ->pluck('transaction_id')
            ->unique();

        foreach ($transactionIds as $transactionId) {
            \App\Http\Controllers\MidtransController::syncTransaction($transactionId);
        }
    }

    // Penyelenggara dapat rekap semua anggota, anggota biasa hanya bagiannya.
    private function splitBillStates($messages, $user): array
    {
        $ids = collect($messages)
            ->map(fn ($m) => ($m['reference']['type'] ?? null) === 'split_bill'
                ? (int) ($m['reference']['id'] ?? 0)
                : null)
            ->filter()
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $balance = (float) \App\Models\Wallet::forUser((int) $user->id)->balance;

        return \App\Models\SplitBill::with(['shares.user:id,full_name,profile_image'])
            ->whereIn('id', $ids)
            ->get()
            ->mapWithKeys(function ($bill) use ($user, $balance) {
                $isCreator = (int) $bill->creator_id === (int) $user->id;
                $mine = $bill->shares->firstWhere('user_id', $user->id);

                return [$bill->id => [
                    'id' => $bill->id,
                    'title' => $bill->title,
                    'note' => $bill->note,
                    'total_amount' => (float) $bill->total_amount,
                    'status' => $bill->status,
                    'is_creator' => $isCreator,
                    'paid_count' => $bill->shares->where('status', \App\Models\SplitBillShare::STATUS_PAID)->count(),
                    'share_count' => $bill->shares->count(),
                    'wallet_balance' => $balance,
                    'my_share' => $mine ? [
                        'id' => $mine->id,
                        'amount' => (float) $mine->amount,
                        'status' => $mine->status,
                    ] : null,
                    'shares' => $isCreator
                        ? $bill->shares->map(fn ($s) => [
                            'id' => $s->id,
                            'name' => $s->user?->full_name ?? 'Pengguna',
                            'avatar' => $s->user?->public_profile_image ?? asset('assets/default-profile.png'),
                            'amount' => (float) $s->amount,
                            'status' => $s->status,
                        ])->values()
                        : [],
                ]];
            })
            ->all();
    }

    // Sumbernya sengaja sama dengan halaman detail biar lencananya tak pernah beda.
    private function groupStatus(Conversation $conversation): ?string
    {
        if ($conversation->pergi_bareng) {
            return match ($conversation->pergi_bareng->status()) {
                'will_start' => 'waiting',
                'ongoing'    => 'ongoing',
                'finish'     => 'finished',
                default      => null,
            };
        }

        if ($conversation->trip) {
            return match ($conversation->trip->status) {
                \App\Models\Trip::STATUS_DRAFT, \App\Models\Trip::STATUS_CREATED => 'waiting',
                \App\Models\Trip::STATUS_ONGOING => 'ongoing',
                \App\Models\Trip::STATUS_DONE    => 'finished',
                default => null,
            };
        }

        return null;
    }

    private function groupType(Conversation $conversation): ?string
    {
        if ($conversation->trip) {
            return 'trip';
        }
        if ($conversation->pergi_bareng) {
            return 'pergi_bareng';
        }
        if ($conversation->jastip_item) {
            return 'jastip';
        }

        return null;
    }

    private function groupUrl(Conversation $conversation): ?string
    {
        if ($conversation->trip) {
            return '/trip-bareng/' . $conversation->trip->id;
        }
        if ($conversation->pergi_bareng) {
            return '/pergi-bareng/' . $conversation->pergi_bareng->id;
        }
        if ($conversation->jastip_item) {
            return '/jastip/' . $conversation->jastip_item->id;
        }

        return null;
    }

    private function groupTitle(Conversation $conversation): string
    {
        if ($conversation->trip) {
            return $conversation->trip->name;
        }

        if ($conversation->pergi_bareng) {
            return $conversation->pergi_bareng->name;
        }

        if ($conversation->jastip_item) {
            return 'Jastip: ' . $conversation->jastip_item->name . ' Group';
        }

        return 'Group';
    }

    // null kalau grup tak punya induk, pemanggil yang pasang fallback.
    private function groupAvatar(Conversation $conversation): ?string
    {
        if ($conversation->trip) {
            return $this->resolveTripImage($conversation->trip->image);
        }

        if ($conversation->pergi_bareng) {
            $img = $conversation->pergi_bareng->img_name;

            if (! $img) {
                return asset('assets/default-image.png');
            }

            if (str_starts_with($img, 'http://') || str_starts_with($img, 'https://') || str_starts_with($img, '/')) {
                return $img;
            }

            return asset('storage/' . $img);
        }

        if ($conversation->jastip_item) {
            return $this->resolveJastipImage(
                $conversation->jastip_item->jastip_item_images->first()?->image_name
            );
        }

        return null;
    }

    private function resolveJastipImage(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return asset('storage/' . $path);
    }

    // Harus konsisten dengan TripsController::resolveTripImage.
    private function resolveTripImage(?string $path): string
    {
        $fallback = asset('assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg');

        if (! $path) {
            return $fallback;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $path;
        }

        return asset('storage/' . $path);
    }
}