<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Penyelenggara boleh menyelesaikan pergi bareng lebih cepat dari waktu janji.
// Status pergi bareng sebelumnya murni diturunkan dari `time_appointment`,
// sehingga butuh kolom tersendiri agar "selesai manual" tidak tertimpa.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pergi_barengs', function (Blueprint $table) {
            $table->timestamp('finished_at')->nullable()->after('img_name');
        });
    }

    public function down(): void
    {
        Schema::table('pergi_barengs', function (Blueprint $table) {
            $table->dropColumn('finished_at');
        });
    }
};
