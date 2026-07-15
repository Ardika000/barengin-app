<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kartu referensi (snapshot Trip / Pergi Bareng) yang menempel pada sebuah pesan.
// Dipakai saat pengguna menekan "chat penyelenggara" dari halaman detail Trip /
// Pergi Bareng: pesan pertama membawa konteks kartu agar penyelenggara paham.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->json('reference')->nullable()->after('attachments');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('reference');
        });
    }
};
