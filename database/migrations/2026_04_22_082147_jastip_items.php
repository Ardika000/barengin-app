<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::create('jastip_items', function(Blueprint $table){
            $table->id();
            // Pemilik produk jastip (jastiper)
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            // Kaitan opsional ke sesi/trip jastip
            $table->foreignId('jastip_id')->nullable()->constrained()->nullOnDelete();
            // Kategori dari tabel jastip_categories
            $table->foreignId('jastip_category_id')->nullable()->constrained('jastip_categories')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();

            // Lokasi ambil (domestik, terstruktur untuk filter) & lokasi pembelian (bebas)
            $table->string('pickup_province')->nullable();
            $table->string('pickup_city')->nullable();
            $table->text('pickup_address')->nullable();
            $table->string('purchase_province')->nullable();
            $table->string('purchase_city')->nullable();
            $table->text('purchase_address')->nullable();

            $table->integer('max_slot');                          // total stok (= jumlah stok varian)
            $table->decimal('base_price', 15, 2);                 // harga dasar
            $table->decimal('jastip_fee', 15, 2)->default(0);     // biaya jastip
            $table->integer('min_buy')->default(1);               // minimum pembelian default
            $table->boolean('has_variants')->default(false);      // true bila jastiper mengaktifkan varian
            $table->decimal('weight_gram', 8, 2)->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->date('start_date')->nullable();               // tanggal jastip dibuka (mulai bisa dipesan)
            $table->date('end_date')->nullable();                 // tanggal jastip ditutup (batas pemesanan)
            // Jendela pengambilan barang oleh pembeli. Lewat pickup_end_date & belum
            // diambil / tanpa konfirmasi ke jastiper => pesanan dianggap hangus.
            $table->date('pickup_start_date')->nullable();        // mulai bisa diambil
            $table->date('pickup_end_date')->nullable();          // batas akhir pengambilan
            $table->timestamps();

            $table->index(['pickup_province', 'pickup_city']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jastip_items');
    }
};
