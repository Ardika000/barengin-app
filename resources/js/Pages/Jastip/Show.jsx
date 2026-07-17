import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import StarRating from "@/Components/StarRating";
import JastipCard from "@/Pages/Home/Cards/JastipCard";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";
import {
    FaChevronLeft,
    FaLocationDot,
    FaHeart,
    FaRegHeart,
    FaMinus,
    FaPlus,
    FaPlaneUp,
    FaUsers,
    FaRegClock,
} from "react-icons/fa6";
import { BsChatText } from "react-icons/bs";

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function Show({ product, related = [] }) {
    const { t } = useTranslation();
    const authUser = usePage().props?.auth?.user;
    const isOwner = authUser && Number(authUser.id) === Number(product.owner?.id);
    // #4: 'upcoming' belum bisa dipesan (hanya bisa disimpan ke favorit); 'closed' sudah lewat.
    const isUpcoming = product.schedule_status === "upcoming";
    const isClosed = product.schedule_status === "closed";

    const variants = product.variants || [];
    const showVariants = product.has_variants && variants.length > 0;

    // #7: pilih varian pertama secara default
    const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? null);
    const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0] || null;

    const [activeImage, setActiveImage] = useState(product.images?.[0] || "/assets/default-image.png");
    const [quantity, setQuantity] = useState(selectedVariant?.min_buy || product.min_buy || 1);
    const [showFullDesc, setShowFullDesc] = useState(false);
    const [adding, setAdding] = useState(false);
    const [isLiked, setIsLiked] = useState(Boolean(product.liked));

    const remaining = selectedVariant ? selectedVariant.remaining : product.remaining;
    const minBuy = selectedVariant?.min_buy || product.min_buy || 1;
    const unitPrice = product.base_price + product.jastip_fee + (selectedVariant?.price || 0);

    // #5 & #6: klik varian -> highlight gambarnya (bila ada) + ganti stok + reset counter
    const selectVariant = (v) => {
        setSelectedVariantId(v.id);
        setQuantity(v.min_buy || 1);
        if (v.image) setActiveImage(v.image); // varian tanpa gambar: jangan ubah apa pun
    };

    const changeQty = (dir) => {
        setQuantity((q) => {
            if (dir === "minus") return Math.max(minBuy, q - 1);
            if (remaining > 0) return Math.min(remaining, q + 1);
            return q;
        });
    };

    const handleToggleLike = () => {
        if (!authUser) { router.visit("/login"); return; }
        setIsLiked((v) => !v);
        router.post("/favorites/toggle", { type: "jastip", id: product.id }, {
            preserveScroll: true, preserveState: true, onError: () => setIsLiked((v) => !v),
        });
    };

    const handleOpenChat = () => {
        if (!product.owner?.id) { toast.error(t("jastip.show.owner_unavailable")); return; }

        // Sertakan kartu referensi Jastip agar jastiper paham produk mana yang ditanyakan.
        router.post("/chat/personal", {
            user_id: product.owner.id,
            ref_type: "jastip",
            ref_id: product.id,
        });
    };

    // #15: buka grup chat jastip (jastiper <-> semua pembeli produk ini)
    const handleOpenGroupChat = () => {
        router.post(`/chat/jastip/${product.id}/group`);
    };

    const handleAddToCart = () => {
        if (!authUser) { router.visit("/login"); return; }
        if (!selectedVariant || remaining <= 0) { toast.warning(t("jastip.show.sold_out")); return; }
        setAdding(true);
        router.post("/jastip/cart",
            { item_id: product.id, variant_id: selectedVariant.id, quantity },
            { onFinish: () => setAdding(false) });
    };

    // Kembali ke etalase pada kondisi sebelumnya (halaman & filter dipertahankan
    // lewat riwayat browser). Bila produk dibuka langsung tanpa riwayat di dalam
    // app, fallback ke /jastip agar tidak keluar situs.
    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
        } else {
            router.visit("/jastip");
        }
    };

    const descLong = (product.description || "").length > 180;
    const descText = showFullDesc || !descLong ? product.description : product.description.slice(0, 180) + "...";

    const soldOut = remaining <= 0;

    return (
        <div className="min-h-screen bg-white pb-16 pt-6">
            <Head title={`${product.name} - Barengin`} />
            <Container>
                <button
                    type="button"
                    onClick={handleBack}
                    className="mb-6 inline-flex cursor-pointer items-start gap-3 text-left text-2xl font-bold text-neutral-700 transition hover:text-primary-700"
                >
                    <FaChevronLeft className="mt-1 text-xl" />
                    <span className="max-w-3xl">{product.name}</span>
                </button>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
                    {/* LEFT: gallery + info */}
                    <div>
                        {/* #4: gambar besar tinggi tetap + thumbnail scroll vertikal di kanan */}
                        <div className="flex gap-4">
                            <div className="relative h-[360px] flex-1 overflow-hidden rounded-2xl bg-neutral-100 md:h-[460px]">
                                <button
                                    type="button"
                                    onClick={handleToggleLike}
                                    aria-pressed={isLiked}
                                    className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2.5 shadow cursor-pointer"
                                >
                                    <FaHeart className={`h-5 w-5 ${isLiked ? "text-red-500" : "text-gray-400"}`} />
                                </button>
                                <img
                                    src={activeImage}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.target.src = "/assets/default-image.png"; }}
                                />
                            </div>
                            {product.images?.length > 1 && (
                                <div className="flex h-[360px] w-20 flex-col gap-3 overflow-y-auto pr-1 md:h-[460px] [scrollbar-width:thin]">
                                    {product.images.map((img, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setActiveImage(img)}
                                            className={`aspect-square w-full shrink-0 overflow-hidden rounded-xl border-2 transition ${
                                                activeImage === img ? "border-primary-600" : "border-transparent"
                                            }`}
                                        >
                                            <img src={img} alt="" className="h-full w-full object-cover"
                                                onError={(e) => { e.target.src = "/assets/default-image.png"; }} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Ketentuan (tanpa Kondisi/condition — #13) */}
                        <div className="mt-8">
                            <h3 className="mb-2 font-bold text-neutral-800">{t("jastip.show.terms")}</h3>
                            <ul className="space-y-1 text-sm text-neutral-600">
                                {product.weight_gram && <li>{t("jastip.show.weight")}: {product.weight_gram} gram</li>}
                                <li>{t("jastip.show.min_buy")}: {minBuy} {t("jastip.show.pack")}</li>
                                {(product.start_date || product.end_date) && (
                                    <li>
                                        {t("jastip.show.order_window")}: {product.start_date || "-"} – {product.end_date || "-"}
                                    </li>
                                )}
                                {(product.pickup_start_date || product.pickup_end_date) && (
                                    <li>
                                        {t("jastip.show.pickup_window")}: {product.pickup_start_date || "-"} – {product.pickup_end_date || "-"}
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Deskripsi */}
                        <div className="mt-6">
                            <h3 className="mb-2 font-bold text-neutral-800">{t("jastip.show.description")}</h3>
                            {product.end_date && <p className="mb-2 text-sm text-neutral-600">{t("jastip.show.expiry")}: {product.end_date}</p>}
                            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-600">{descText}</p>
                            {descLong && (
                                <button type="button" onClick={() => setShowFullDesc((v) => !v)} className="mt-1 text-sm font-semibold text-primary-700 hover:underline">
                                    {showFullDesc ? t("jastip.show.read_less") : t("jastip.show.read_more")}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: order panel */}
                    <div className="lg:sticky lg:top-24 lg:h-fit">
                        <div className="rounded-2xl border border-neutral-200 p-6 shadow-sm">
                            <div className="mb-4 border-b border-neutral-100 pb-4">
                                <h3 className="font-bold text-neutral-800">{t("jastip.show.your_order")}</h3>
                                {product.category && <p className="mt-1 text-sm text-neutral-500">{product.category}</p>}
                            </div>

                            {/* Quantity */}
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-neutral-700">{t("jastip.show.quantity")}</p>
                                    <p className="text-xs text-neutral-600">({t("jastip.show.stock")}: {remaining})</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button type="button" onClick={() => changeQty("minus")} disabled={quantity <= minBuy}
                                        className="w-8 h-8 rounded-full border-2 border-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 transition">
                                        <FaMinus className="text-xs" />
                                    </button>
                                    <span className="font-bold text-lg w-4 text-center">{quantity}</span>
                                    <button type="button" onClick={() => changeQty("plus")} disabled={soldOut || quantity >= remaining}
                                        className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-sm hover:bg-primary-800 disabled:opacity-50 transition">
                                        <FaPlus className="text-xs" />
                                    </button>
                                </div>
                            </div>

                            {/* #3: label VARIAN + chip varian, hanya bila produk punya varian */}
                            {showVariants && (
                                <div className="mb-4">
                                    <p className="mb-2 text-sm font-semibold text-neutral-700">{t("jastip.show.variant_label")}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {variants.map((v) => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => selectVariant(v)}
                                                disabled={v.remaining <= 0}
                                                className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                                    selectedVariantId === v.id
                                                        ? "border-primary-600 bg-primary-50 text-primary-700"
                                                        : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                                }`}
                                            >
                                                {v.value}
                                                {v.price > 0 && <span className="ml-1 text-xs text-neutral-400">+{rupiah(v.price)}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Price */}
                            <div className="mb-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                                <span className="text-sm font-bold text-neutral-700">{t("jastip.show.price")}</span>
                                <span className="text-lg font-bold text-primary-700">{rupiah(unitPrice * quantity)}</span>
                            </div>

                            {/* Informasi Jasa Titip — owner bisa diklik ke profil forum (#10) */}
                            <div className="mb-4 rounded-xl bg-neutral-50 p-4">
                                <p className="mb-3 text-sm font-bold text-neutral-700">{t("jastip.show.jastip_info")}</p>
                                <div className="flex items-center gap-3">
                                    {product.owner?.username ? (
                                        <Link href={`/forum/users/${product.owner.username}`} className="flex min-w-0 flex-1 items-center gap-3 group">
                                            <img src={product.owner.avatar} alt={product.owner.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                                onError={(e) => { e.target.src = "/assets/default-profile.png"; }} />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">{t("jastip.show.owner")}</p>
                                                <p className="truncate text-sm font-semibold text-neutral-700 group-hover:text-primary-700 group-hover:underline">{product.owner.name}</p>
                                                <StarRating
                                                    rating={product.owner.rating || 0}
                                                    className="text-xs text-neutral-500"
                                                >
                                                    {t("jastip.show.rating")}
                                                </StarRating>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <img src={product.owner.avatar} alt={product.owner.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                                onError={(e) => { e.target.src = "/assets/default-profile.png"; }} />
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-500">{t("jastip.show.owner")}</p>
                                                <p className="truncate text-sm font-semibold text-neutral-700">{product.owner.name}</p>
                                                <StarRating
                                                    rating={product.owner.rating || 0}
                                                    className="text-xs text-neutral-500"
                                                >
                                                    {t("jastip.show.rating")}
                                                </StarRating>
                                            </div>
                                        </div>
                                    )}
                                    {isOwner ? (
                                        <span className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                                            {t("jastip.show.your_jastip")}
                                        </span>
                                    ) : (
                                        <button type="button" onClick={handleOpenChat}
                                            className="w-10 h-10 shrink-0 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors shadow-sm"
                                            aria-label={t("jastip.show.chat_owner")}>
                                            <BsChatText className="text-lg" />
                                        </button>
                                    )}
                                </div>

                                {(product.origin || product.destination) && (
                                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-center text-xs">
                                        <div>
                                            <p className="text-neutral-500">{t("jastip.show.bought_in")}</p>
                                            <p className="font-bold text-neutral-700">{product.origin || "-"}</p>
                                        </div>
                                        <FaPlaneUp className="text-primary-600" />
                                        <div>
                                            <p className="text-neutral-500">{t("jastip.show.arrive_in")}</p>
                                            <p className="font-bold text-neutral-700">{product.destination || "-"}</p>
                                        </div>
                                    </div>
                                )}
                                {product.pickup_address && (
                                    <div className="mt-3 flex items-start gap-2 border-t border-neutral-200 pt-3 text-sm text-neutral-500">
                                        <FaLocationDot className="mt-0.5 shrink-0 text-primary-600" />
                                        <span>
                                            <span className="font-semibold text-neutral-600">{t("jastip.show.pickup_point")}: </span>
                                            {product.pickup_address}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {isOwner ? (
                                /* #5 & #15: pemilik tak melihat tombol pesan — diganti chat grup pembeli */
                                <div className="space-y-2">
                                    <Button isButtonLink={false} type="primary" variant="outline" size="md" rounded={false}
                                        onClick={handleOpenGroupChat}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl font-bold">
                                        <FaUsers /> {t("jastip.show.group_chat")}
                                    </Button>
                                    <p className="text-center text-xs text-neutral-400">{t("jastip.show.group_chat_hint")}</p>
                                </div>
                            ) : isUpcoming ? (
                                /* #4: jastip 'akan dibuka' belum bisa dipesan → tombol tambah favorit */
                                <div className="space-y-2">
                                    <Button isButtonLink={false} type="primary" variant={isLiked ? "solid" : "outline"} size="md" rounded={false}
                                        onClick={handleToggleLike}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl font-bold">
                                        {isLiked ? <FaHeart /> : <FaRegHeart />}
                                        {isLiked ? t("jastip.show.saved_favorite") : t("jastip.show.add_favorite")}
                                    </Button>
                                    {product.start_date && (
                                        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
                                            <FaRegClock /> {t("jastip.show.opens_on")} {product.start_date}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <Button isButtonLink={false} type="primary" size="md" rounded={false}
                                    onClick={handleAddToCart} disabled={adding || soldOut || isClosed}
                                    className="w-full rounded-xl font-bold text-white disabled:opacity-60">
                                    {isClosed ? t("jastip.show.closed") : soldOut ? t("jastip.show.sold_out") : adding ? t("common.processing") : t("jastip.show.add_to_cart")}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Produk terkait */}
                {related.length > 0 && (
                    <div className="mt-16 border-t border-neutral-100 pt-10">
                        <h3 className="mb-6 text-xl font-bold text-neutral-800">
                            {t("jastip.show.other_products").replace("{name}", product.owner.name)}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {related.map((p) => (<JastipCard key={p.id} product={p} />))}
                        </div>
                    </div>
                )}
            </Container>
        </div>
    );
}

Show.layout = (page) => <MainLayout children={page} />;
