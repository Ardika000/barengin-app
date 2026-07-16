<?php

namespace App\Http\Controllers\Chat;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Carbon;

class ChatController extends Controller
{
    // Ambang "online": user dianggap online bila last_seen_at dalam rentang ini.
    // Sedikit lebih besar dari irama heartbeat/poll agar toleran jitter jaringan.
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

        $conversations = $this->sidebarConversations($user);

        $conversation->load([
            'participants:id,full_name,profile_image',
            'trip:id,name,guider_id,image,start_date,end_date',
            'pergi_bareng:id,name,img_name,initiator_id,time_appointment',
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

        $headerAvatar = $conversation->is_group
            ? ($this->groupAvatar($conversation) ?? asset('assets/default-profile.png'))
            : ($peer?->public_profile_image ?? asset('assets/default-profile.png'));

        // Kartu referensi tersemat (opsional) dari query — hanya untuk chat personal.
        $pendingReference = $conversation->is_group
            ? null
            : $this->buildReference(request()->query('ref_type'), request()->query('ref_id'));

        // "Sekali saja": bila kartu referensi (trip / pergi bareng) ini sudah pernah
        // dikirim di percakapan ini, jangan tampilkan lagi di komposer. Tanpa ini,
        // karena storeMessage me-`back()` ke URL yang masih membawa ref_id/ref_type,
        // kartu akan menempel ulang pada setiap pesan berikutnya.
        if ($pendingReference && $this->referenceAlreadySent($conversation, $pendingReference)) {
            $pendingReference = null;
        }

        return Inertia::render('Chat/Show', [
            'conversations' => $conversations,
            'conversation' => [
                'id' => $conversation->id,
                'is_group' => (bool) $conversation->is_group,
                'title' => $title ?? 'Chat',
                'avatar' => $headerAvatar,
                'peer_last_read_at' => $peerLastReadAt,
                'owner_id' => $ownerId ? (int) $ownerId : null,
                'is_owner' => $ownerId !== null && (int) $ownerId === (int) $user->id,
                // Baris pembeda untuk grup (tanggal/jam), agar grup dengan nama
                // sama — mis. beberapa "Pergi Bareng" ke rute yang sama — bisa
                // dibedakan.
                'group_meta' => $conversation->is_group ? $this->groupMeta($conversation) : null,
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
            // Pesan yang dibalas harus berada di percakapan yang sama.
            'reply_to_id' => [
                'nullable',
                'integer',
                Rule::exists('messages', 'id')->where('conversation_id', $conversation->id),
            ],
            // Kartu referensi opsional (Trip / Pergi Bareng) untuk pesan pertama.
            'reference_type' => ['nullable', 'in:trip,pergi_bareng'],
            'reference_id' => ['nullable', 'integer'],
            // Banyak lampiran (gambar/PDF), masing-masing maksimal 5MB.
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

        // Bangun snapshot referensi (server-authoritative, tidak mempercayai klien).
        $reference = $this->buildReference(
            $data['reference_type'] ?? null,
            $data['reference_id'] ?? null,
        );

        if (! $text && empty($files) && ! $reference) {
            throw ValidationException::withMessages(['message_text' => 'Pesan kosong.']);
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

        // Muat relasi untuk respons ringan (dan dipakai kembali oleh event).
        $message->load(['sender:id,full_name,profile_image', 'replyTo.sender:id,full_name']);

        // Broadcast ke Pusher SETELAH respons dikirim ke pengirim (terminating),
        // agar pengirim tidak menunggu round-trip HTTP ke Pusher. Recipient tetap
        // menerima ~instan; bila meleset, polling fallback (3s) menambalnya.
        app()->terminating(function () use ($message) {
            broadcast(new MessageSent($message))->toOthers();
        });

        // Respons ringan berisi HANYA pesan baru. Ini menghindari `back()` yang
        // memaksa Inertia memuat ULANG seluruh props halaman chat (rebuild sidebar
        // untuk semua percakapan + semua pesan) pada SETIAP kirim — penyebab
        // utama pengiriman terasa lambat.
        return response()->json(['message' => $this->mapMessage($message)]);
    }

    /**
     * Fallback polling untuk pesan baru (dipakai bila WebSocket/Pusher tidak
     * tersedia, mis. di shared hosting). Mengembalikan pesan dari LAWAN BICARA
     * dengan id > `after` (mirror `->toOthers()` agar tak menduplikasi pesan
     * optimistik pengirim), plus status baca & online lawan.
     */
    public function pollMessages(Request $request, Conversation $conversation)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        abort_unless(
            $conversation->participants()->where('users.id', $user->id)->exists(),
            403,
            'Kamu bukan partisipan pada percakapan ini'
        );

        // Poll sekaligus jadi heartbeat kehadiran (agar lawan melihat kita online).
        $this->touchLastSeen($user);

        $afterId = (int) $request->query('after', 0);

        $messages = $conversation->messages()
            ->where('id', '>', $afterId)
            ->where('sender_id', '!=', $user->id)
            ->with(['sender:id,full_name,profile_image', 'replyTo.sender:id,full_name'])
            ->orderBy('id')
            ->get()
            ->map(fn ($m) => $this->mapMessage($m));

        // Presence & read-receipt lawan (khusus chat personal).
        $peer = $conversation->is_group
            ? null
            : $conversation->participants()->where('users.id', '!=', $user->id)->first();

        $peerLastRead = $peer?->pivot?->last_read_at
            ? Carbon::parse($peer->pivot->last_read_at)->toISOString()
            : null;

        return response()->json([
            'messages' => $messages->values(),
            'peer_last_read_at' => $peerLastRead,
            'peer_online' => $this->isOnline($peer?->last_seen_at),
            'peer_last_seen_at' => $peer?->last_seen_at
                ? Carbon::parse($peer->last_seen_at)->toISOString()
                : null,
        ]);
    }

    /**
     * Fallback polling untuk daftar percakapan (sidebar): memunculkan chat baru,
     * pesan terakhir, dan jumlah belum dibaca tanpa perlu refresh manual.
     */
    public function pollConversations()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $this->touchLastSeen($user);

        return response()->json([
            'conversations' => $this->sidebarConversations($user),
        ]);
    }

    /** Perbarui last_seen_at dengan throttle agar tidak menulis DB tiap poll. */
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

    /** Bentuk data pesan yang konsisten untuk render awal & polling. */
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

    /**
     * Bangun snapshot kartu referensi Trip / Pergi Bareng dari (type, id).
     * Dipakai untuk kartu tersemat di komposer (show) dan untuk disimpan pada
     * pesan (storeMessage) sehingga tampil sebagai kartu di gelembung chat.
     */
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

        return null;
    }

    /**
     * Apakah kartu referensi (trip / pergi bareng) yang sama sudah pernah dikirim
     * pada percakapan ini? Dibandingkan berdasarkan type + id snapshot. DB-agnostic
     * (tidak bergantung pada query path JSON) dan hanya memuat pesan yang berreferensi.
     */
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

    /** Daftar lampiran pesan; jatuh balik ke kolom lama untuk pesan lama. */
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

    /** Ringkasan pesan yang dibalas (untuk kutipan di gelembung). */
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
                    // Dukung pesan lampiran-banyak (JSON) & pesan lama (kolom tunggal).
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
                    'last_message_at' => $lastMessage?->created_at?->toISOString(),
                    'unread' => $unread,
                ];
            })
            ->sortByDesc(fn ($c) => $c['last_message_at'] ?? 0)
            ->values();
    }

    /**
     * Baris pembeda ("meta") untuk grup: menampilkan waktu agar dua grup dengan
     * nama sama tetap bisa dibedakan.
     *  - Trip        : rentang tanggal ("d M Y – d M Y").
     *  - Pergi Bareng: tanggal & jam keberangkatan ("d M Y, H:i").
     *  - Jastip      : tidak ada (nama produk sudah unik).
     */
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

    /**
     * Judul grup: trip & pergi bareng pakai namanya; grup jastip diberi format
     * "Jastip: {nama produk} Group" agar selaras dengan gambar produknya.
     */
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

    /**
     * Avatar grup: untuk grup trip pakai gambar utama trip, grup pergi bareng
     * pakai gambarnya, dan grup jastip pakai gambar pertama produknya.
     * Mengembalikan null untuk grup lain sehingga pemanggil memakai fallback-nya.
     */
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

    /** Ubah path gambar produk jastip menjadi URL <img>; null bila tak ada. */
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

    /**
     * Ubah path gambar trip dari DB menjadi URL yang bisa dipakai <img>.
     * Konsisten dengan TripsController::resolveTripImage.
     */
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