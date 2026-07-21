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
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PergiBarengController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileHistoryController;
use App\Http\Controllers\TripsController;
use App\Http\Controllers\JastipController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AdminMessageController;
use App\Http\Controllers\AdminPergiBarengController;
use App\Http\Controllers\AdminTripController;
use App\Http\Controllers\AdminJastipController;
use App\Http\Controllers\AdminJastipRequestController;
use App\Http\Controllers\JastipRequestController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\AdminLanguageController;
use Illuminate\Support\Facades\Route;

Route::get('/', [HomeController::class, 'index'])->name('home');

Route::post('/contact-us', [ContactController::class, 'store'])->name('contact.store');

Route::post('/locale/{code}', [LocaleController::class, 'update'])->name('locale.update');

// Guest
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'login'])->name('login');
    Route::post('/login', [AuthController::class, 'authenticate'])->name('login.store');

    Route::get('/register', [AuthController::class, 'signup'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->name('register.store');

    Route::get('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.request');
    Route::post('/forgot-password', [AuthController::class, 'sendResetLink'])
        ->middleware('throttle:5,1')
        ->name('password.email');

    Route::post('/forgot-password/resend', [AuthController::class, 'sendResetLink'])
        ->middleware('throttle:5,1')
        ->name('password.email.resend');

    Route::get('/reset-password/{token}', [AuthController::class, 'resetPassword'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'updatePassword'])->name('password.update');

    Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
});

Route::middleware('auth')->group(function () {
    Route::get('/onboarding', [OnboardingController::class, 'onboarding'])->name('onboarding.index');
    Route::post('/onboarding', [OnboardingController::class, 'setupProfile'])->name('onboarding.store');
    Route::post('/onboarding/complete', [OnboardingController::class, 'completeOnboarding'])->name('onboarding.complete');

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

    // Favorites
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle'])->name('favorites.toggle');

    // Ulasan
    Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store');

    // Profil
    Route::get('/profile-history', [ProfileHistoryController::class, 'index'])->name('profile-history');
    Route::put('/profile-history', [ProfileHistoryController::class, 'update'])->name('profile-history.update');
    Route::post('/profile-history/image', [ProfileHistoryController::class, 'updateProfileImage'])->name('profile-history.image.update');
    Route::delete('/profile-history/image', [ProfileHistoryController::class, 'removeProfileImage'])->name('profile-history.image.remove');

    // Notifikasi. /poll harus di atas rute ber-parameter.
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/poll', [NotificationController::class, 'poll'])->name('notifications.poll');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/preferences', [NotificationController::class, 'updatePreferences'])->name('notifications.preferences');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->whereNumber('id')->name('notifications.read');
});

// Pergi Bareng
Route::prefix('pergi-bareng')->group(function () {
    Route::get('/', [PergiBarengController::class, 'index'])->name('pergi-bareng.index');
    Route::get('/{id}', [PergiBarengController::class, 'show'])->name('pergi-bareng.show');

    Route::middleware('auth')->group(function () {
        Route::post('/{id}/join', [PergiBarengController::class, 'store'])->name('pergi-bareng.store');
        Route::get('/{id}/request-sent', [PergiBarengController::class, 'requestSent'])->name('pergi-bareng.request-sent');
        Route::get('/{id}/track', [PergiBarengController::class, 'track'])->whereNumber('id')->name('pergi-bareng.track');
    });
});


// Midtrans webhook - server-to-server, tanpa auth & CSRF
Route::post('/midtrans/notification', [MidtransController::class, 'notification'])->name('midtrans.notification');

// Chat
Route::middleware('auth')->group(function () {
    Route::get('/chat',[ChatController::class, 'index'])->name('chat.index');
    // Harus di atas /chat/{conversation}.
    Route::get('/chat/poll', [ChatController::class, 'pollConversations'])->name('chat.poll');
    Route::get('/chat/unread-count', [ChatController::class, 'unreadCount'])->name('chat.unread-count');
    Route::get('/chat/users', [ChatUserController::class, 'index'])->name('chat.users.index');
    Route::get('/chat/{conversation}/poll', [ChatController::class, 'pollMessages'])->whereNumber('conversation')->name('chat.messages.poll');
    Route::get('/chat/{conversation}', [ChatController::class, 'show'])->whereNumber('conversation')->name('chat.show');
    Route::post('/chat/{conversation}/messages', [ChatController::class, 'storeMessage'])->whereNumber('conversation')->name('chat.messages.store');
    Route::post('/chat/{conversation}/read', [ChatReadController::class, 'markAsRead'])->whereNumber('conversation')->name('chat.read');
    Route::post('/chat/personal', [ChatConversationController::class, 'openOrCreatePersonal'])->name('chat.personal.open');
    Route::post('/chat/trip/{trip}/group', [ChatConversationController::class, 'openOrCreateTripGroup'])->whereNumber('trip')->name('chat.trip.group.open');
    Route::post('/chat/pergi-bareng/{id}/group', [ChatConversationController::class, 'openOrCreatePergiBarengGroup'])->whereNumber('id')->name('chat.pergibareng.group.open');
    Route::post('/chat/jastip/{id}/group', [ChatConversationController::class, 'openOrCreateJastipGroup'])->whereNumber('id')->name('chat.jastip.group.open');
    Route::delete('/chat/{conversation}/participants/{user}', [ChatConversationController::class, 'removeParticipant'])->whereNumber('conversation')->whereNumber('user')->name('chat.participants.remove');
    
    Route::get('/chat/exp', function(){
        return inertia('Chat/Index2');
    })->name('chat.exp');
});

// Split bill
Route::middleware('auth')->group(function () {
    Route::post('/split-bill/shares/{share}/pay', [\App\Http\Controllers\SplitBillController::class, 'pay'])
        ->whereNumber('share')->name('split-bill.share.pay');
});

// Dompet
Route::middleware('auth')->group(function () {
    Route::post('/wallet/top-up', [\App\Http\Controllers\WalletController::class, 'topUp'])->name('wallet.top-up');
});

// Leaderboard
Route::get('/leaderboard', [\App\Http\Controllers\LeaderboardController::class, 'index'])->name('leaderboard');

// Trip Bareng
Route::get('/trip-bareng', [TripsController::class, 'index'])->name('trip-bareng');
Route::get('/trip-bareng/{id}', [TripsController::class, 'show'])->name('trip-bareng.show');

Route::middleware('auth')->group(function () {
    Route::get('/trip-bareng/{id}/checkout', [TripsController::class, 'checkout'])->name('trip-bareng.checkout');
    Route::post('/trip-bareng/{id}/payment', [TripsController::class, 'processPayment'])->name('trip-bareng.payment');
    Route::get('/trip-bareng/{id}/success', [TripsController::class, 'success'])->name('trip-bareng.success');
});

// Jastip
Route::get('/jastip', [JastipController::class, 'index'])->name('jastip');
// Harus sebelum /jastip/{id} agar tidak tertelan wildcard
Route::get('/jastip/requests', [JastipRequestController::class, 'browse'])->name('jastip.requests.browse');
Route::get('/jastip/{id}', [JastipController::class, 'show'])->whereNumber('id')->name('jastip.show');

Route::middleware('auth')->group(function () {
    Route::post('/jastip/requests', [JastipRequestController::class, 'store'])->name('jastip.requests.store');
    Route::post('/jastip/requests/{id}/pay', [JastipRequestController::class, 'pay'])->whereNumber('id')->name('jastip.requests.pay');
    Route::post('/jastip/requests/{id}/cancel', [JastipRequestController::class, 'cancel'])->whereNumber('id')->name('jastip.requests.cancel');
    Route::post('/jastip/cart', [JastipController::class, 'addToCart'])->name('jastip.cart.add');
    Route::post('/jastip/cart/update', [JastipController::class, 'updateCart'])->name('jastip.cart.update');
    Route::get('/jastip/checkout', [JastipController::class, 'checkout'])->name('jastip.checkout');
    Route::post('/jastip/payment', [JastipController::class, 'processPayment'])->name('jastip.payment');
    Route::get('/jastip/success/{transaction}', [JastipController::class, 'success'])->name('jastip.success');
    Route::get('/jastip/{id}/track', [JastipController::class, 'track'])->whereNumber('id')->name('jastip.track');
});

// Management User
Route::prefix('admin')->group(function () {

    Route::middleware(['auth', 'role:admin'])->group(function () {
        Route::get('/', [AdminDashboardController::class, 'index'])->name('admin');
        Route::get('/logs/export', [AdminDashboardController::class, 'exportLogs'])->name('admin.logs.export');

        Route::get('/management-user', [AdminUserController::class, 'index'])->name('management-user');
        Route::get('/management-user/{id}/edit-role', [AdminUserController::class, 'edit'])->name('management-user.edit');
        Route::put('/management-user/{id}', [AdminUserController::class, 'update'])->name('management-user.update');
        Route::delete('/management-user/{id}', [AdminUserController::class, 'destroy'])->name('management-user.destroy');

        Route::get('/message', [AdminMessageController::class, 'index'])->name('admin.message.index');
        Route::delete('/message/{id}', [AdminMessageController::class, 'destroy'])->name('admin.message.destroy');

        Route::get('/languages', [AdminLanguageController::class, 'index'])->name('admin.languages.index');
        Route::post('/languages/{language}/toggle', [AdminLanguageController::class, 'toggle'])->name('admin.languages.toggle');
    });

    // Trip
    Route::middleware(['auth', 'role:guider'])->prefix('trip')->name('admin.trip.')->group(function () {
        Route::get('/', [AdminTripController::class, 'index'])->name('index');
        Route::get('/create', [AdminTripController::class, 'create'])->name('create');
        Route::get('/analytics', [AdminTripController::class, 'analytics'])->name('analytics');
        Route::post('/', [AdminTripController::class, 'store'])->name('store');
        Route::get('/{id}/edit', [AdminTripController::class, 'edit'])->whereNumber('id')->name('edit');
        Route::get('/{id}/reopen', [AdminTripController::class, 'reopen'])->whereNumber('id')->name('reopen');
        Route::get('/{id}/participants', [AdminTripController::class, 'participants'])->whereNumber('id')->name('participants');
        Route::delete('/{id}/participants/{userId}', [AdminTripController::class, 'kickParticipant'])->whereNumber('id')->whereNumber('userId')->name('participants.kick');
        Route::post('/{id}', [AdminTripController::class, 'update'])->whereNumber('id')->name('update');
        Route::post('/{id}/publish', [AdminTripController::class, 'publish'])->whereNumber('id')->name('publish');
        Route::post('/{id}/finish', [AdminTripController::class, 'finish'])->whereNumber('id')->name('finish');
        Route::post('/{id}/retrip', [AdminTripController::class, 'retrip'])->whereNumber('id')->name('retrip');
        Route::delete('/{id}', [AdminTripController::class, 'destroy'])->whereNumber('id')->name('destroy');
    });

    // Pergi Bareng
    Route::middleware('auth')->prefix('pergi-bareng')->name('admin.pergi-bareng.')->group(function () {
        Route::get('/', [AdminPergiBarengController::class, 'index'])->name('index');
        Route::get('/create', [AdminPergiBarengController::class, 'create'])->name('create');
        Route::get('/analytics', [AdminPergiBarengController::class, 'analytics'])->name('analytics');
        // Harus sebelum /{id} - walau {id} sudah whereNumber, biar niatnya jelas.
        Route::get('/pending-counts', [AdminPergiBarengController::class, 'pendingCounts'])->name('pending-counts');
        Route::post('/', [AdminPergiBarengController::class, 'store'])->name('store');
        Route::delete('/{id}', [AdminPergiBarengController::class, 'destroy'])->whereNumber('id')->name('destroy');

        Route::post('/{id}/finish', [AdminPergiBarengController::class, 'finish'])->whereNumber('id')->name('finish');

        Route::post('/{id}/track', [AdminPergiBarengController::class, 'shareTrack'])->whereNumber('id')->name('track');

        Route::get('/{id}/split-bill', [\App\Http\Controllers\SplitBillController::class, 'create'])->whereNumber('id')->name('split-bill.create');
        Route::post('/{id}/split-bill', [\App\Http\Controllers\SplitBillController::class, 'store'])->whereNumber('id')->name('split-bill.store');

        Route::get('/{id}/reopen', [AdminPergiBarengController::class, 'reopen'])->whereNumber('id')->name('reopen');
        Route::get('/{id}/requests', [AdminPergiBarengController::class, 'requests'])->whereNumber('id')->name('requests');
        Route::post('/{id}/requests/{requestId}/approve', [AdminPergiBarengController::class, 'approve'])->whereNumber('id')->whereNumber('requestId')->name('requests.approve');
        Route::delete('/{id}/requests/{requestId}', [AdminPergiBarengController::class, 'reject'])->whereNumber('id')->whereNumber('requestId')->name('requests.reject');

        Route::delete('/{id}/participants/{userId}', [AdminPergiBarengController::class, 'kickParticipant'])->whereNumber('id')->whereNumber('userId')->name('participants.kick');
        // Lepas satu kursi saja; {participantId} adalah baris peserta, bukan user id.
        Route::delete('/{id}/participant-seats/{participantId}', [AdminPergiBarengController::class, 'removeParticipantSeat'])->whereNumber('id')->whereNumber('participantId')->name('participant-seats.remove');
    });

    // Jastip
    Route::middleware('auth')->prefix('jastip')->name('admin.jastip.')->group(function () {
        Route::get('/', [AdminJastipController::class, 'index'])->name('index');
        Route::get('/create', [AdminJastipController::class, 'create'])->name('create');
        Route::get('/analytics', [AdminJastipController::class, 'analytics'])->name('analytics');

        // Request titipan
        Route::get('/requests', [AdminJastipRequestController::class, 'requests'])->name('requests.index');
        Route::post('/requests/{id}/quote', [AdminJastipRequestController::class, 'quote'])->whereNumber('id')->name('requests.quote');
        Route::post('/requests/{id}/reject', [AdminJastipRequestController::class, 'reject'])->whereNumber('id')->name('requests.reject');

        Route::post('/', [AdminJastipController::class, 'store'])->name('store');
        Route::get('/{id}/edit', [AdminJastipController::class, 'edit'])->whereNumber('id')->name('edit');
        Route::post('/{id}', [AdminJastipController::class, 'update'])->whereNumber('id')->name('update');
        Route::post('/{id}/publish', [AdminJastipController::class, 'publish'])->whereNumber('id')->name('publish');
        Route::post('/{id}/reopen', [AdminJastipController::class, 'reopen'])->whereNumber('id')->name('reopen');
        Route::post('/{id}/track', [AdminJastipController::class, 'shareTrack'])->whereNumber('id')->name('track');
        Route::post('/{id}/toggle-requests', [AdminJastipController::class, 'toggleRequests'])->whereNumber('id')->name('toggle-requests');
        Route::delete('/{id}', [AdminJastipController::class, 'destroy'])->whereNumber('id')->name('destroy');
    });

});
