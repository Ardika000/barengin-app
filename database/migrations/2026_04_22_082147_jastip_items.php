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
            $table->foreignId('jastip_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->string('name');
            $table->enum('category', ['Fashion', 'Skincare', 'Food', 'Merchandise']);
            $table->text('description');
            $table->integer('max_slot');
            $table->decimal('base_price', 15, 2);
            $table->integer('min_buy');
            $table->decimal('weight_gram', 8, 2);
            $table->timestamps(); 
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
