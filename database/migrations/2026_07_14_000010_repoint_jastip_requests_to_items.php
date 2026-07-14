<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Alihkan request titipan agar terikat langsung ke jastip_item (model
     * "per item + allow_requests"), bukan ke entitas destinasi (jastips).
     * Fitur belum rilis → data uji lama dibersihkan agar swap FK aman.
     */
    public function up(): void
    {
        DB::table('jastip_requests')->delete();
        DB::table('jastips')->delete(); // destinasi uji lama, tabel kembali tak terpakai

        Schema::table('jastip_requests', function (Blueprint $table) {
            $table->dropForeign(['jastip_id']);
            $table->dropColumn('jastip_id');
            $table->foreignId('jastip_item_id')->after('id')->constrained('jastip_items')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        DB::table('jastip_requests')->delete();

        Schema::table('jastip_requests', function (Blueprint $table) {
            $table->dropForeign(['jastip_item_id']);
            $table->dropColumn('jastip_item_id');
            $table->foreignId('jastip_id')->after('id')->constrained('jastips')->cascadeOnDelete();
        });
    }
};
