<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Buku besar dompet: tiap perubahan saldo punya satu baris agar bisa diaudit.
// `source_type` + `source_id` menunjuk asal mutasi (mis. split_bill_share),
// dan pasangan itu unik untuk kredit agar webhook Midtrans yang datang berkali-kali
// tidak menambah saldo dua kali.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('type', ['credit', 'debit']);
            $table->decimal('amount', 15, 2);
            $table->string('description');
            $table->string('source_type')->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->timestamps();

            $table->unique(['source_type', 'source_id', 'type'], 'wallet_tx_source_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
