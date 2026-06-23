<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tambahkan nilai 'jalan_bareng' (ulasan trip) ke enum type user_ratings.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE user_ratings MODIFY COLUMN type ENUM('jastiper', 'pergi_bareng', 'jalan_bareng') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE user_ratings MODIFY COLUMN type ENUM('jastiper', 'pergi_bareng') NOT NULL");
    }
};
