<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Permintaan isi saldo. Berdiri sendiri (bukan sekadar transactions) karena
// wallet_transactions.source_id bertipe bigint, sedangkan transactions.id adalah
// UUID - baris ini menyediakan id bigint yang dipakai sebagai sumber kredit,
// sekaligus menyimpan riwayat isi saldo. Pola ini mengikuti trip_orders /
// jastip_orders yang juga menggantung pada satu transaksi.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_topups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->uuid('transaction_id')->unique();
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['pending', 'paid', 'unpaid'])->default('pending');
            $table->timestamps();

            $table->foreign('transaction_id')->references('id')->on('transactions')
                ->cascadeOnDelete()->cascadeOnUpdate();
            $table->index(['wallet_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_topups');
    }
};
