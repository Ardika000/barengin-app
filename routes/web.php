<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\Auth\OnboardingController;
use App\Http\Controllers\Chat\ChatController;
use App\Http\Controllers\Chat\ChatConversationController;
use App\Http\Controllers\Chat\ChatReadController;
use App\Http\Controllers\Chat\ChatUserController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\ForumFollowController;
use App\Http\Controllers\ForumLocationController;
use App\Http\Controllers\ForumPeopleController;
use App\Http\Controllers\ForumProfileController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\MidtransController;
use App\Http\Controllers\PergiBarengController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileHistoryController;
use App\Http\Controllers\TripsController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminMessageController;
use App\Http\Controllers\AdminPergiBarengController;
use App\Http\Controllers\AdminTripController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\ContactController;
use App\Models\PostImage;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Ambil sebagian gambar acak dari postingan forum untuk galeri beranda
    $galleryImages = PostImage::inRandomOrder()
        ->limit(7)
        ->pluck('img_name')
        ->map(function ($name) {
            if (str_starts_with($name, '/') || str_starts_with($name, 'http')) {
                return $name;
            }

            return asset('storage/posts/' . $name);
        })
        ->values()
        ->all();

    return inertia('Home/Index', [
        'galleryImages' => $galleryImages,
    ]);
    })->name('home');

Route::post('/contact-us', [ContactController::class, 'store'])->name('contact.store');
    
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

    // Favorites (Like) untuk Trip & Pergi Bareng
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle'])->name('favorites.toggle');

    // Ulasan Trip / Pergi Bareng
    Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store');

    // Profile History
    Route::get('/profile-history', [ProfileHistoryController::class, 'index'])->name('profile-history');
    Route::put('/profile-history', [ProfileHistoryController::class, 'update'])->name('profile-history.update');
    Route::post('/profile-history/image', [ProfileHistoryController::class, 'updateProfileImage'])->name('profile-history.image.update');
    Route::delete('/profile-history/image', [ProfileHistoryController::class, 'removeProfileImage'])->name('profile-history.image.remove');
});

// Group Route untuk Pergi Bareng (publik: daftar & detail)
Route::prefix('pergi-bareng')->group(function () {
    Route::get('/', [PergiBarengController::class, 'index'])->name('pergi-bareng.index');
    Route::get('/{id}', [PergiBarengController::class, 'show'])->name('pergi-bareng.show');

    // Pengajuan keikutsertaan (butuh login, menunggu persetujuan penyelenggara)
    Route::middleware('auth')->group(function () {
        Route::post('/{id}/join', [PergiBarengController::class, 'store'])->name('pergi-bareng.store');
        Route::get('/{id}/request-sent', [PergiBarengController::class, 'requestSent'])->name('pergi-bareng.request-sent');
    });
});


// Midtrans webhook (server-to-server, tanpa auth & CSRF)
Route::post('/midtrans/notification', [MidtransController::class, 'notification'])->name('midtrans.notification');

// Chat — hanya untuk user yang sudah login
Route::middleware('auth')->group(function () {
    Route::get('/chat',[ChatController::class, 'index'])->name('chat.index');
    Route::get('/chat/{conversation}', [ChatController::class, 'show'])->whereNumber('conversation')->name('chat.show');
    Route::post('/chat/{conversation}/messages', [ChatController::class, 'storeMessage'])->whereNumber('conversation')->name('chat.messages.store');
    Route::post('/chat/{conversation}/read', [ChatReadController::class, 'markAsRead'])->whereNumber('conversation')->name('chat.read');
    Route::get('/chat/users', [ChatUserController::class, 'index'])->name('chat.users.index');
    Route::post('/chat/personal', [ChatConversationController::class, 'openOrCreatePersonal'])->name('chat.personal.open');
    Route::post('/chat/trip/{trip}/group', [ChatConversationController::class, 'openOrCreateTripGroup'])->whereNumber('trip')->name('chat.trip.group.open');
    Route::post('/chat/pergi-bareng/{id}/group', [ChatConversationController::class, 'openOrCreatePergiBarengGroup'])->whereNumber('id')->name('chat.pergibareng.group.open');
    Route::delete('/chat/{conversation}/participants/{user}', [ChatConversationController::class, 'removeParticipant'])->whereNumber('conversation')->whereNumber('user')->name('chat.participants.remove');
    
    Route::get('/chat/exp', function(){
        return inertia('Chat/Index2');
    })->name('chat.exp');
});

// Leaderboard
Route::get('/leaderboard', function () {
    return inertia('Leaderboard/Index');
})->name('leaderboard');

// Trip Bareng — daftar & detail boleh dilihat publik
Route::get('/trip-bareng', [TripsController::class, 'index'])->name('trip-bareng');
Route::get('/trip-bareng/{id}', [TripsController::class, 'show'])->name('trip-bareng.show');

// Pemesanan trip wajib login
Route::middleware('auth')->group(function () {
    Route::get('/trip-bareng/{id}/checkout', [TripsController::class, 'checkout'])->name('trip-bareng.checkout');
    Route::post('/trip-bareng/{id}/payment', [TripsController::class, 'processPayment'])->name('trip-bareng.payment');
    Route::get('/trip-bareng/{id}/success', [TripsController::class, 'success'])->name('trip-bareng.success');
});

// Management User
// Route::get('/management-user', function(){
//     $users = User::all();

//     return inertia('Admin/ManagementUser', ['users' => $users]);
// })->name('management-user');

Route::prefix('admin')->group(function () {

    // Halaman khusus admin (is_admin)
    Route::middleware(['auth', 'role:admin'])->group(function () {
        Route::get('/', [AdminDashboardController::class, 'index'])->name('admin');
        Route::get('/logs/export', [AdminDashboardController::class, 'exportLogs'])->name('admin.logs.export');

        Route::get('/management-user', [AdminUserController::class, 'index'])->name('management-user');
        Route::get('/management-user/{id}/edit-role', [AdminUserController::class, 'edit'])->name('management-user.edit');
        Route::put('/management-user/{id}', [AdminUserController::class, 'update'])->name('management-user.update');
        Route::delete('/management-user/{id}', [AdminUserController::class, 'destroy'])->name('management-user.destroy');

        Route::get('/message', [AdminMessageController::class, 'index'])->name('admin.message.index');
        Route::delete('/message/{id}', [AdminMessageController::class, 'destroy'])->name('admin.message.destroy');
    });

    // Manajemen Trip (pemandu/guider)
    Route::middleware(['auth', 'role:guider'])->prefix('trip')->name('admin.trip.')->group(function () {
        Route::get('/', [AdminTripController::class, 'index'])->name('index');
        Route::get('/create', [AdminTripController::class, 'create'])->name('create');
        Route::get('/analytics', [AdminTripController::class, 'analytics'])->name('analytics');
        Route::post('/', [AdminTripController::class, 'store'])->name('store');
        Route::get('/{id}/edit', [AdminTripController::class, 'edit'])->whereNumber('id')->name('edit');
        Route::post('/{id}', [AdminTripController::class, 'update'])->whereNumber('id')->name('update');
        Route::post('/{id}/publish', [AdminTripController::class, 'publish'])->whereNumber('id')->name('publish');
        Route::delete('/{id}', [AdminTripController::class, 'destroy'])->whereNumber('id')->name('destroy');
    });

    // Manajemen Pergi Bareng (penyelenggara) — terbuka untuk semua user yang login
    Route::middleware('auth')->prefix('pergi-bareng')->name('admin.pergi-bareng.')->group(function () {
        Route::get('/', [AdminPergiBarengController::class, 'index'])->name('index');
        Route::get('/create', [AdminPergiBarengController::class, 'create'])->name('create');
        Route::get('/analytics', [AdminPergiBarengController::class, 'analytics'])->name('analytics');
        Route::post('/', [AdminPergiBarengController::class, 'store'])->name('store');
        Route::delete('/{id}', [AdminPergiBarengController::class, 'destroy'])->whereNumber('id')->name('destroy');

        Route::get('/{id}/requests', [AdminPergiBarengController::class, 'requests'])->whereNumber('id')->name('requests');
        Route::post('/{id}/requests/{requestId}/approve', [AdminPergiBarengController::class, 'approve'])->whereNumber('id')->whereNumber('requestId')->name('requests.approve');
        Route::delete('/{id}/requests/{requestId}', [AdminPergiBarengController::class, 'reject'])->whereNumber('id')->whereNumber('requestId')->name('requests.reject');
    });

});
