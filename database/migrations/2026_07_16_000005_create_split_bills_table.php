<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Patungan biaya sebuah pergi bareng yang sudah selesai. Dibuat oleh
// penyelenggara, lalu tiap anggota membayar bagiannya (split_bill_shares).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('split_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pergi_bareng_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('creator_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('title');
            $table->text('note')->nullable();
            $table->decimal('total_amount', 15, 2);
            $table->enum('status', ['open', 'settled'])->default('open');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('split_bills');
    }
};
