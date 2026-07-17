import React, { useState } from "react";
import { FaStar, FaTrophy } from "react-icons/fa6";
import { FiChevronDown } from "react-icons/fi";
import StarRating from "@/Components/StarRating";
import { useTranslation } from "@/lib/useTranslation";

const INITIAL_REVIEWS = 3;

// Satu bintang dengan isian sebagian (fill 0..1) — overlay emas dipotong sesuai fill.
function Star({ fill = 0, size = 18 }) {
    const clamped = Math.max(0, Math.min(1, fill));
    return (
        <span className="relative inline-block" style={{ width: size, height: size }}>
            <FaStar className="absolute inset-0 text-neutral-200" style={{ fontSize: size }} />
            <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${clamped * 100}%` }}
            >
                <FaStar className="text-amber-400" style={{ fontSize: size }} />
            </span>
        </span>
    );
}

function Stars({ value = 0, size = 18, gap = 4 }) {
    return (
        <div className="inline-flex" style={{ gap }}>
            {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} fill={value - i} size={size} />
            ))}
        </div>
    );
}

// Cincin progres melingkar untuk menampilkan rata-rata rating (0..5).
function RatingRing({ value = 0, hasReviews = true }) {
    const r = 54;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, value / 5));
    const offset = c * (1 - pct);

    return (
        <div className="relative h-36 w-36">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <circle cx="70" cy="70" r={r} fill="none" stroke="#eef2f7" strokeWidth="12" />
                {hasReviews && (
                    <circle
                        cx="70"
                        cy="70"
                        r={r}
                        fill="none"
                        className="text-primary-700"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 700ms ease" }}
                    />
                )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-neutral-800">
                    {hasReviews ? value.toFixed(1) : "—"}
                </span>
                <span className="text-[11px] font-medium text-neutral-400">/ 5.0</span>
            </div>
        </div>
    );
}

function ReviewItem({ review, t }) {
    return (
        <div className="flex gap-3 py-4">
            <img
                src={review.avatar || "/assets/default-profile.png"}
                alt={review.name || t("admin.perf.anonymous")}
                className="h-10 w-10 shrink-0 rounded-full object-cover border border-neutral-200 bg-neutral-100"
                onError={(e) => { e.target.src = "/assets/default-profile.png"; }}
            />
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-neutral-700">
                        {review.name || t("admin.perf.anonymous")}
                    </span>
                    <StarRating
                        rating={review.rating}
                        className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold"
                    />
                    <span className="text-xs text-neutral-400">{review.date}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600 break-words">
                    {review.comment}
                </p>
            </div>
        </div>
    );
}

export default function AccountPerformanceCard({ rating }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    const average = Number(rating?.average ?? 0);
    const count = Number(rating?.count ?? 0);
    const breakdown = rating?.breakdown ?? {};
    const reviews = Array.isArray(rating?.reviews) ? rating.reviews : [];
    const hasReviews = count > 0;

    const visibleReviews = expanded ? reviews : reviews.slice(0, INITIAL_REVIEWS);
    const canToggle = reviews.length > INITIAL_REVIEWS;

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-neutral-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                    <FaTrophy size={15} />
                </span>
                <h3 className="font-bold text-neutral-700">{t("admin.perf.title")}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Ring + bintang */}
                <div className="flex flex-col items-center justify-center text-center">
                    <RatingRing value={average} hasReviews={hasReviews} />
                    <div className="mt-3">
                        <Stars value={hasReviews ? average : 0} size={20} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-neutral-700">
                        {t("admin.perf.overall_rating")}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                        {hasReviews
                            ? t("admin.perf.based_on").replace("{n}", count.toLocaleString("id-ID"))
                            : t("admin.perf.no_reviews")}
                    </p>
                </div>

                {/* Distribusi */}
                <div className="flex flex-col justify-center">
                    {hasReviews ? (
                        <>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                {t("admin.perf.distribution")}
                            </p>
                            <div className="space-y-2.5">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const n = Number(breakdown?.[star] ?? 0);
                                    const pct = count > 0 ? (n / count) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <span className="flex w-8 shrink-0 items-center gap-1 text-xs font-semibold text-neutral-600">
                                                {star}
                                                <FaStar className="text-amber-400" size={11} />
                                            </span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                                                <div
                                                    className="h-full rounded-full bg-amber-400"
                                                    style={{ width: `${pct}%`, transition: "width 700ms ease" }}
                                                />
                                            </div>
                                            <span className="w-8 shrink-0 text-right text-xs font-medium text-neutral-500">
                                                {n}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-8 text-center">
                            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-300 shadow-sm">
                                <FaStar size={18} />
                            </span>
                            <p className="text-sm font-semibold text-neutral-600">
                                {t("admin.perf.no_reviews")}
                            </p>
                            <p className="mt-1 text-xs text-neutral-400 max-w-[220px]">
                                {t("admin.perf.no_reviews_desc")}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Ulasan tertulis */}
            {reviews.length > 0 && (
                <div className="border-t border-neutral-100 px-6 py-5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        {t("admin.perf.latest_reviews")}
                    </p>
                    <div className="divide-y divide-neutral-100">
                        {visibleReviews.map((review) => (
                            <ReviewItem key={review.id} review={review} t={t} />
                        ))}
                    </div>

                    {canToggle && (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-colors"
                        >
                            {expanded ? t("admin.perf.show_less") : t("admin.perf.show_more")}
                            <FiChevronDown
                                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
