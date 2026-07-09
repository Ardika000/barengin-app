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
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->nullable()->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('pergi_bareng_id')->nullable()->constrained()->onDelete('cascade')->onUpdate('cascade');
            // Grup chat jastip: jastiper <-> semua pembeli produk ini
            $table->foreignId('jastip_item_id')->nullable()->constrained('jastip_items')->onDelete('cascade')->onUpdate('cascade');
            $table->boolean('is_group')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
