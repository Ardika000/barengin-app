<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Simpan data peserta saat checkout & tandai kapan order dipenuhi
     * (peserta dibuat + dimasukkan ke grup chat).
     */
    public function up(): void
    {
        Schema::table('trip_orders', function (Blueprint $table) {
            $table->json('participants')->nullable()->after('quantity');
            $table->timestamp('fulfilled_at')->nullable()->after('order_status');
        });
    }

    public function down(): void
    {
        Schema::table('trip_orders', function (Blueprint $table) {
            $table->dropColumn(['participants', 'fulfilled_at']);
        });
    }
};
