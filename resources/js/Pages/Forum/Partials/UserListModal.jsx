import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, router, usePage } from "@inertiajs/react";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import Button from "@/Components/Button";
import useLockBodyScroll from "@/Hooks/useLockBodyScroll";
import { useTranslation } from "@/lib/useTranslation";

/**
mode:
- people (all users)
- followers
- following
 */
export default function UserListModal({
    open,
    onClose,
    mode = "people",
    username, // required for mode followers atau following
}) {
    useLockBodyScroll(open);

    const { t } = useTranslation();
    const auth = usePage().props.auth;

    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const [followOverride, setFollowOverride] = useState({}); // { [userId]: boolean }

    const title = useMemo(() => {
        if (mode === "followers") return t("forum.user_list.followers_title");
        if (mode === "following") return t("forum.user_list.following_title");
        return t("forum.nav.find_people");
    }, [mode, t]);

    const endpoint = useMemo(() => {
        if (mode === "followers") return `/forum/users/${username}/followers`;
        if (mode === "following") return `/forum/users/${username}/following`;
        return `/forum/people`;
    }, [mode, username]);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setLoading(true);
        setQ("");
        setFollowOverride({});

        fetch(endpoint, { headers: { Accept: "application/json" } })
            .then((r) => r.json())
            .then((json) => {
                if (cancelled) return;
                setItems(Array.isArray(json?.data) ? json.data : []);
            })
            .catch(() => {
                if (cancelled) return;
                setItems([]);
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, endpoint]);

    const filtered = useMemo(() => {
        const qq = (q ?? "").trim().toLowerCase();
        if (!qq) return items;

        return (items ?? []).filter((u) => {
            const name = (u.full_name ?? "").toLowerCase();
            const uname = (u.username ?? "").toLowerCase();
            const bio = (u.bio ?? "").toLowerCase();
            return name.includes(qq) || uname.includes(qq) || bio.includes(qq);
        });
    }, [q, items]);

    const toggleFollow = (user) => {
        if (!auth?.user) return;

        const current = followOverride[user.id] ?? Boolean(user.is_following);
        const next = !current;

        setFollowOverride((p) => ({ ...(p ?? {}), [user.id]: next }));

        router.post(
            `/forum/users/${user.username}/follow`,
            {},
            {
                preserveScroll: true,
                onError: () => {
                    setFollowOverride((p) => ({
                        ...(p ?? {}),
                        [user.id]: current,
                    }));
                },
                onSuccess: () => {
                    setItems((prev) =>
                        (prev ?? []).map((x) =>
                            x.id === user.id ? { ...x, is_following: next } : x,
                        ),
                    );
                },
            },
        );
    };

    if (!open) return null;

    // Dirender lewat portal ke <body>, BUKAN di tempatnya berada di pohon React.
    // Alasannya: pemakai bisa menaruh modal ini di dalam elemen yang membentuk
    // stacking context — mis. ProfileSidebar berada di dalam <aside class="lg:sticky">,
    // dan `position: sticky` SELALU membentuk stacking context. Akibatnya z-[9999]
    // di bawah ini hanya berlaku di dalam konteks si aside (yang sendirinya
    // z-index:auto), sehingga modal kalah dari <header class="relative z-50">
    // dan navbar menimpa overlay. Portal ke body membuat z-index-nya dinilai di
    // level root, jadi modal aman dipakai di dalam wadah apa pun.
    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/40" />

            <div
                className="absolute inset-0 flex items-center justify-center p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose?.();
                }}
            >
                <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 w-9 rounded-lg hover:bg-neutral-100 inline-flex items-center justify-center"
                            aria-label="Back"
                        >
                            <FiArrowLeft />
                        </button>

                        <div className="flex-1 text-center font-semibold">
                            {title}
                        </div>

                        <div className="w-9" />
                    </div>

                    <div className="p-4 border-b border-neutral-100">
                        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                            <FiSearch className="text-neutral-500" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className="w-full outline-none text-sm"
                                placeholder={t("forum.user_list.search_ph")}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-sm text-neutral-500">
                                {t("common.loading")}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-6 text-sm text-neutral-500">
                                {t("forum.user_list.empty")}
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-200">
                                {filtered.map((u) => {
                                    const isFollowing =
                                        followOverride[u.id] ??
                                        Boolean(u.is_following);

                                    return (
                                        <div
                                            key={u.id}
                                            className="px-4 py-4 hover:bg-neutral-50 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Link
                                                    href={`/forum/users/${u.username}`}
                                                    className="flex items-center gap-3 min-w-0 flex-1"
                                                    onClick={() => onClose?.()}
                                                >
                                                    <img
                                                        src={
                                                            u.avatar ??
                                                            "/assets/default-profile.png"
                                                        }
                                                        alt={
                                                            u.full_name ??
                                                            u.username
                                                        }
                                                        className="h-11 w-11 rounded-full object-cover shrink-0"
                                                    />

                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-neutral-700 truncate text-sm">
                                                            {u.full_name ??
                                                                "Unknown"}
                                                        </div>
                                                        <div className="text-sm text-neutral-500 truncate">
                                                            @{u.username}
                                                        </div>
                                                        {u.bio ? (
                                                            <div className="text-xs text-neutral-500 truncate mt-0.5">
                                                                {u.bio}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </Link>

                                                {auth?.user &&
                                                auth.user.username !==
                                                    u.username ? (
                                                    <div className="shrink-0">
                                                        <Button
                                                            size="sm"
                                                            type="primary"
                                                            rounded
                                                            className="px-5 justify-center"
                                                            variant={
                                                                isFollowing
                                                                    ? "outline"
                                                                    : "solid"
                                                            }
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toggleFollow(u);
                                                            }}
                                                        >
                                                            {isFollowing
                                                                ? t("common.unfollow")
                                                                : t("lb.follow")}
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
