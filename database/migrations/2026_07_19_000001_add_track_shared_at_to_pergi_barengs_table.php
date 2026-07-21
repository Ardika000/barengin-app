<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Penanda "kartu pantau perjalanan sudah dibagikan ke grup".
//
// Sebelumnya fakta ini disimpulkan dengan memindai seluruh pesan bereferensi di
// percakapan lalu menyaringnya di PHP. Itu berat - pemeriksaannya ikut berjalan
// pada tiap tick polling chat (~5 detik, dikali jumlah anggota) justru pada grup
// yang paling ramai - dan tidak aman terhadap balapan: dua poll bersamaan
// sama-sama tidak menemukan kartu, lalu keduanya mengirim.
//
// Satu kolom di baris perjalanan membuat pemeriksaannya O(1) lewat primary key,
// sekaligus memungkinkan klaim atomik (UPDATE ... WHERE track_shared_at IS NULL)
// sehingga hanya satu pemanggil yang menang.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pergi_barengs', function (Blueprint $table) {
            $table->timestamp('track_shared_at')->nullable()->after('finished_at');
        });

        // Backfill: perjalanan yang kartunya sudah terlanjur dibagikan tidak boleh
        // menerima kartu kedua setelah migrasi ini jalan. Dipindai sekali di sini,
        // bukan berulang saat runtime.
        DB::table('messages')
            ->whereNotNull('reference')
            ->orderBy('id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    $ref = json_decode($row->reference, true);

                    if (! is_array($ref) || ($ref['type'] ?? null) !== 'pergi_track') {
                        continue;
                    }

                    $tripId = (int) ($ref['id'] ?? 0);

                    if ($tripId <= 0) {
                        continue;
                    }

                    // Kartu paling awal yang menang - chunk diurutkan id menaik.
                    DB::table('pergi_barengs')
                        ->where('id', $tripId)
                        ->whereNull('track_shared_at')
                        ->update(['track_shared_at' => $row->created_at]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('pergi_barengs', function (Blueprint $table) {
            $table->dropColumn('track_shared_at');
        });
    }
};
