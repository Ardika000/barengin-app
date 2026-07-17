import React, { useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { FaLocationDot, FaHeart, FaPlaneDeparture } from "react-icons/fa6";
import { useTranslation } from "@/lib/useTranslation";
import StarRating from "@/Components/StarRating";

// Kartu produk jastip — dipakai di Home, etalase Jastip, dan produk terkait.
// Mendukung dua bentuk props:
//  - Home (statis) : price string ("Rp67.000"), tag string + tagColor, tanpa id/href
//  - Etalase (DB)  : price number, tag {type, date}, id + href + liked (tombol suka aktif)
export default function JastipCard({ product }) {
    const { t } = useTranslation();
    const authUser = usePage().props?.auth?.user;
    const [isLiked, setIsLiked] = useState(Boolean(product.liked));

    const priceLabel =
        typeof product.price === "number"
            ? "Rp" + Number(product.price).toLocaleString("id-ID")
            : product.price;

    // Tag: objek {type, date} dari backend, atau string statis dari Home
    let tagLabel = null;
    let tagColor = product.tagColor || "bg-primary-600";
    if (product.tag && typeof product.tag === "object") {
        tagLabel =
            product.tag.type === "upcoming"
                ? t("jastip.shop.tag_upcoming").replace("{date}", product.tag.date)
                : t("jastip.shop.tag_ongoing").replace("{date}", product.tag.date);
        tagColor = product.tag.type === "upcoming" ? "bg-danger-600" : "bg-primary-600";
    } else if (product.tag) {
        tagLabel = product.tag;
    }

    const canLike = Boolean(product.id);

    const handleToggleLike = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!canLike) return;
        if (!authUser) {
            router.visit("/login");
            return;
        }
        setIsLiked((v) => !v);
        router.post(
            "/favorites/toggle",
            { type: "jastip", id: product.id },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setIsLiked((v) => !v),
            },
        );
    };

    const body = (
        <>
            <div className="relative h-48 bg-neutral-100">
                {tagLabel && (
                    <span
                        className={[
                            "absolute top-2 left-2 z-10",
                            tagColor,
                            "text-white font-medium text-[10px] px-2 py-1 rounded-md",
                        ].join(" ")}
                    >
                        {tagLabel}
                    </span>
                )}

                {canLike && (
                    <button
                        type="button"
                        onClick={handleToggleLike}
                        aria-pressed={isLiked}
                        className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 shadow cursor-pointer"
                    >
                        <FaHeart
                            className={`h-4 w-4 ${isLiked ? "text-red-500" : "text-gray-400"}`}
                        />
                    </button>
                )}

                {product.sold_out && (
                    <span className="absolute bottom-2 left-2 z-10 rounded-md bg-neutral-800/80 px-2 py-1 text-[10px] font-semibold text-white">
                        {t("jastip.shop.sold_out")}
                    </span>
                )}

                <img
                    src={product.image}
                    alt={product.name}
                    className="object-cover h-full w-full"
                    onError={(e) => {
                        e.target.src = "/assets/default-image.png";
                    }}
                />
            </div>

            <div className="p-4 text-neutral-700 border-t border-neutral-200">
                <h4 className="font-medium text-base mb-1 line-clamp-1">{product.name}</h4>
                <p className="font-semibold text-lg mb-3">{priceLabel}</p>

                {/* Lokasi — dua baris terpisah agar mudah dibaca; baris kosong disembunyikan */}
                {(product.from || product.to) && (
                    <div className="mb-3 space-y-1 text-xs text-neutral-600">
                        {product.from && (
                            <div className="flex items-center gap-1.5">
                                <FaPlaneDeparture className="shrink-0 text-neutral-400" />
                                <span className="truncate">
                                    {t("jastip.card.bought_in")}{" "}
                                    <span className="font-semibold text-neutral-700">{product.from}</span>
                                </span>
                            </div>
                        )}
                        {product.to && (
                            <div className="flex items-center gap-1.5">
                                <FaLocationDot className="shrink-0 text-primary-600" />
                                <span className="truncate">
                                    {t("jastip.card.pickup_at")}{" "}
                                    <span className="font-semibold text-neutral-700">{product.to}</span>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-neutral-200 pt-3 gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <img
                            src={product.avatar || "/assets/default-profile.png"}
                            className="w-6 h-6 rounded-full object-cover"
                            alt={product.author}
                            onError={(e) => {
                                e.target.src = "/assets/default-profile.png";
                            }}
                        />
                        <span className="text-sm text-neutral-600 truncate">
                            {t("jastip.shop.by")} {product.author}
                        </span>
                    </div>

                    <StarRating
                        rating={product.rating}
                        className="shrink-0 text-sm font-semibold"
                    />
                </div>
            </div>
        </>
    );

    const cardClass =
        "border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white flex flex-col";

    if (product.href) {
        return (
            <Link href={product.href} className={cardClass}>
                {body}
            </Link>
        );
    }

    return <div className={cardClass}>{body}</div>;
}
