<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Kick peserta trip = kembalikan dana ke dompet & tandai pesanannya 'refunded'
// (mirip jastip). MariaDB butuh ALTER mentah untuk mengubah enum.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE trip_orders MODIFY order_status ENUM('paid','pending','unpaid','refunded') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE trip_orders MODIFY order_status ENUM('paid','pending','unpaid') NOT NULL");
    }
};
