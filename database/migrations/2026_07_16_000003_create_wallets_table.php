<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Dompet pengguna. Saldo bertambah saat anggota melunasi bagian split bill
// lewat Midtrans: uang masuk ke akun Midtrans platform, dan `balance` mencatat
// berapa yang menjadi hak penyelenggara. Ditampilkan di halaman Profile History.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('balance', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
