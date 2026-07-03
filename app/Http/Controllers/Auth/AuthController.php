<?php

namespace App\Http\Controllers\Auth;

use App\Models\User;
use App\Models\ActivityLog;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
// use App\Model\ActivityLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Password;
use App\Rules\StrongPassword;


function usernameToFullName(string $username): string
{
    // Mengubah _ dan . menjadi spasi
    $name = str_replace(['_', '.'], ' ', $username);
    // Menghilangkan angka di belakang nama
    $name = preg_replace('/\d+$/', '', $name);
    // Menghilangkan spasi ganda
    $name = trim(preg_replace('/\s+/', ' ', $name));
    return Str::title($name);
}

class AuthController extends Controller
{
    public function login(){
        return inertia('Auth/Login');
    }

    public function signup(){
        return inertia('Auth/Register');
    }

    public function register(Request $request){
        $validated = $request->validate([
            "username" => [
                "required",
                "min:3",
                "max:20",
                "unique:users,username",
                "regex:/^[a-z0-9_.]+$/i",
            ],
            "email" => [
                "required",
                "email:rfc,dns",
                "unique:users,email"
            ],
            
            "password" => [
                "required",
                new StrongPassword,
                "confirmed"
            ],
            "password_confirmation" => [
                "required"
            ],
            "remember" => [
                "sometimes",
                "boolean"
            ]
        ]);
        // Pesan kustom (mis. username.regex) diambil dari lang/{locale}/validation.php
        // sehingga otomatis mengikuti bahasa yang dipilih pengguna.


        $user = User::create([
            "username" => $validated["username"],
            "email" => $validated["email"],
            "password" => $validated["password"],
            "full_name" => usernameToFullName($validated["username"])
        ]);

        $remember = $request->boolean('remember');
        Auth::login($user, $remember);

        ActivityLog::record('Mendaftar sebagai pengguna baru', $user);

        return redirect("/onboarding");
    }

    public function authenticate(Request $request){
        $request->validate([
            "login" => "required",
            "password" => "required",
            "remember" => "sometimes|boolean",
        ]);

        $loginField = filter_var($request->login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $credentials = [
            $loginField => $request->login,
            'password' => $request->password
        ];

        $remember = $request->boolean('remember');

        if (!Auth::attempt($credentials, $remember)) {
            // Catat percobaan login gagal (aktor tak dikenal) untuk audit keamanan
            ActivityLog::record('Percobaan login gagal (' . $loginField . ': ' . $request->login . ')', null);

            return back()->with('flash', [
                'type' => 'error', // three category yaa ada error, success, info
                'message' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();

        ActivityLog::record('Berhasil masuk ke akun');

        return redirect()->intended('/')->with('flash', [
            'type' => 'success',
            'message' => __('auth.welcome_back', ['name' => Auth::user()->full_name]),
        ]);
    }

    public function logout(Request $request)
    {
        // Simpan preferensi bahasa agar tidak ikut terhapus saat session di-invalidate
        $locale = $request->session()->get('locale');

        // Catat aktivitas keluar mumpung user masih ter-autentikasi
        ActivityLog::record('Keluar dari akun', $request->user());

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Kembalikan locale ke session baru supaya bahasa tetap konsisten setelah logout
        if ($locale) {
            $request->session()->put('locale', $locale);
        }

        return redirect()->route('login');
    }

    public function forgotPassword(){
        return Inertia::render('Auth/ForgotPassword');
    }

    public function sendResetLink(Request $request){
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink(['email' => $validated['email']]);

        // ini biar mencegah user jahat ngecek email yang terdaftar apa nggak
        if ($status === Password::RESET_LINK_SENT || $status === Password::INVALID_USER) {
            return back()->with('flash', [
                'type' => 'success',
                'message' => __($status),
            ]);
        }

        return back()->with('flash', [
            'type' => 'error',
            'message' => __($status),
        ]); 
    }

    public function resetPassword($token){
        $email = request('email');
        $reset = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        // token or email not found
        if (!$reset || !Hash::check($token, $reset->token)) {
            return redirect('/login');
        }

        // check expiration (default 60 minutes)
        if (now()->subMinutes(config('auth.passwords.users.expire'))->gt($reset->created_at)) {
            return redirect('/login');
        }

        $user = User::where('email', $email)->first();

        if (!$user) {
            return redirect('/login');
        }

        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $email,
            'username' => $user->username,
        ]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', new StrongPassword, 'confirmed'],
            'password_confirmation' => ['required'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => $request->password,
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return redirect('/login')->with('flash', [
                'type' => 'success',
                'message' => __($status),
            ]);
        }

        return back()->with('flash', [
            'type' => 'error',
            'message' => __($status),
        ]);
    }
}