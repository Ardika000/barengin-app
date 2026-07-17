<?php

use Illuminate\Support\Facades\Route;

// Belum ada endpoint API.
//
// Berkas ini sebelumnya mendaftarkan rute /auth/* dan /guides/* ke
// App\Http\Controllers\Api\{AuthController,GuideController} — sisa scaffolding
// dari commit "initialize project". Controller-nya tidak pernah ada di riwayat
// git (begitu pula model Guide), jadi rute itu 500 bila dipanggil dan membuat
// `php artisan route:list` gagal total karena perintah tersebut me-refleksi
// setiap kelas controller. Rute mati itu dihapus.
//
// Bila nanti butuh API: bikin controller-nya lebih dulu, baru daftarkan di sini.
