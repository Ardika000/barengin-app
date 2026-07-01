<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('streak_count')->default(0);   // hari beruntun saat ini
            $table->unsignedInteger('streak_best')->default(0);    // rekor hari beruntun
            $table->date('streak_last_date')->nullable();          // tanggal aktivitas terakhir
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['streak_count', 'streak_best', 'streak_last_date']);
        });
    }
};
