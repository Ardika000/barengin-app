<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Penanda "kartu ambil barang sudah dibagikan ke grup jastip".
//
// Sama persis alasannya dengan track_shared_at di pergi_barengs: pemeriksaan ikut
// jalan di tiap tick polling chat, jadi harus O(1) lewat primary key, dan klaimnya
// harus atomik (UPDATE ... WHERE track_shared_at IS NULL) supaya dua poll bersamaan
// tidak sama-sama mengirim kartu.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jastip_items', function (Blueprint $table) {
            $table->timestamp('track_shared_at')->nullable()->after('pickup_end_date');
        });

        // Backfill untuk data yang kartunya sudah terlanjur ada (mis. hasil seeder lama).
        DB::table('messages')
            ->whereNotNull('reference')
            ->orderBy('id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    $ref = json_decode($row->reference, true);

                    if (! is_array($ref) || ($ref['type'] ?? null) !== 'jastip_track') {
                        continue;
                    }

                    $itemId = (int) ($ref['id'] ?? 0);

                    if ($itemId <= 0) {
                        continue;
                    }

                    DB::table('jastip_items')
                        ->where('id', $itemId)
                        ->whereNull('track_shared_at')
                        ->update(['track_shared_at' => $row->created_at]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('jastip_items', function (Blueprint $table) {
            $table->dropColumn('track_shared_at');
        });
    }
};
