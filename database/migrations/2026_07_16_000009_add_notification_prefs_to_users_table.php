<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Preferensi notifikasi per pengguna. Disimpan sebagai JSON (bukan tabel
// tersendiri) karena isinya hanya segelintir boolean per user dan selalu dibaca
// sekaligus — tabel terpisah cuma menambah join tanpa manfaat.
//
// NULL = belum pernah diatur → semua kategori dianggap aktif (lihat
// User::notificationPrefs()). Jadi pengguna lama tidak perlu di-backfill.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('notification_prefs')->nullable()->after('streak_last_date');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('notification_prefs');
        });
    }
};
