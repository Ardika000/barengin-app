<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Perbarui status trip setiap jam (terjadwal -> berlangsung -> selesai).
// Pastikan cron sistem menjalankan `php artisan schedule:run` tiap menit.
Schedule::command('trips:refresh-statuses')->hourly();

// Bagikan kartu pantau perjalanan ke grup pergi bareng begitu perjalanan
// memasuki jam keberangkatan - tiap menit agar kartu muncul nyaris seketika.
Schedule::command('pergi-bareng:share-track')->everyMinute()->withoutOverlapping();

// Kabari peserta soal perkembangan trip/pergi bareng/jastip yang mereka ikuti
// (mulai berlangsung / waktu ambil / selesai). Aman diulang berkat dedupe_key.
Schedule::command('notifications:lifecycle')->hourly()->withoutOverlapping();
