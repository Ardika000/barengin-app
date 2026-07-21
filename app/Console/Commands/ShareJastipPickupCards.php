<?php

namespace App\Console\Commands;

use App\Models\JastipItem;
use App\Services\Chat\JastipTrackShare;
use Illuminate\Console\Command;

// Kembaran pergi-bareng:share-track untuk jastip.
//
// Tanpa ini kartu "ambil barang" cuma terkirim saat ada anggota yang kebetulan
// membuka grupnya (lewat ChatController), jadi grup yang sepi tak pernah dikabari
// bahwa barangnya sudah bisa diambil.
class ShareJastipPickupCards extends Command
{
    protected $signature = 'jastip:share-track';

    protected $description = 'Bagikan kartu ambil barang ke grup chat jastip begitu masuk masa pengambilan';

    public function handle(): int
    {
        // Pakai scope yang sama dengan tampilan admin supaya definisi "waktu ambil"
        // tidak pernah bercabang. track_shared_at menyaring yang sudah dikirim biar
        // querynya ringan; share() tetap memverifikasi ulang & idempoten.
        $items = JastipItem::query()
            ->jastiperStatus('pickup_time')
            ->whereNull('track_shared_at')
            ->get();

        $shared = 0;
        foreach ($items as $item) {
            if (JastipTrackShare::share($item)) {
                $shared++;
            }
        }

        $this->info("Kartu ambil barang dibagikan: {$shared} grup.");

        return self::SUCCESS;
    }
}
