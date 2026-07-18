<?php

namespace App\Console\Commands;

use App\Models\PergiBareng;
use App\Services\Chat\PergiBarengTrackShare;
use Illuminate\Console\Command;

class ShareOngoingTrackCards extends Command
{
    protected $signature = 'pergi-bareng:share-track';

    protected $description = 'Bagikan kartu pantau perjalanan ke grup chat begitu pergi bareng memasuki jam keberangkatan';

    public function handle(): int
    {
        // Kandidat: sudah lewat jam janji tetapi belum diselesaikan penyelenggara
        // (definisi "ongoing"). Pengiriman kartu sendiri idempoten & memverifikasi
        // ulang status di dalam service, jadi query ini sekadar mempersempit cakupan.
        $trips = PergiBareng::query()
            ->whereNull('finished_at')
            ->whereNotNull('time_appointment')
            ->where('time_appointment', '<=', now())
            ->get();

        $shared = 0;
        foreach ($trips as $trip) {
            if (PergiBarengTrackShare::share($trip)) {
                $shared++;
            }
        }

        $this->info("Kartu pantau perjalanan dibagikan: {$shared} grup.");

        return self::SUCCESS;
    }
}
