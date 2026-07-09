<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jastip_item_variants', function(Blueprint $table){
            $table->id();
            $table->foreignId('jastip_item_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->string('var_name')->default('Varian');        // label grup (selalu satu tingkat)
            $table->string('var_value');                          // nama varian, mis. "Hitam"
            $table->decimal('additional_price', 15, 2)->default(0);
            $table->integer('stock')->default(0);                 // stok per varian (wajib diisi jastiper)
            $table->integer('min_buy')->default(1);               // minimum pembelian per varian
            $table->string('image_name')->nullable();             // gambar varian (opsional)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jastip_item_variants');
    }
};
