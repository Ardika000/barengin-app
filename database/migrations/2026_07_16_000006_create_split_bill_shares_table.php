<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bagian tiap anggota atas sebuah split bill. Satu baris per anggota, dan
// `transaction_id` menautkannya ke transaksi Midtrans saat anggota membayar
// sehingga bagian ini muncul di Riwayat Transaksi.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('split_bill_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('split_bill_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['unpaid', 'pending', 'paid'])->default('unpaid');
            // transactions.id bertipe char(36) berisi UUID: walaupun model
            // Transaction memakai HasUlids, baris transaksi dibuat lewat query
            // builder dengan Str::uuid() (lihat TripsController::processPayment).
            // Panjangnya harus sama persis agar foreign key valid & id tidak terpotong.
            $table->char('transaction_id', 36)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('transaction_id')->references('id')->on('transactions')->nullOnDelete();
            $table->unique(['split_bill_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('split_bill_shares');
    }
};
