<?php

namespace App\Http\Controllers\Chat;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Carbon;

class ChatController extends Controller
{
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
            'trip:id,name',
            'pergi_bareng:id,name',
        ]);

        $peer = $conversation->participants->firstWhere('id', '!=', $user->id);
        $peerLastReadAt = $peer?->pivot?->last_read_at
            ? Carbon::parse($peer->pivot->last_read_at)->toISOString()
            : null;

        $title = $conversation->is_group
            ? ($conversation->trip?->name ?? $conversation->pergi_bareng?->name ?? 'Group')
            : optional($conversation->participants->firstWhere('id', '!=', $user->id))->full_name;

        $messages = $conversation->messages()
            ->with('sender:id,full_name,profile_image')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'conversation_id' => $m->conversation_id,
                'sender_id' => $m->sender_id,
                'text' => $m->message_text,
                'created_at' => $m->created_at?->toISOString(),
                'attachment_url' => $m->attachment_path
                    ? asset('storage/'.$m->attachment_path)
                    : null,
                'attachment_type' => $m->attachment_type,
                'attachment_name' => $m->attachment_name,
                'attachment_size' => $m->attachment_size,
                'sender' => [
                    'id' => $m->sender?->id,
                    'name' => $m->sender?->full_name,
                    'avatar' => $m->sender?->public_profile_image ?? asset('assets/default-profile.png'),
                ],
            ]);

        return Inertia::render('Chat/Show', [
            'conversations' => $conversations,
            'conversation' => [
                'id' => $conversation->id,
                'is_group' => (bool) $conversation->is_group,
                'title' => $title ?? 'Chat',
                'peer_last_read_at' => $peerLastReadAt,
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
            'attachment' => [
                'nullable',
                'file',
                function ($attribute, $value, $fail) {
                    if (! $value) return;

                    $mime = $value->getMimeType();
                    $size = $value->getSize();

                    $imageMimes = ['image/jpeg', 'image/png', 'image/webp'];
                    $pdfMime = 'application/pdf';

                    if (in_array($mime, $imageMimes, true)) {
                        if ($size > 3 * 1024 * 1024) {
                            $fail('Gambar maksimal 3MB.');
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
        $file = $request->file('attachment');

        if (! $text && ! $file) {
            return back()->withErrors(['message_text' => 'Pesan kosong.']);
        }

        $attachmentPath = null;
        $attachmentType = null;
        $attachmentName = null;
        $attachmentSize = null;

        if ($file) {
            $attachmentPath = $file->store('chat-attachments', 'public');
            $attachmentType = $file->getMimeType();
            $attachmentName = $file->getClientOriginalName();
            $attachmentSize = $file->getSize();
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'message_text' => $text,
            'attachment_path' => $attachmentPath,
            'attachment_type' => $attachmentType,
            'attachment_name' => $attachmentName,
            'attachment_size' => $attachmentSize,
        ]);

        broadcast(new MessageSent($message))->toOthers();

        return back();
    }

    private function sidebarConversations($user)
    {
        return $user->conversations()
            ->with([
                'participants:id,full_name,profile_image',
                'trip:id,name',
                'pergi_bareng:id,name'
            ])
            ->get()
            ->map(function ($c) use ($user) {
                $lastMessage = $c->messages()->latest()->with('sender:id,full_name')->first();

                $title = $c->is_group
                    ? ($c->trip?->name ?? $c->pergi_bareng?->name ?? 'Group')
                    : optional($c->participants->firstWhere('id', '!=', $user->id))->full_name;

                $avatar = $c->is_group
                    ? asset('assets/default-profile.png')
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
                if (!$subtitle && $lastMessage?->attachment_type){
                    if (str_starts_with($lastMessage->attachment_type, 'image/')) {
                        $subtitle = 'Foto';
                    } elseif ($lastMessage->attachment_type === 'application/pdf') {
                        $subtitle = 'PDF';
                    }else{
                        $subtitle = 'Lampiran';
                    }
                }

                return [
                    'id' => $c->id,
                    'is_group' => (bool) $c->is_group,
                    'title' => $title ?? 'Chat',
                    'avatar' => $avatar,
                    'subtitle' => $subtitle ?? '',
                    'last_message_at' => $lastMessage?->created_at?->toISOString(),
                    'unread' => $unread,
                ];
            })
            ->sortByDesc(fn ($c) => $c['last_message_at'] ?? 0)
            ->values();
    }
}