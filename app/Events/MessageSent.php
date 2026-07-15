<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

use App\Models\Message;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    public function __construct(Message $message)
    {
        $this->message = $message->load([
            'sender:id,full_name,profile_image',
            'replyTo.sender:id,full_name',
        ]);
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
        ];

        // Juga broadcast ke channel pribadi tiap partisipan, supaya percakapan
        // yang BARU dibuat langsung muncul realtime tanpa perlu refresh.
        $participantIds = DB::table('conversation_participants')
            ->where('conversation_id', $this->message->conversation_id)
            ->pluck('user_id');

        foreach ($participantIds as $uid) {
            $channels[] = new PrivateChannel('user.'.$uid);
        }

        return $channels;
    }

    public function broadcastAs(): string{
        return 'message.sent';
    }

    public function broadcastWith(): array{
        return [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'sender_id' => $this->message->sender_id,
            'text' => $this->message->message_text,
            'created_at' => $this->message->created_at?->toISOString(),
            'attachments' => \App\Http\Controllers\Chat\ChatController::mapAttachments($this->message),
            'reply_to' => \App\Http\Controllers\Chat\ChatController::mapReply($this->message->replyTo),
            'reference' => $this->message->reference ?: null,
            'sender' => [
                'id' => $this->message->sender?->id,
                'name' => $this->message->sender?->full_name,
                'avatar' => $this->message->sender?->public_profile_image ?? asset('assets/default-profile.png'),
            ],
        ];
    }
}