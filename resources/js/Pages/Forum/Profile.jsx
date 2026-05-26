import React, { useMemo, useState } from "react";
import { Link, router } from "@inertiajs/react";
import Container from "@/Components/Container";
import ForumLayout from "@/Layouts/ForumLayout";
import PostCard from "@/Pages/Forum/Partials/PostCard";
import Button from "@/Components/Button";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import UserListModal from "@/Pages/Forum/Partials/UserListModal";

function formatRelativeTime(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";

    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 0) return "baru saja";
    if (diffSeconds < 60) return "baru saja";

    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;

    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} minggu lalu`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} bulan lalu`;

    const years = Math.floor(days / 365);
    return `${years} tahun lalu`;
}

function compactNumber(n) {
    const num = Number(n ?? 0);
    if (!Number.isFinite(num)) return "0";

    const format = (value, suffix) => {
        const s = value.toFixed(1);
        return `${s.endsWith(".0") ? s.slice(0, -2) : s}${suffix}`;
    };

    if (num >= 1_000_000_000) return format(num / 1_000_000_000, "B");
    if (num >= 1_000_000) return format(num / 1_000_000, "M");
    if (num >= 1_000) return format(num / 1_000, "k");
    return String(num);
}

function TabButton({ active, children, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "flex-1 py-4 text-sm font-semibold border-b-2 transition cursor-pointer",
                active
                    ? "text-primary-700 border-primary-700"
                    : "text-neutral-600 border-transparent hover:text-neutral-900",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function toPostCardShape(p) {
    if (!p) return null;

    return {
        id: p.id,
        author: p.user?.name ?? "Unknown",
        avatar: p.user?.avatar ?? "/assets/default-profile.png",
        username: p.user?.username,
        time: formatRelativeTime(p.created_at),
        content: p.content,

        likes: compactNumber(p.likes_count ?? 0),
        likedByMe: Boolean(p.liked_by_me),

        allowsComment: Boolean(p.allows_comment),
        comments: compactNumber(p.comments_count ?? 0),
        location: p.location ?? "",

        tags: (p.tags ?? []).map((t) => t.tag_name),
        images: (p.images ?? []).map((img) => img.url),
    };
}

function HeartButton({ liked, count, onClick, size = "base" }) {
    return (
        <button
            type="button"
            className={[
                "inline-flex items-center gap-2 transition cursor-pointer",
                size === "base" ? "text-sm" : "text-xs",
                liked
                    ? "text-rose-600"
                    : "text-neutral-600 hover:text-neutral-900",
            ].join(" ")}
            onClick={onClick}
            aria-pressed={liked}
        >
            {liked ? (
                <FaHeart
                    className={size === "base" ? "text-base" : "text-sm"}
                    size={14}
                />
            ) : (
                <FiHeart
                    className={size === "base" ? "text-base" : "text-sm"}
                    size={14}
                />
            )}
            <span className="text-sm">{compactNumber(count ?? 0)}</span>
        </button>
    );
}

function CommentCard({
    comment,
    footerLeft,
    optimistic,
    optimisticKey,
    onToggleLike,
    likeButtonSize = "base",
}) {
    if (!comment) return null;

    const u = comment.user;

    const liked =
        optimistic?.[optimisticKey]?.liked ?? Boolean(comment.liked_by_me);
    const likesCount =
        optimistic?.[optimisticKey]?.likes_count ??
        Number(comment.likes_count ?? 0);

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
            <div className="p-5 flex gap-4">
                <Link href={`/forum/users/${u?.username}`} className="shrink-0">
                    <img
                        src={u?.avatar ?? "/assets/default-profile.png"}
                        alt={u?.name ?? "User"}
                        className="h-10 w-10 rounded-full object-cover"
                    />
                </Link>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="font-semibold text-neutral-900 truncate">
                                {u?.name ?? "Unknown"}
                            </div>
                            {u?.username ? (
                                <Link
                                    href={`/forum/users/${u.username}`}
                                    className="text-sm text-neutral-500 hover:text-neutral-800"
                                >
                                    @{u.username}
                                </Link>
                            ) : null}
                        </div>

                        <div className="text-sm text-neutral-500">
                            {formatRelativeTime(comment.created_at)}
                        </div>
                    </div>

                    <div className="mt-2 text-neutral-800 leading-relaxed">
                        {comment.comment_text}
                    </div>

                    <div className="mt-4 flex items-center gap-5 text-neutral-600">
                        <HeartButton
                            liked={liked}
                            count={likesCount}
                            size={likeButtonSize}
                            onClick={onToggleLike}
                        />
                        {footerLeft ? footerLeft : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RelatedPostHighlighted({ post, onLikePost }) {
    const postForCard = toPostCardShape(post);
    if (!postForCard) return null;

    return (
        <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50/40 p-4">
            <div className="text-xs font-semibold text-primary-700 mb-3">
                Related Post
            </div>
            <PostCard
                post={postForCard}
                onLike={() => onLikePost?.(post.id)}
                onTagClick={() => {}}
            />
        </div>
    );
}

function RelatedPostPlain({ post, onLikePost }) {
    const postForCard = toPostCardShape(post);
    if (!postForCard) return null;

    return (
        <div className="mt-4">
            <PostCard
                post={postForCard}
                onLike={() => onLikePost?.(post.id)}
                onTagClick={() => {}}
            />
        </div>
    );
}

function LikedCommentCard({
    item,
    optimistic,
    onToggleLikeComment,
    onLikePost,
}) {
    const c = item.comment;
    const p = item.post;
    if (!c || !p) return null;

    return (
        <article className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
            <div className="p-5">
                <div className="text-sm text-neutral-500">
                    Liked a comment • {formatRelativeTime(item.liked_at)}
                </div>

                <div className="mt-4">
                    <CommentCard
                        comment={c}
                        optimistic={optimistic}
                        optimisticKey={`comment:${c.id}`}
                        onToggleLike={() => onToggleLikeComment?.(c)}
                        footerLeft={
                            <Link
                                href={`/forum/posts/${p.id}`}
                                className="text-sm font-medium hover:text-neutral-900 transition cursor-pointer"
                            >
                                Reply
                            </Link>
                        }
                    />
                </div>

                <RelatedPostHighlighted post={p} onLikePost={onLikePost} />
            </div>
        </article>
    );
}

function ReplyCard({
    reply,
    optimistic,
    onToggleLikeParentComment,
    onLikePost,
}) {
    const u = reply.user;
    const p = reply.post;
    const parent = reply.parent_comment;

    if (!p) return null;

    const isReplyOnComment = reply.context === "comment" && Boolean(parent);

    return (
        <article className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
            <div className="p-5">
                <div className="flex items-start gap-3">
                    <Link
                        href={`/forum/users/${u?.username}`}
                        className="shrink-0"
                    >
                        <img
                            src={u?.avatar ?? "/assets/default-profile.png"}
                            alt={u?.name ?? "User"}
                            className="h-10 w-10 rounded-full object-cover"
                        />
                    </Link>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-semibold text-neutral-900 truncate">
                                    {u?.name ?? "Unknown"}
                                </div>
                                <div className="text-sm text-neutral-500">
                                    {isReplyOnComment
                                        ? "Replied on Comment"
                                        : "Replied on Post"}
                                </div>
                            </div>

                            <div className="text-sm text-neutral-500">
                                {formatRelativeTime(reply.created_at)}
                            </div>
                        </div>

                        <div className="mt-2 text-neutral-800 leading-relaxed">
                            {reply.comment_text}
                        </div>
                    </div>
                </div>

                {isReplyOnComment ? (
                    <>
                        <div className="mt-4">
                            <CommentCard
                                comment={parent}
                                optimistic={optimistic}
                                optimisticKey={`parent:${parent.id}`}
                                onToggleLike={() =>
                                    onToggleLikeParentComment?.(parent)
                                }
                                likeButtonSize="sm"
                                footerLeft={
                                    <Link
                                        href={`/forum/posts/${p.id}`}
                                        className="text-sm font-medium hover:text-neutral-900 transition cursor-pointer"
                                    >
                                        Reply
                                    </Link>
                                }
                            />
                        </div>

                        <RelatedPostHighlighted
                            post={p}
                            onLikePost={onLikePost}
                        />
                    </>
                ) : (
                    <RelatedPostPlain post={p} onLikePost={onLikePost} />
                )}
            </div>
        </article>
    );
}

export default function Profile({
    profileUser,
    counts,
    isMe,
    isFollowing,
    tab,
    posts,
    likes,
    replies,
}) {
    const [optimistic, setOptimistic] = useState({});

    // Followers/Following modal state
    const [openUserList, setOpenUserList] = useState(false);
    const [userListMode, setUserListMode] = useState("followers"); // 'followers' | 'following'

    const profileUrl = `/forum/users/${profileUser.username}`;

    const shareProfile = async () => {
        const url = window.location.origin + profileUrl;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: `${profileUser.full_name} (@${profileUser.username})`,
                    url,
                });
                return;
            }
        } catch {
            // ignore
        }

        try {
            await navigator.clipboard.writeText(url);
            alert("Profile link copied!");
        } catch {
            prompt("Copy this profile link:", url);
        }
    };

    const toggleFollow = () => {
        router.post(
            `/forum/users/${profileUser.username}/follow`,
            {},
            { preserveScroll: true },
        );
    };

    const togglePostLike = (postId) => {
        router.post(
            `/forum/posts/${postId}/like`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({
                        only:
                            tab === "replies"
                                ? ["replies"]
                                : tab === "likes"
                                  ? ["likes"]
                                  : ["posts"],
                        preserveScroll: true,
                    });
                },
            },
        );
    };

    /**
     * Optimistic comment-like uses baseline from payload to work on first click.
     */
    const toggleCommentLikeOptimistic = (comment, optimisticKey) => {
        const prevSnapshot = optimistic;

        const baselineLiked = Boolean(comment?.liked_by_me);
        const baselineCount = Number(comment?.likes_count ?? 0);

        const current = optimistic?.[optimisticKey];
        const currentLiked = current?.liked ?? baselineLiked;
        const currentCount = Number(current?.likes_count ?? baselineCount);

        const nextLiked = !currentLiked;
        const nextCount = Math.max(0, currentCount + (currentLiked ? -1 : 1));

        setOptimistic((p) => ({
            ...(p ?? {}),
            [optimisticKey]: { liked: nextLiked, likes_count: nextCount },
        }));

        router.post(
            `/forum/comments/${comment.id}/like`,
            {},
            {
                preserveScroll: true,
                onError: () => {
                    setOptimistic(prevSnapshot);
                },
            },
        );
    };

    const setTab = (nextTab) => {
        setOptimistic({});
        router.get(
            profileUrl,
            { tab: nextTab },
            { preserveScroll: true, preserveState: true },
        );
    };

    const postCards = useMemo(() => {
        return (posts?.data ?? []).map((p) => ({
            id: p.id,
            author: p.user?.name ?? "Unknown",
            avatar: p.user?.avatar ?? "/assets/default-profile.png",
            username: p.user?.username,
            time: formatRelativeTime(p.created_at),
            content: p.content,

            likes: compactNumber(p.likes_count ?? 0),
            likedByMe: Boolean(p.liked_by_me),

            allowsComment: Boolean(p.allows_comment),
            comments: compactNumber(p.comments_count ?? 0),
            location: p.location ?? "",

            tags: (p.tags ?? []).map((t) => t.tag_name),
            images: (p.images ?? []).map((img) => img.url),
        }));
    }, [posts]);

    const likeItems = useMemo(() => likes?.data ?? [], [likes]);
    const replyItems = useMemo(() => replies?.data ?? [], [replies]);

    return (
        <Container className="py-10">
            <div className="max-w-5xl mx-auto">
                <div>
                    <div className="flex flex-col xs:flex-row gap-4 items-center md:justify-between">
                        <div className="order-[1]">
                            <h1 className="text-3xl xs:text-4xl font-semibold text-neutral-900">
                                {profileUser.full_name}
                            </h1>
                            <div className="mt-1 text-neutral-500 text-center xs:text-left">
                                @{profileUser.username}
                            </div>
                        </div>

                        <div className="order-[0] md:order-[2]">
                            <div className="flex lg:justify-end">
                                <img
                                    src={profileUser.public_profile_image}
                                    alt={profileUser.full_name}
                                    className="h-24 w-24 lg:h-26 lg:w-26 rounded-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    {profileUser.bio ? (
                        <p className="mt-2 text-neutral-700 leading-relaxed max-w-xl text-center xs:text-left">
                            {profileUser.bio}
                        </p>
                    ) : null}

                    <div className="mt-5 flex items-center gap-4 text-sm text-neutral-600 justify-center xs:justify-start">
                        <button
                            type="button"
                            className="hover:text-neutral-900 transition"
                            onClick={() => {
                                setUserListMode("followers");
                                setOpenUserList(true);
                            }}
                        >
                            {compactNumber(counts?.followers ?? 0)} followers
                        </button>

                        <button
                            type="button"
                            className="hover:text-neutral-900 transition"
                            onClick={() => {
                                setUserListMode("following");
                                setOpenUserList(true);
                            }}
                        >
                            {compactNumber(counts?.following ?? 0)} following
                        </button>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row gap-3">
                        {!isMe ? (
                            <Button
                                onClick={toggleFollow}
                                type="primary"
                                rounded
                                className="w-full justify-center"
                            >
                                {isFollowing ? "Unfollow" : "Follow"}
                            </Button>
                        ) : null}

                        <Button
                            onClick={shareProfile}
                            type="neutral"
                            variant="outline"
                            rounded
                            className="w-full justify-center"
                        >
                            Share Profile
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div>
                    <div className="mt-8 border-b border-neutral-200 flex">
                        <TabButton
                            active={tab === "posts"}
                            onClick={() => setTab("posts")}
                        >
                            Post
                        </TabButton>
                        <TabButton
                            active={tab === "likes"}
                            onClick={() => setTab("likes")}
                        >
                            Likes
                        </TabButton>
                        <TabButton
                            active={tab === "replies"}
                            onClick={() => setTab("replies")}
                        >
                            Replies
                        </TabButton>
                    </div>

                    <div className="mt-6 space-y-6 max-w-2xl mx-auto">
                        {/* Posts */}
                        {tab === "posts"
                            ? postCards.map((post) => (
                                  <PostCard
                                      key={post.id}
                                      post={post}
                                      onLike={() => togglePostLike(post.id)}
                                      onTagClick={() => {}}
                                  />
                              ))
                            : null}

                        {/* Likes */}
                        {tab === "likes"
                            ? likeItems.map((it, idx) => {
                                  if (it.type === "post" && it.post) {
                                      const postForCard = toPostCardShape(
                                          it.post,
                                      );
                                      if (!postForCard) return null;

                                      return (
                                          <article
                                              key={`like_post_${it.post.id}_${idx}`}
                                              className="rounded-2xl border border-neutral-200 bg-white overflow-hidden"
                                          >
                                              <div className="p-5">
                                                  <div className="text-sm text-neutral-500">
                                                      Liked a post •{" "}
                                                      {formatRelativeTime(
                                                          it.liked_at,
                                                      )}
                                                  </div>

                                                  <div className="mt-4">
                                                      <PostCard
                                                          post={postForCard}
                                                          onLike={() =>
                                                              togglePostLike(
                                                                  it.post.id,
                                                              )
                                                          }
                                                          onTagClick={() => {}}
                                                      />
                                                  </div>
                                              </div>
                                          </article>
                                      );
                                  }

                                  return (
                                      <LikedCommentCard
                                          key={`like_comment_${it.comment?.id ?? idx}`}
                                          item={it}
                                          optimistic={optimistic}
                                          onToggleLikeComment={(comment) =>
                                              toggleCommentLikeOptimistic(
                                                  comment,
                                                  `comment:${comment.id}`,
                                              )
                                          }
                                          onLikePost={togglePostLike}
                                      />
                                  );
                              })
                            : null}

                        {/* Replies */}
                        {tab === "replies"
                            ? replyItems.map((r) => (
                                  <ReplyCard
                                      key={r.id}
                                      reply={r}
                                      optimistic={optimistic}
                                      onToggleLikeParentComment={(parent) =>
                                          toggleCommentLikeOptimistic(
                                              parent,
                                              `parent:${parent.id}`,
                                          )
                                      }
                                      onLikePost={togglePostLike}
                                  />
                              ))
                            : null}

                        {/* Empty states */}
                        {tab === "posts" && postCards.length === 0 ? (
                            <div className="py-10 text-center text-neutral-500">
                                No content yet.
                            </div>
                        ) : null}

                        {tab === "likes" && likeItems.length === 0 ? (
                            <div className="py-10 text-center text-neutral-500">
                                No content yet.
                            </div>
                        ) : null}

                        {tab === "replies" && replyItems.length === 0 ? (
                            <div className="py-10 text-center text-neutral-500">
                                No content yet.
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Followers / Following modal */}
            <UserListModal
                open={openUserList}
                onClose={() => setOpenUserList(false)}
                mode={userListMode}
                username={profileUser.username}
            />
        </Container>
    );
}

Profile.layout = (page) => <ForumLayout>{page}</ForumLayout>;
