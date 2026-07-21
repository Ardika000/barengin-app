<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Backfill URL notifikasi lama ke percakapan yang benar. Perbaikan di
// controller cuma kena notifikasi baru, dan dedupe_key mencegah yang lama
// dikirim ulang - tanpa ini mereka salah tujuan selamanya.
return new class extends Migration
{
    public function up(): void
    {
        // /chat?conversation=12 -> /chat/12
        DB::table('user_notifications')
            ->where('type', 'group.joined')
            ->where('url', 'like', '/chat?conversation=%')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    $id = (int) substr($row->url, strlen('/chat?conversation='));

                    if ($id > 0) {
                        DB::table('user_notifications')
                            ->where('id', $row->id)
                            ->update(['url' => '/chat/' . $id]);
                    }
                }
            });

        // id share diambil dari dedupe_key, lalu ditelusuri ke grup pergi barengnya
        DB::table('user_notifications')
            ->whereIn('type', ['split_bill.created', 'split_bill.settled'])
            ->where('url', 'like', '/profile-history%')
            ->whereNotNull('dedupe_key')
            ->orderBy('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    $shareId = (int) (explode(':share:', $row->dedupe_key)[1] ?? 0);

                    if ($shareId <= 0) {
                        continue;
                    }

                    $conversationId = DB::table('split_bill_shares as s')
                        ->join('split_bills as b', 'b.id', '=', 's.split_bill_id')
                        ->join('conversations as c', function ($j) {
                            $j->on('c.pergi_bareng_id', '=', 'b.pergi_bareng_id')
                                ->where('c.is_group', true);
                        })
                        ->where('s.id', $shareId)
                        ->value('c.id');

                    if ($conversationId) {
                        DB::table('user_notifications')
                            ->where('id', $row->id)
                            ->update(['url' => '/chat/' . $conversationId]);
                    }
                }
            });
    }

    public function down(): void
    {
        // Tidak dibalik: URL lama justru yang rusak.
    }
};
