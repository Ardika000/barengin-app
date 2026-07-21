<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Arsip "run" trip sebelumnya - dibuat saat pemandu membuka ulang
        // (re-trip) trip yang sudah selesai. Satu baris = satu periode selesai.
        Schema::create('trip_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedInteger('joined_count')->default(0);
            $table->decimal('revenue', 15, 2)->default(0);
            $table->timestamp('completed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_histories');
    }
};
