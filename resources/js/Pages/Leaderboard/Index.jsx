import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import StarRating from "@/Components/StarRating";
import Input from "@/Components/Input";
import {
    FaSuitcase,
    FaBagShopping,
    FaTrophy,
    FaLocationCrosshairs,
} from "react-icons/fa6";
import { FaCrown, FaFire } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import StreakBadge from "@/Components/StreakBadge";
import { useTranslation } from "@/lib/useTranslation";
import { fuzzyIncludes } from "@/lib/fuzzyMatch";

const BOARDS = [
    {
        key: "purchase_trip",
        tab: "lb.tab_purchase_trip",
        metric: "lb.metric_purchase_trip",
        unit: "lb.unit_trip",
        rating: false,
        Icon: FaSuitcase,
    },
    {
        key: "purchase_jastip",
        tab: "lb.tab_purchase_jastip",
        metric: "lb.metric_purchase_jastip",
        unit: "lb.unit_jastip",
        rating: false,
        Icon: FaBagShopping,
    },
    {
        key: "best_guider",
        tab: "lb.tab_best_guider",
        metric: "lb.metric_created_trip",
        unit: "lb.unit_trip",
        rating: true,
        Icon: FaSuitcase,
    },
    {
        key: "best_jastiper",
        tab: "lb.tab_best_jastiper",
        metric: "lb.metric_created_jastip",
        unit: "lb.unit_jastip",
        rating: true,
        Icon: FaBagShopping,
    },
    {
        key: "streak",
        tab: "lb.tab_streak",
        metric: "lb.metric_streak",
        unit: "lb.unit_day",
        rating: false,
        Icon: FaFire,
    },
];

const PODIUM_STYLE = {
    1: {
        ring: "ring-yellow-400",
        badge: "bg-yellow-400 text-white",
        order: "order-2 md:-translate-y-5",
        size: "h-24 w-24",
    },
    2: {
        ring: "ring-neutral-300",
        badge: "bg-neutral-400 text-white",
        order: "order-1",
        size: "h-20 w-20",
    },
    3: {
        ring: "ring-amber-500",
        badge: "bg-amber-600 text-white",
        order: "order-3",
        size: "h-20 w-20",
    },
};

export default function Leaderboard({ boards = {}, streakLeader = null }) {
    const { t } = useTranslation();
    const authUserId = usePage().props.auth?.user?.id;
    const [activeKey, setActiveKey] = useState("purchase_trip");
    const [query, setQuery] = useState("");

    const board = BOARDS.find((b) => b.key === activeKey);
    const rows = boards[activeKey] || [];
    const unit = t(board.unit);

    const isMe = (u) =>
        authUserId != null && String(u.id) === String(authUserId);

    // Saat mencari, tampilkan daftar rata (tanpa podium) hasil pencocokan fuzzy.
    const searching = query.trim() !== "";
    const filtered = useMemo(
        () =>
            searching ? rows.filter((r) => fuzzyIncludes(r.name, query)) : rows,
        [rows, query, searching],
    );

    const topThree = rows.slice(0, 3);
    const rest = rows.slice(3);

    // Urutan podium: rank 2 (kiri), rank 1 (tengah), rank 3 (kanan)
    const podiumOrder = [
        topThree.find((r) => r.rank === 2),
        topThree.find((r) => r.rank === 1),
        topThree.find((r) => r.rank === 3),
    ].filter(Boolean);

    // Peringkat user login di papan yang sedang ditampilkan (untuk label tombol).
    const myRank = useMemo(
        () => rows.find((u) => isMe(u))?.rank,
        [rows, authUserId],
    );

    // Tombol melayang "peringkat kamu": muncul saat baris user login berada di luar
    // viewport, hilang saat terlihat (mirip scroll-to-top). Cek posisi secara
    // sinkron (bukan IntersectionObserver) agar langsung akurat saat ganti tab &
    // tidak berkedip di ambang batas (bikin sulit diklik).
    const [showJump, setShowJump] = useState(false);
    const meElRef = useRef(null);

    useEffect(() => {
        let raf = 0;
        const compute = () => {
            const el = document.querySelector("[data-leaderboard-me]");
            meElRef.current = el;
            if (!el) {
                setShowJump(false);
                return;
            }
            const r = el.getBoundingClientRect();
            const vh =
                window.innerHeight || document.documentElement.clientHeight;
            // Terlihat bila sebagian barisnya masuk viewport (buffer ~navbar atas).
            const visible = r.top < vh - 24 && r.bottom > 88;
            setShowJump(!visible);
        };
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(compute);
        };

        compute(); // hitung langsung saat tab/pencarian berubah → reset benar
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, [activeKey, query, searching, myRank]);

    const jumpToMe = () => {
        document
            .querySelector("[data-leaderboard-me]")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const ProfileWrap = ({ user, className, children, ...rest }) =>
        user.username ? (
            <Link
                href={`/forum/users/${user.username}`}
                className={className}
                {...rest}
            >
                {children}
            </Link>
        ) : (
            <div className={className} {...rest}>
                {children}
            </div>
        );

    const YouBadge = () => (
        <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {t("lb.you")}
        </span>
    );

    // Tabel peringkat yang dipakai ulang untuk "sisa" & hasil pencarian.
    const RankedTable = ({ list }) => (
        <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                    <thead>
                        <tr className="bg-neutral-50 text-xs font-bold uppercase tracking-wider text-neutral-500">
                            <th className="px-6 py-3">{t("lb.col_rank")}</th>
                            <th className="px-6 py-3">{t("lb.col_user")}</th>
                            <th className="px-6 py-3">{t(board.metric)}</th>
                            {board.rating && (
                                <th className="px-6 py-3">
                                    {t("lb.col_rating")}
                                </th>
                            )}
                            <th className="px-6 py-3 text-right">
                                {t("lb.col_action")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {list.map((u) => (
                            <tr
                                key={u.id}
                                {...(isMe(u)
                                    ? { "data-leaderboard-me": "true" }
                                    : {})}
                                className={`transition ${isMe(u) ? "bg-primary-50/70" : "hover:bg-neutral-50/60"}`}
                            >
                                <td className="px-6 py-3.5 text-sm font-semibold text-neutral-500">
                                    #{u.rank}
                                </td>
                                <td className="px-6 py-3.5">
                                    <ProfileWrap
                                        user={u}
                                        className="flex items-center gap-3 group"
                                    >
                                        <img
                                            src={u.avatar}
                                            alt={u.name}
                                            className={`h-9 w-9 rounded-full border object-cover ${isMe(u) ? "border-primary-500 ring-2 ring-primary-200" : "border-neutral-200"}`}
                                            onError={(e) => {
                                                e.target.src =
                                                    "/assets/default-profile.png";
                                            }}
                                        />
                                        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800 group-hover:text-primary-700">
                                            {u.name}
                                            {isMe(u) && <YouBadge />}
                                        </span>
                                    </ProfileWrap>
                                </td>
                                <td className="px-6 py-3.5 text-sm text-neutral-600">
                                    {u.count} {unit}
                                </td>
                                {board.rating && (
                                    <td className="px-6 py-3.5">
                                        <StarRating rating={u.rating} className="text-sm font-medium" />
                                    </td>
                                )}
                                <td className="px-6 py-3.5 text-right">
                                    {u.username && (
                                        <Button
                                            isButtonLink
                                            href={`/forum/users/${u.username}`}
                                            type="primary"
                                            variant="outline"
                                            size="xs"
                                            rounded={false}
                                            className="rounded-lg"
                                        >
                                            {t("lb.view_profile")}
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <Container className="py-10">
            <Head title={t("nav.leaderboard")} />

            {/* Header */}
            <div className="mb-8 text-center">
                <h1 className="mb-2 flex items-center justify-center gap-2 text-2xl font-bold text-neutral-800 md:text-3xl">
                    <FaTrophy className="text-yellow-400" />{" "}
                    {t("nav.leaderboard")}
                </h1>
                <p className="mx-auto max-w-2xl text-sm text-neutral-500">
                    {t("lb.subtitle")}
                </p>
            </div>

            {/* Tabs */}
            <div className="mb-8 flex flex-wrap justify-center gap-2">
                {BOARDS.map((b) => {
                    const active = activeKey === b.key;
                    return (
                        <button
                            key={b.key}
                            type="button"
                            onClick={() => setActiveKey(b.key)}
                            className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                                active
                                    ? "border-primary-700 bg-primary-700 text-white shadow-sm"
                                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                            }`}
                        >
                            <b.Icon className="text-xs" />
                            {t(b.tab)}
                        </button>
                    );
                })}
            </div>

            {/* Cari seseorang di papan peringkat (fuzzy, toleran typo) */}
            <div className="mx-auto mb-8 max-w-md">
                <Input
                    leftIcon={<FiSearch />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("lb.search_person")}
                />
            </div>

            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center text-sm text-neutral-500">
                    {t("lb.empty")}
                </div>
            ) : searching ? (
                /* Mode pencarian: daftar rata hasil pencocokan, dengan peringkat asli */
                filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center text-sm text-neutral-500">
                        {t("lb.no_match")}
                    </div>
                ) : (
                    <RankedTable list={filtered} />
                )
            ) : (
                <>
                    {/* Podium top 3 */}
                    <div className="mb-8 flex items-end justify-center gap-4 md:gap-8">
                        {podiumOrder.map((u) => {
                            const s = PODIUM_STYLE[u.rank];
                            const me = isMe(u);
                            return (
                                <ProfileWrap
                                    key={u.id}
                                    user={u}
                                    {...(me
                                        ? { "data-leaderboard-me": "true" }
                                        : {})}
                                    className={`flex w-32 flex-col items-center rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md md:w-44 ${s.order} ${me ? "border-primary-400 ring-2 ring-primary-300" : "border-neutral-100"}`}
                                >
                                    <div className="relative mb-3">
                                        {u.rank === 1 && (
                                            <FaCrown className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl text-yellow-400 drop-shadow" />
                                        )}
                                        <img
                                            src={u.avatar}
                                            alt={u.name}
                                            className={`rounded-full object-cover ring-4 ${s.ring} ${s.size}`}
                                            onError={(e) => {
                                                e.target.src =
                                                    "/assets/default-profile.png";
                                            }}
                                        />
                                        <span
                                            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.badge}`}
                                        >
                                            #{u.rank}
                                        </span>
                                    </div>
                                    <h3 className="line-clamp-1 text-center text-sm font-bold text-neutral-800">
                                        {u.name}
                                    </h3>
                                    {me && (
                                        <div className="mt-1">
                                            <YouBadge />
                                        </div>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-neutral-600">
                                        <span className="flex items-center gap-1 text-primary-700">
                                            <board.Icon /> {u.count} {unit}
                                        </span>
                                        {board.rating && (
                                            <StarRating rating={u.rating} />
                                        )}
                                    </div>
                                </ProfileWrap>
                            );
                        })}
                    </div>

                    {/* Ranked list */}
                    {rest.length > 0 && <RankedTable list={rest} />}
                </>
            )}

            {/* Tombol melayang: lompat ke peringkat user login bila di luar layar */}
            {showJump && myRank != null && (
                <button
                    type="button"
                    onClick={jumpToMe}
                    className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-800"
                >
                    <FaLocationCrosshairs />
                    {t("lb.jump_to_me")} · #{myRank}
                </button>
            )}
        </Container>
    );
}

Leaderboard.layout = (page) => <MainLayout>{page}</MainLayout>;
