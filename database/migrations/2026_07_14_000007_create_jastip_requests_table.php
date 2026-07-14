<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Permintaan titipan dari pembeli ke jastiper, terikat ke satu
        // destinasi/trip jastiper (tabel jastips). Alur status:
        // pending → quoted (jastiper memberi harga) → paid | rejected | cancelled
        Schema::create('jastip_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jastip_id')->constrained('jastips')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('item_name');
            $table->text('description')->nullable(); // deskripsi / tautan produk
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('budget', 15, 2)->nullable();
            $table->text('note')->nullable(); // catatan, termasuk preferensi pengambilan
            $table->string('image_name')->nullable(); // gambar referensi opsional
            $table->enum('status', ['pending', 'quoted', 'paid', 'rejected', 'cancelled'])->default('pending');
            $table->decimal('quoted_item_price', 15, 2)->nullable();
            $table->decimal('quoted_fee', 15, 2)->nullable();
            $table->timestamp('quoted_at')->nullable();
            $table->foreignUuid('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jastip_requests');
    }
};
