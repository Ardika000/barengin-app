<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Notifications\CustomResetPasswordNotification;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    protected $appends = ['public_profile_image'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $guarded = [
        'id'
    ];
    

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_seen_at' => 'datetime',
        ];
    }

    public function sendPasswordResetNotification($token)
    {
        $this->notify(new CustomResetPasswordNotification($token));
    }

    public function getPublicProfileImageAttribute(){
        if (! $this->profile_image) {
            return asset('assets/default-profile.png');
        }

        // jika sudah berupa URL lengkap (google avatar images)
        if (
            str_starts_with($this->profile_image, 'http://') ||
            str_starts_with($this->profile_image, 'https://')
        ) {
            return $this->profile_image;
        }

        return asset('storage/' . $this->profile_image);
    }

    public function trip_participants(){
        return $this->hasMany(TripParticipant::class);
    }

    public function pergi_barengs(){
        return $this->hasMany(PergiBareng::class);
    }

    public function pergi_bareng_participants(){
        return $this->hasMany(PergiBarengParticipant::class);
    }

    public function messages(){
        return $this->hasMany(Message::class);
    }

    public function conversations(){
        return $this->belongsToMany(Conversation::class, 'conversation_participants');
    }

    public function followers()
    {
        return $this->hasMany(Follow::class, 'following_id');
    }

    public function followings()
    {
        return $this->hasMany(Follow::class, 'follower_id');
    }

    public function followerUsers()
    {
        return $this->belongsToMany(
            User::class,
            'follows',
            'following_id',
            'follower_id'
        );
    }

    public function followingUsers()
    {
        return $this->belongsToMany(
            User::class,
            'follows',
            'follower_id',
            'following_id'
        );
    }

    public function posts(){
        return $this->hasMany(Post::class);
    }

    public function post_command_users(){
        return $this->hasMany(PostComment::class);
    }

    public function post_command_parents(){
        return $this->hasMany(PostComment::class);
    }

    public function jastips(){
        return $this->hasMany(Jastip::class);
    }
    
    public function pergi_bareng_requests(){
        return $this->hasMany(PergiBarengRequest::class);
    }

    public function user_ratings(){
        return $this->hasMany(UserRating::class);
    }

    public function typeRating($type){
        return $this->user_ratings()->where('type', $type)->avg('rating_amount');
    }

    public function allRating(){
        return $this->user_ratings()->avg('rating_amount');
    }
}
