<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jastip_items', function (Blueprint $table) {
            // Jastiper mengizinkan pembeli menitip barang di luar katalog untuk item ini.
            $table->boolean('allow_requests')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('jastip_items', function (Blueprint $table) {
            $table->dropColumn('allow_requests');
        });
    }
};
