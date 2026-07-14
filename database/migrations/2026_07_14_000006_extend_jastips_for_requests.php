<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Hidupkan kembali tabel `jastips` sebagai entitas "Destinasi/Trip Jastiper"
        // untuk fitur Request Titipan.
        Schema::table('jastips', function (Blueprint $table) {
            $table->string('title')->nullable()->after('user_id');
            $table->boolean('allow_requests')->default(true)->after('allow_delivery');
            $table->date('arrival_date')->nullable()->change();
            $table->text('pickup_location')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('jastips', function (Blueprint $table) {
            $table->dropColumn(['title', 'allow_requests']);
            $table->date('arrival_date')->nullable(false)->change();
            $table->text('pickup_location')->nullable(false)->change();
        });
    }
};
