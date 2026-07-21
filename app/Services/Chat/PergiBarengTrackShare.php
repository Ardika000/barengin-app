<?php

namespace App\Services\Chat;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\PergiBareng;

// Kirim kartu "pantau perjalanan" ke grup chat pergi bareng. Anti-kirim-ganda lewat
// kolom track_shared_at, bukan memindai isi chat: murah karena ikut jalan tiap tick
// polling, dan aman dari balapan karena klaimnya cuma satu UPDATE.
class PergiBarengTrackShare
{
    public static function share(PergiBareng $trip): bool
    {
        if ($trip->status() !== 'ongoing') {
            return false;
        }

        if ($trip->track_shared_at) { // jalur tersering, tanpa query sama sekali
            return false;
        }

        $conversation = Conversation::where('pergi_bareng_id', $trip->id)
            ->where('is_group', true)
            ->first();

        if (! $conversation) {
            return false;
        }

        // Klaim atomik: cuma yang berhasil mengubah NULL -> now() yang boleh kirim.
        $claimed = PergiBareng::whereKey($trip->id)
            ->whereNull('track_shared_at')
            ->update(['track_shared_at' => now()]);

        if ($claimed === 0) {
            return false;
        }

        $trip->track_shared_at = now();

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $trip->initiator_id,
            'message_text' => '',
            'reference' => [
                'type' => 'pergi_track',
                'id' => (int) $trip->id,
                'title' => $trip->name,
                'subtitle' => $trip->destination_loc,
                'url' => '/pergi-bareng/' . $trip->id . '/track',
            ],
        ]);

        broadcast(new MessageSent($message))->toOthers();

        return true;
    }
}
