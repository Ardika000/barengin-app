<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Arahkan ulang notifikasi lama ke percakapan yang dituju.
//
// Perbaikan URL di controller hanya berlaku untuk notifikasi BARU, sementara
// `dedupe_key` sengaja mencegah notifikasi yang sama dikirim ulang. Tanpa
// backfill ini, notifikasi yang sudah terlanjur ada tetap mendarat di tempat
// yang salah selamanya:
//
//  - `group.joined` menunjuk `/chat?conversation={id}`, padahal halaman indeks
//    chat tidak pernah membaca query itu — jadi anggota mendarat di daftar chat
//    dan harus mencari sendiri grupnya.
//  - `split_bill.*` menunjuk Riwayat Transaksi, padahal tagihan yang belum
//    dibayar belum punya transaksi sama sekali — tabnya kosong. Tombol bayarnya
//    justru ada pada kartu tagihan di grup chat.
return new class extends Migration
{
    public function up(): void
    {
        // 1) group.joined: /chat?conversation=12 -> /chat/12
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

        // 2) split_bill.*: id share diambil dari dedupe_key
        //    ("split_bill.created:share:9"), lalu ditelusuri ke grup pergi
        //    barengnya. Baris tanpa grup dibiarkan apa adanya.
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
        // Tidak dibalik: URL lama justru yang rusak, dan bentuk aslinya tidak
        // bisa dipulihkan dengan pasti dari URL barunya.
    }
};
