<?php

namespace App\Console\Commands;

use App\Services\LifecycleNotifier;
use Illuminate\Console\Command;

/**
 * Jalur TERJADWAL (cron) untuk notifikasi lifecycle - memindai semua peserta.
 * Logikanya ada di App\Services\LifecycleNotifier agar bisa dipakai ulang oleh
 * jalur tanpa-cron (LifecycleNotifier::freshenForUser), yang dipicu saat pengguna
 * membuka/polling notifikasi.
 *
 * Jadwalkan di routes/console.php: Schedule::command('notifications:lifecycle')->hourly();
 * (Opsional - tanpa cron pun notifikasi tetap muncul lewat freshenForUser.)
 */
class SendLifecycleNotifications extends Command
{
    protected $signature = 'notifications:lifecycle';

    protected $description = 'Kirim notifikasi perkembangan trip/pergi bareng/jastip yang diikuti pengguna';

    public function handle(): int
    {
        $sent = (new LifecycleNotifier())->run();

        $this->info("Notifikasi lifecycle terkirim: {$sent}.");

        return self::SUCCESS;
    }
}
