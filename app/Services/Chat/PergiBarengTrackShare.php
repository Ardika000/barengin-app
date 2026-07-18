<?php

namespace App\Services\Chat;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\PergiBareng;

/**
 * Membagikan kartu "pantau perjalanan" ke grup chat pergi bareng.
 *
 * Satu-satunya tempat yang menaruh kartu ini di grup, dipanggil dari beberapa
 * pintu masuk yang berbagi aturan sama:
 *  - Otomatis saat anggota membuka grup pergi bareng yang sedang berlangsung.
 *  - Terjadwal (command) begitu perjalanan memasuki jam keberangkatan.
 *  - Tombol "Pantau Perjalanan" penyelenggara di dasbor.
 *
 * Idempoten & hanya aktif saat perjalanan `ongoing`: aman dipanggil berulang —
 * kalau kartunya sudah nangkring di grup untuk perjalanan ini, tidak dikirim
 * lagi sehingga grup tak dibanjiri kartu duplikat.
 */
class PergiBarengTrackShare
{
    /**
     * Kirim kartu bila perjalanan sedang berlangsung dan belum pernah dibagikan.
     * Mengembalikan true hanya bila kartu baru saja dikirim.
     */
    public static function share(PergiBareng $trip): bool
    {
        if ($trip->status() !== 'ongoing') {
            return false;
        }

        $conversation = Conversation::where('pergi_bareng_id', $trip->id)
            ->where('is_group', true)
            ->first();

        if (! $conversation) {
            return false;
        }

        $alreadyShared = $conversation->messages()
            ->whereNotNull('reference')
            ->get(['reference'])
            ->contains(function ($m) use ($trip) {
                $ref = $m->reference;
                return ($ref['type'] ?? null) === 'pergi_track'
                    && (int) ($ref['id'] ?? 0) === (int) $trip->id;
            });

        if ($alreadyShared) {
            return false;
        }

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
