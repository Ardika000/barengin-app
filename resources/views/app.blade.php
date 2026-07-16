<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- Favicon global: berlaku untuk semua layout (Main, Admin, Forum) dan
             halaman error. Sebelumnya hanya MainLayout yang memasangnya, sehingga
             halaman lain jatuh ke /favicon.ico yang kosong. --}}
        <link rel="icon" type="image/png" href="{{ asset('assets/barengin_logows.png') }}">
        <link rel="apple-touch-icon" href="{{ asset('assets/barengin_logows.png') }}">
        @viteReactRefresh
        @vite('resources/js/app.jsx')
        @vite('resources/css/app.css')
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>