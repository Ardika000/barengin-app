<?php

namespace App\Services\Chat;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\JastipItem;
use App\Models\Message;

// Kirim kartu "ambil barang" ke grup chat jastip saat masuk masa pengambilan.
// Kembarannya PergiBarengTrackShare: anti-kirim-ganda lewat kolom track_shared_at
// (bukan memindai isi chat) supaya murah dipanggil tiap tick polling dan aman dari
// balapan karena klaimnya cuma satu UPDATE.
class JastipTrackShare
{
    public static function share(JastipItem $item): bool
    {
        if ($item->jastiperStatus() !== 'pickup_time') {
            return false;
        }

        if ($item->track_shared_at) { // jalur tersering, tanpa query sama sekali
            return false;
        }

        $conversation = Conversation::where('jastip_item_id', $item->id)
            ->where('is_group', true)
            ->first();

        // Grup jastip baru dibuat saat jastiper membukanya. Belum ada grup berarti
        // belum ada yang perlu dikabari; kartunya menyusul saat grup dibuka.
        if (! $conversation) {
            return false;
        }

        // Klaim atomik: cuma yang berhasil mengubah NULL -> now() yang boleh kirim.
        $claimed = JastipItem::whereKey($item->id)
            ->whereNull('track_shared_at')
            ->update(['track_shared_at' => now()]);

        if ($claimed === 0) {
            return false;
        }

        $item->track_shared_at = now();

        $pickup = trim(implode(', ', array_filter([$item->pickup_address, $item->pickup_city])));

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $item->user_id,
            'message_text' => '',
            'reference' => [
                'type' => 'jastip_track',
                'id' => (int) $item->id,
                'title' => $item->name,
                'subtitle' => $pickup !== '' ? $pickup : null,
                'url' => '/jastip/' . $item->id . '/track',
            ],
        ]);

        broadcast(new MessageSent($message))->toOthers();

        return true;
    }
}
