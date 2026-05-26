import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Container from "@/Components/Container";
import Input from "@/Components/Input";

import ForumLayout, { useForumComposer } from "@/Layouts/ForumLayout";
import ForumFilterAccordion from "./Partials/ForumFilterAccordion";
import ComposerCard from "./Partials/ComposerCard";
import PostCard from "./Partials/PostCard";
import TagPillList from "./Partials/TagPillList";

import { FiSearch } from "react-icons/fi";

function ForumIndexPage({ posts, tags, filters }) {
    const user = usePage().props.auth?.user;

    const composer = useForumComposer();

    const [q, setQ] = useState(filters?.q ?? "");

    const [items, setItems] = useState(posts?.data ?? []);
    const [nextUrl, setNextUrl] = useState(posts?.next_page_url ?? null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const feedKey = `${filters?.q ?? ""}__${filters?.tag ?? ""}`;

    const LOADING_DELAY_MS = 650;
    const loadTimerRef = useRef(null);
    const isLoadMoreInFlightRef = useRef(false);

    const mergeUniquePosts = (prev, next) => {
        const seen = new Set();
        const merged = [];

        [...(prev ?? []), ...(next ?? [])].forEach((p) => {
            const id = p?.id;
            if (!id || seen.has(id)) return;
            seen.add(id);
            merged.push(p);
        });

        return merged;
    };

    useEffect(() => {
        // reset only when search/tag feed changes
        setItems(posts?.data ?? []);
        setNextUrl(posts?.next_page_url ?? null);
        setIsLoadingMore(false);
        isLoadMoreInFlightRef.current = false;
        setQ(filters?.q ?? "");
    }, [feedKey, filters?.q]);

    useEffect(() => {
        if (!posts) return;

        const currentPage = Number(posts?.current_page ?? 1);
        if (currentPage <= 1) return;

        setItems((prev) => mergeUniquePosts(prev, posts?.data ?? []));
        setNextUrl(posts?.next_page_url ?? null);
    }, [posts]);

    useEffect(() => {
        return () => {
            if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
        };
    }, []);

    const tagNames = useMemo(() => (tags ?? []).map((t) => t.tag_name), [tags]);

    const sidebarTagNames = useMemo(
        () => ["semua", ...(tagNames ?? [])],
        [tagNames],
    );

    const toggleLikePost = (postId) => {
        if (!user) return;

        const before = items;

        setItems((prev) =>
            (prev ?? []).map((p) => {
                if (p.id !== postId) return p;

                const liked = Boolean(p.liked_by_me);
                const count = Number(p.likes_count ?? 0);

                return {
                    ...p,
                    liked_by_me: !liked,
                    likes_count: Math.max(0, count + (liked ? -1 : 1)),
                };
            }),
        );

        router.post(
            `/forum/posts/${postId}/like`,
            {},
            {
                preserveScroll: true,
                onError: () => setItems(before),
            },
        );
    };

    const postCards = useMemo(() => {
        return (items ?? []).map((p) => ({
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
    }, [items]);

    const submitSearch = (value) => {
        router.get(
            "/forum",
            { q: value, tag: filters?.tag ?? "" },
            { preserveState: false, preserveScroll: false },
        );
    };

    const onTagClick = (tag) => {
        if (tag === "semua") {
            router.get(
                "/forum",
                { q: "", tag: "" },
                { preserveState: false, preserveScroll: false },
            );
            return;
        }

        router.get(
            "/forum",
            { q: filters?.q ?? "", tag },
            { preserveState: false, preserveScroll: false },
        );
    };

    const loadMore = () => {
        if (!nextUrl || isLoadingMore || isLoadMoreInFlightRef.current) return;

        isLoadMoreInFlightRef.current = true;
        setIsLoadingMore(true);

        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

        loadTimerRef.current = setTimeout(() => {
            router.get(
                nextUrl,
                {},
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ["posts"],
                    preserveUrl: true,
                    replace: true,
                    onSuccess: (page) => {
                        const newPosts = page.props.posts?.data ?? [];
                        const newNext = page.props.posts?.next_page_url ?? null;

                        setItems((prev) => mergeUniquePosts(prev, newPosts));
                        setNextUrl(newNext);
                    },
                    onFinish: () => {
                        isLoadMoreInFlightRef.current = false;
                        setIsLoadingMore(false);
                    },
                },
            );
        }, LOADING_DELAY_MS);
    };

    const sentinelRef = useRef(null);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { root: null, rootMargin: "350px", threshold: 0 },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [nextUrl, isLoadingMore]);

    return (
        <Container className="py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <header className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900">
                            Setiap Perjalanan{" "}
                            <span className="text-neutral-400">
                                Harus Selalu Diabadikan
                            </span>
                        </h1>
                        <p className="mt-3 text-sm md:text-base text-neutral-700 max-w-2xl">
                            Ceritakan pengalaman Anda, karena setiap detail
                            kecil bisa menjadi inspirasi besar bagi mereka yang
                            baru ingin memulai
                        </p>
                    </header>

                    <ForumFilterAccordion
                        tags={sidebarTagNames}
                        onTagClick={onTagClick}
                    />

                    <ComposerCard
                        avatar={
                            user?.public_profile_image ??
                            "/assets/default-profile.png"
                        }
                        onOpen={() => composer.open()}
                    />

                    <div className="mt-8 space-y-6">
                        {postCards.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onTagClick={onTagClick}
                                onLike={() => toggleLikePost(post.id)}
                            />
                        ))}
                    </div>

                    {isLoadingMore ? <PostCardSkeleton /> : null}

                    <div ref={sentinelRef} className="h-10" />

                    <div className="py-6 text-center text-sm text-neutral-500">
                        {isLoadingMore
                            ? "Memuat..."
                            : nextUrl
                              ? "Scroll untuk memuat lebih banyak"
                              : "Tidak ada post lagi"}
                    </div>
                </div>

                <aside className="hidden lg:block lg:col-span-4">
                    <div className="lg:sticky lg:top-24 space-y-4">
                        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                            <Input
                                placeholder="Cari topik favoritmu..."
                                leftIcon={<FiSearch />}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") submitSearch(q);
                                }}
                            />
                        </div>

                        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                            <TagPillList
                                tags={sidebarTagNames}
                                onTagClick={onTagClick}
                                fontSize="sm"
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </Container>
    );
}

export default function ForumIndex(props) {
    return <ForumIndexPage {...props} />;
}

ForumIndex.layout = (page) => (
    <ForumLayout
        tags={page.props.tags ?? []}
        afterCreate={() => {
            router.reload({ only: ["posts"], preserveScroll: true });
        }}
    >
        {page}
    </ForumLayout>
);

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

function PostCardSkeleton() {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-200" />
                <div className="flex-1">
                    <div className="h-4 w-40 bg-neutral-200 rounded" />
                    <div className="mt-2 h-3 w-24 bg-neutral-200 rounded" />
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <div className="h-3 w-full bg-neutral-200 rounded" />
                <div className="h-3 w-11/12 bg-neutral-200 rounded" />
                <div className="h-3 w-8/12 bg-neutral-200 rounded" />
            </div>

            <div className="mt-4 h-48 w-full bg-neutral-200 rounded-xl" />

            <div className="mt-4 flex gap-4">
                <div className="h-4 w-14 bg-neutral-200 rounded" />
                <div className="h-4 w-14 bg-neutral-200 rounded" />
            </div>
        </div>
    );
}
