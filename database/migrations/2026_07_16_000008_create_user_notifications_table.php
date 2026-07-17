<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Notifikasi milik seorang penerima ("apa yang terjadi pada saya"). Berbeda dari
// activity_logs yang mencatat aktor ("apa yang saya lakukan") untuk audit admin.
//
// Isinya sengaja TIDAK menyimpan kalimat jadi: yang disimpan `type` + `data`
// (parameter), lalu kalimatnya dirakit di frontend lewat t(). Dengan begitu
// notifikasi lama ikut berubah bahasa saat pengguna mengganti bahasa.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();

            // Contoh: 'pergi_bareng.approved'. Menentukan kalimat & ikon di UI.
            $table->string('type', 60);
            // Kunci preferensi (users.notification_prefs) yang menaungi `type`.
            $table->string('category', 30);

            // Parameter kalimat + info tautan (mis. nama trip, nominal).
            $table->json('data')->nullable();
            $table->string('url')->nullable();

            // Kunci anti-duplikat. applyStatus() di MidtransController dipanggil
            // berulang (webhook retry + syncPendingForUser tiap halaman Profile
            // History dibuka), jadi notifikasi pembayaran WAJIB dikunci di sini —
            // bukan hanya mengandalkan pemanggilnya. NULL = boleh berulang.
            $table->string('dedupe_key')->nullable()->unique();

            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            // Kueri utama: daftar notifikasi milik user (terbaru dulu) & hitung
            // yang belum dibaca untuk lencana navbar.
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
    }
};
