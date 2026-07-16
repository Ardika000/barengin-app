<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Pemandu boleh menyelesaikan trip lebih cepat dari `end_date`.
// Tanpa kolom ini, Trip::refreshStatuses() akan mengembalikan status ke
// 'ongoing' karena status dihitung ulang dari tanggal pada tiap load dasbor.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->timestamp('finished_at')->nullable()->after('current_run_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn('finished_at');
        });
    }
};
