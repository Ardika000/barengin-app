<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MariaDB: enum harus diubah lewat raw ALTER (schema builder tidak mendukung).
        DB::statement("ALTER TABLE jastip_orders MODIFY order_status ENUM('paid','pending','unpaid','refunded') NOT NULL");
    }

    public function down(): void
    {
        // Hanya aman jika tidak ada baris berstatus 'refunded'.
        DB::statement("ALTER TABLE jastip_orders MODIFY order_status ENUM('paid','pending','unpaid') NOT NULL");
    }
};
