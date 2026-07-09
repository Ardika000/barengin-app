<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jastip_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique(); // identifier unik (tanpa ikon/emoji)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jastip_categories');
    }
};
