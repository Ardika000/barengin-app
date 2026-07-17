<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MariaDB: enum harus diubah lewat raw ALTER (schema builder tidak mendukung).
        DB::statement("ALTER TABLE transactions MODIFY type ENUM('jastip','trip','jastip_request','split_bill') NOT NULL");
    }

    public function down(): void
    {
        // Hanya aman jika tidak ada baris bertipe 'split_bill'.
        DB::statement("ALTER TABLE transactions MODIFY type ENUM('jastip','trip','jastip_request') NOT NULL");
    }
};
