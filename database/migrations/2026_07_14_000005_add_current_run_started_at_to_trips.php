<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            // Diset saat re-trip; pesanan sebelum waktu ini milik run lama dan
            // tidak dihitung sebagai kursi terisi pada run yang baru.
            $table->timestamp('current_run_started_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn('current_run_started_at');
        });
    }
};
