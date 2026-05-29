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
        Schema::create('pergi_bareng_participants', function(Blueprint $table){
            $table->id();
            $table->foreignId('pergi_bareng_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->string('full_name');
            $table->string('paspor', 12)->nullable();
            $table->string('phone_number', 15)->change();
            $table->string('nik', 16);
            $table->date('birth_date')->nullable();
            $table->tinyInteger('age')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Run the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pergi_bareng_participants');
    }
};
