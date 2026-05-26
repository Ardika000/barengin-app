<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Tag;
use Illuminate\Http\Request;
use App\Models\PostComment;
use Illuminate\Support\Facades\Auth;
use App\Models\PostLike;
use App\Models\PostCommentLike;

class ForumController extends Controller
{
    private function imageUrl(?string $imgName): string
    {
        if (!$imgName) return '';

        // already a full path like /assets/default-image.png
        if (str_starts_with($imgName, '/') || str_starts_with($imgName, 'http')) {
            return $imgName;
        }

        return asset('storage/posts/' . $imgName);
    }

    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $tag = trim((string) $request->query('tag', ''));

        $userId = Auth::id();

        $postsQuery = Post::query()
            ->with([
                'user:id,full_name,profile_image,username',
                'images:id,post_id,img_name',
                'tags:id,tag_name',
            ])
            ->withCount([
                'comments as comments_count',
                'likes as likes_count',
            ])
            ->latest();

        if ($q !== '') {
            $postsQuery->where('content', 'like', "%{$q}%");
        }

        if ($tag !== '') {
            $postsQuery->whereHas('tags', function ($tq) use ($tag) {
                $tq->where('tag_name', $tag);
            });
        }

        $posts = $postsQuery->paginate(10)->withQueryString();

        $tags = Tag::query()
            ->select('id', 'tag_name')
            ->orderBy('tag_name')
            ->get();

        $postIds = collect($posts->items())->pluck('id')->values();

        $likedPostIds = collect();
        if ($userId) {
            $likedPostIds = \App\Models\PostLike::query()
                ->where('user_id', $userId)
                ->whereIn('post_id', $postIds)
                ->pluck('post_id');
        }

        return inertia('Forum/Index', [
            'filters' => [
                'q' => $q,
                'tag' => $tag,
            ],

            'posts' => $posts->through(function ($post) use ($likedPostIds) {
                return [
                    'id' => $post->id,
                    'content' => $post->content,
                    'allows_comment' => (bool) $post->allows_comment,
                    'location' => $post->location,
                    'likes_count' => (int) ($post->likes_count ?? 0),
                    'liked_by_me' => $likedPostIds->contains($post->id),
                    'comments_count' => (int) ($post->comments_count ?? 0),
                    'created_at' => $post->created_at,
                    'user' => [
                        'id' => $post->user?->id,
                        'name' => $post->user?->full_name,
                        'avatar' => $post->user?->public_profile_image,
                        'username' => $post->user?->username,
                    ],

                    'tags' => $post->tags->map(fn ($t) => [
                        'id' => $t->id,
                        'tag_name' => $t->tag_name,
                    ])->values(),

                    'images' => $post->images->map(fn ($img) => [
                        'id' => $img->id,
                        'img_name' => $img->img_name,
                        'url' => $this->imageUrl($img->img_name),
                    ])->values(),
                ];
            }),

            'tags' => $tags,
        ]);
    }

    public function show(Request $request, int $id)
    {
        $sort = $request->query('sort', 'newest'); // popular | newest
        $userId = Auth::id();

        $post = Post::query()
            ->with([
                'user:id,full_name,profile_image,username',
                'images:id,post_id,img_name',
                'tags:id,tag_name',
            ])
            ->withCount([
                'likes as likes_count',
            ])
            ->findOrFail($id);

        // top level comment
        $commentsQuery = $post->comments()
            ->whereNull('parent_id')
            ->withCount(['likes as likes_count'])
            ->with([
                'user:id,full_name,profile_image,username',
                'replies' => function ($q) {
                    // replies sort by oldestest
                    $q->orderBy('created_at', 'asc')
                        ->with('user:id,full_name,profile_image')
                        ->withCount(['likes as likes_count']);
                },
            ]);

        if ($sort === 'newest') {
            $commentsQuery->orderByDesc('created_at');
        } else {
            $commentsQuery->orderByDesc('likes_count')
                ->orderByDesc('created_at');
        }

        $comments = $commentsQuery->get();

        $responseCount = $comments->count()
            + $comments->sum(fn ($c) => $c->replies->count());

        $commentIds = $comments->pluck('id');
        $replyIds = $comments->flatMap(fn ($c) => $c->replies->pluck('id'));
        $allCommentIds = $commentIds->merge($replyIds)->values();

        $likedCommentIds = collect();
        if ($userId && $allCommentIds->count()) {
            $likedCommentIds = \App\Models\PostCommentLike::query()
                ->where('user_id', $userId)
                ->whereIn('post_comment_id', $allCommentIds)
                ->pluck('post_comment_id');
        }

        $postLikedByMe = false;
        if ($userId) {
            $postLikedByMe = \App\Models\PostLike::query()
                ->where('user_id', $userId)
                ->where('post_id', $post->id)
                ->exists();
        }

        return inertia('Forum/PostShow', [
            'sort' => $sort,
            'responseCount' => $responseCount,

            'post' => [
                'id' => $post->id,
                'content' => $post->content,
                'allows_comment' => (bool) $post->allows_comment,
                'location' => $post->location,

                'likes_count' => (int) ($post->likes_count ?? 0),
                'liked_by_me' => (bool) $postLikedByMe,

                'comments_count' => (int) $responseCount,
                'created_at' => $post->created_at,

                'user' => [
                    'id' => $post->user?->id,
                    'name' => $post->user?->full_name,
                    'avatar' => $post->user?->public_profile_image,
                    'username' => $post->user?->username,
                ],

                'tags' => $post->tags->map(fn ($t) => [
                    'id' => $t->id,
                    'tag_name' => $t->tag_name,
                ])->values(),

                'images' => $post->images->map(fn ($img) => [
                    'id' => $img->id,
                    'img_name' => $img->img_name,
                    'url' => $this->imageUrl($img->img_name),
                ])->values(),
            ],

            'comments' => $comments->map(fn ($c) => [
                'id' => $c->id,
                'comment_text' => $c->comment_text,

                'likes_count' => (int) ($c->likes_count ?? 0),
                'liked_by_me' => $likedCommentIds->contains($c->id),

                'created_at' => $c->created_at,

                'user' => [
                    'id' => $c->user?->id,
                    'name' => $c->user?->full_name,
                    'avatar' => $c->user?->public_profile_image,
                    'username' => $c->user?->username,
                ],

                'replies' => $c->replies->map(fn ($r) => [
                    'id' => $r->id,
                    'comment_text' => $r->comment_text,

                    'likes_count' => (int) ($r->likes_count ?? 0),
                    'liked_by_me' => $likedCommentIds->contains($r->id),

                    'created_at' => $r->created_at,
                    'user' => [
                        'id' => $r->user?->id,
                        'name' => $r->user?->full_name,
                        'avatar' => $r->user?->public_profile_image,
                        'username' => $r->user?->username,
                    ],
                ])->values(),
            ])->values(),
        ]);
    }

    public function storeComment(Request $request, Post $post)
    {
        $request->validate([
            'comment_text' => ['required', 'string', 'max:2000'],
        ]);

        if (! $post->allows_comment) {
            abort(403, 'Comments are disabled for this post.');
        }

        PostComment::create([
            'post_id' => $post->id,
            'user_id' => Auth::id(),
            'parent_id' => null,
            'comment_text' => $request->comment_text,
        ]);

        return redirect()->back();
    }

    public function storeReply(Request $request, PostComment $comment)
    {
        $request->validate([
            'comment_text' => ['required', 'string', 'max:2000'],
        ]);

        $post = $comment->post;

        if (! $post || ! $post->allows_comment) {
            abort(403, 'Comments are disabled for this post.');
        }

        $parentId = $comment->parent_id ? $comment->parent_id : $comment->id;

        PostComment::create([
            'post_id' => $comment->post_id,
            'user_id' => Auth::id(),
            'parent_id' => $parentId,
            'comment_text' => $request->comment_text,
        ]);

        return redirect()->back();
    }

    public function togglePostLike(Post $post)
    {
        $userId = Auth::id();

        $existing = PostLike::where('post_id', $post->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            PostLike::create([
                'post_id' => $post->id,
                'user_id' => $userId,
            ]);
        }

        return back();
    }

    public function toggleCommentLike(PostComment $comment)
    {
        $userId = Auth::id();

        $existing = PostCommentLike::where('post_comment_id', $comment->id)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            PostCommentLike::create([
                'post_comment_id' => $comment->id,
                'user_id' => $userId,
            ]);
        }

        return back();
    }
}