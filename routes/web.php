<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\Chat\ChatController;
use App\Http\Controllers\Chat\ChatConversationController;
use App\Http\Controllers\Chat\ChatReadController;
use App\Http\Controllers\Chat\ChatUserController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\ForumProfileController;
use App\Http\Controllers\ForumFollowController;
use App\Http\Controllers\ForumPeopleController;
use App\Http\Controllers\ForumLocationController;
use App\Http\Controllers\TripsController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\PergiBarengController;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;


use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return inertia('Home/Index');
})->name('home');

/*
|--------------------------------------------------------------------------
| Guest routes
|--------------------------------------------------------------------------
*/
// Auth
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'login'])->name('login');
    Route::post('/login', [AuthController::class, 'authenticate'])->name('login.store');

    Route::get('/register', [AuthController::class, 'signup'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->name('register.store');

    // Forgot / Reset password
    Route::get('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'sendResetLink'])
        ->middleware('throttle:5,1')
        ->name('password.email');

    Route::post('/forgot-password/resend', [AuthController::class, 'sendResetLink'])
        ->middleware('throttle:5,1')
        ->name('password.email.resend');

    Route::get('/reset-password/{token}', [AuthController::class, 'resetPassword'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'updatePassword'])->name('password.update');

    // Google OAuth
    Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
});

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    // Onboarding
    Route::get('/onboarding', [OnboardingController::class, 'onboarding'])->name('onboarding.index');
    Route::post('/onboarding', [OnboardingController::class, 'setupProfile'])->name('onboarding.store');
    Route::post('/onboarding/complete', [OnboardingController::class, 'completeOnboarding'])->name('onboarding.complete');

    // Logout 
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Forum
    Route::get('/forum', [ForumController::class, 'index'])->name('forum.index');
    Route::get('/forum/posts/{id}', [ForumController::class, 'show'])
        ->whereNumber('id')
        ->name('forum.show');

    Route::post('/forum/posts', [PostController::class, 'store'])->name('forum.posts.store');
    
    Route::post('/forum/posts/{post}/comments', [ForumController::class, 'storeComment'])
        ->name('forum.posts.comments.store');
    Route::post('/forum/comments/{comment}/replies', [ForumController::class, 'storeReply'])
        ->name('forum.comments.replies.store');

    Route::post('/forum/posts/{post}/like', [ForumController::class, 'togglePostLike'])
        ->name('forum.posts.like.toggle');

    Route::post('/forum/comments/{comment}/like', [ForumController::class, 'toggleCommentLike'])
        ->name('forum.comments.like.toggle');

    Route::get('/forum/profile', [ForumProfileController::class, 'me'])->name('forum.profile.me');
    Route::get('/forum/users/{username}', [ForumProfileController::class, 'show'])->name('forum.profile.show');
    Route::post('/forum/users/{username}/follow', [ForumFollowController::class, 'toggle'])->name('forum.profile.follow');

    Route::get('/forum/people', [ForumPeopleController::class, 'people']);
    Route::get('/forum/users/{username}/followers', [ForumPeopleController::class, 'followers']);
    Route::get('/forum/users/{username}/following', [ForumPeopleController::class, 'following']);

    Route::get('/forum/locations/search', [ForumLocationController::class, 'search']);
    Route::get('/forum/locations/reverse', [ForumLocationController::class, 'reverse']);
    Route::get('/forum/locations/popular', [ForumLocationController::class, 'popular']);
});

Route ::get('/pergi-bareng',function(){
    return inertia('PergiBareng/Index');
})->name('pergi-bareng');

// Group Route untuk Pergi Bareng
Route::prefix('pergi-bareng')->group(function () {
    Route::get('/', [PergiBarengController::class, 'index'])->name('pergi-bareng.index');
    Route::get('/{id}', [PergiBarengController::class, 'show'])->name('pergi-bareng.show');
    Route::get('/{id}/join', [PergiBarengController::class, 'join'])->name('pergi-bareng.join');
    Route::post('/{id}/join', [PergiBarengController::class, 'store'])->name('pergi-bareng.store');
    Route::get('/{id}/success', [PergiBarengController::class, 'success'])->name('pergi-bareng.success');
});


Route::get('/trip-bareng', [TripsController::class, 'index'])->name('trip-bareng');

Route::get('/chat',[ChatController::class, 'index'])->name('chat.index');
Route::get('/chat/{conversation}', [ChatController::class, 'show'])->whereNumber('conversation')->name('chat.show');
Route::post('/chat/{conversation}/messages', [ChatController::class, 'storeMessage'])->whereNumber('conversation')->name('chat.messages.store');
Route::post('/chat/{conversation}/read', [ChatReadController::class, 'markAsRead'])->whereNumber('conversation')->name('chat.read');
Route::get('/chat/users', [ChatUserController::class, 'index'])->name('chat.users.index');
Route::post('/chat/personal', [ChatConversationController::class, 'openOrCreatePersonal'])->name('chat.personal.open');

// Chat
Route::get('/chat/exp', function(){
    return inertia('Chat/Index2');
})->name('chat.exp');

// Leaderboard
Route::get('/leaderboard', function () {
    // Menghitung total trip per Guider dari database
    $guiders = DB::table('users')
        ->where('is_guider', true)
        ->leftJoin('trips', 'users.id', '=', 'trips.guider_id')
        ->select(
            'users.id', 
            'users.full_name as name', 
            'users.profile_image', 
            DB::raw('COUNT(trips.id) as total_trip')
        )
        ->groupBy('users.id', 'users.full_name', 'users.profile_image')
        ->orderByDesc('total_trip') // Urutkan dari yang terbanyak
        ->get();

    return inertia('Leaderboard/Index', [
        'dbGuiders' => $guiders // Lempar datanya ke React
    ]);
})->name('leaderboard');

// Trip Bareng
Route::get('/trip-bareng', [TripsController::class, 'index'])->name('trip-bareng');
Route::get('/trip-bareng/{id}', [TripsController::class, 'show'])->name('trip-bareng.show');
Route::get('/trip-bareng/{id}/checkout', [TripsController::class, 'checkout'])->name('trip-bareng.checkout');
Route::get('/trip-bareng/{id}/payment', [TripsController::class, 'payment'])->name('trip-bareng.payment');
Route::get('/trip-bareng/{id}/success', [\App\Http\Controllers\TripsController::class, 'success'])->name('trip-bareng.success');

// Management User
// Route::get('/management-user', function(){
//     $users = User::all();

//     return inertia('Admin/ManagementUser', ['users' => $users]);
// })->name('management-user');

Route::get('/management-user', function () {
    return inertia('Admin/ManagementUser', ['users' => \App\Models\User::all()]);
})->name('management-user');

// test route
Route::get('/Admin', function () {
    return inertia('Admin/Test');
})->name('admin'); 