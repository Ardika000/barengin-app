import React, { useEffect, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import Container from "@/Components/Container";
import Input from "@/Components/Input";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import Button from "@/Components/Button";
import Checkbox from "@/Components/Checkbox";
import Pagination from "@/Components/Pagination";
import JastipCard from "@/Pages/Home/Cards/JastipCard";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";
import {
    FaMagnifyingGlass,
    FaLocationCrosshairs,
    FaPlaneDeparture,
    FaLocationDot,
    FaRotateLeft,
} from "react-icons/fa6";
import { FiChevronDown } from "react-icons/fi";

function FilterSection({ title, defaultOpen = true, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-neutral-100 py-5 first:border-t-0 first:pt-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between text-sm font-bold text-neutral-700"
            >
                {title}
                <FiChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <div className="mt-3.5 space-y-3">{children}</div>}
        </div>
    );
}

export default function Index({
    products,
    suggestion,
    filters,
    categories = [],
    foreignPickup = false,
}) {
    const { t } = useTranslation();

    const [search, setSearch] = useState(filters.search || "");
    const [fromQ, setFromQ] = useState(filters.from_q || "");
    const [toQ, setToQ] = useState(filters.to_q || "");
    const [selectedCats, setSelectedCats] = useState(filters.categories || []);
    const [priceMin, setPriceMin] = useState(filters.price_min || "");
    const [priceMax, setPriceMax] = useState(filters.price_max || "");
    const [schedule, setSchedule] = useState(filters.schedule || ""); // "" | "ongoing" | "upcoming"
    const [locatingField, setLocatingField] = useState(null); // "from" | "to" | null
    const [showAllCats, setShowAllCats] = useState(false); // #2: tampilkan 5 kategori dulu
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false); // collapse filter di mobile

    // Search bar sticky di bawah navbar; versi kompak saat menempel (stuck).
    const [stuck, setStuck] = useState(false);
    const [barMounted, setBarMounted] = useState(false); // tetap terpasang selama animasi keluar
    const [navHeight, setNavHeight] = useState(0);
    const sentinelRef = useRef(null);

    // Saat menempel → pasang bar (memicu slide-down). Saat lepas, bar dibiarkan
    // terpasang sampai animasi slide-up selesai (lihat onAnimationEnd).
    useEffect(() => {
        if (stuck) setBarMounted(true);
    }, [stuck]);

    useEffect(() => {
        const nav = document.querySelector("header");
        const h = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
        setNavHeight(h);

        const sentinel = sentinelRef.current;
        if (!sentinel || typeof IntersectionObserver === "undefined") return;

        // Sentinel keluar viewport (terdorong ke atas navbar) → bar menempel.
        const observer = new IntersectionObserver(
            ([entry]) => setStuck(!entry.isIntersecting),
            { rootMargin: `-${h + 1}px 0px 0px 0px`, threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const CATEGORY_PREVIEW = 5;

    const hasActiveFilter =
        search || fromQ || toQ || selectedCats.length > 0 || priceMin || priceMax || schedule;

    const applyFilters = (overrides = {}) => {
        const params = {
            search,
            from_q: fromQ,
            to_q: toQ,
            categories: selectedCats,
            price_min: priceMin,
            price_max: priceMax,
            schedule,
            ...overrides,
        };
        // Bersihkan nilai kosong agar URL rapi
        Object.keys(params).forEach((k) => {
            if (params[k] === "" || params[k] == null || (Array.isArray(params[k]) && params[k].length === 0)) {
                delete params[k];
            }
        });
        router.get("/jastip", params, { preserveScroll: true, preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch("");
        setFromQ("");
        setToQ("");
        setSelectedCats([]);
        setPriceMin("");
        setPriceMax("");
        setSchedule("");
        router.get("/jastip", {}, { preserveScroll: true, preserveState: true, replace: true });
    };

    // #9: filter jadwal (semua / sedang berlangsung / akan dibuka)
    const selectSchedule = (value) => {
        const next = schedule === value ? "" : value;
        setSchedule(next);
        applyFilters({ schedule: next });
    };

    const toggleCategory = (value) => {
        const next = selectedCats.includes(value)
            ? selectedCats.filter((v) => v !== value)
            : [...selectedCats, value];
        setSelectedCats(next);
        applyFilters({ categories: next });
    };

    // Isi kolom "Dibeli di"/"Diambil di" dengan lokasi user (reverse geocode).
    const geolocateInto = (field) => {
        if (!navigator.geolocation) return;
        setLocatingField(field);
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const res = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=id`
                    );
                    const geo = await res.json();
                    const place = geo.city || geo.locality || geo.principalSubdivision || "";
                    setLocatingField(null);
                    if (!place) return;
                    if (field === "from") {
                        setFromQ(place);
                        applyFilters({ from_q: place });
                    } else {
                        setToQ(place);
                        applyFilters({ to_q: place });
                    }
                } catch {
                    setLocatingField(null);
                }
            },
            () => setLocatingField(null),
            { enableHighAccuracy: false, timeout: 10000 }
        );
    };

    // Catatan: kolom "Diambil di" sengaja TIDAK diisi otomatis dari lokasi user.
    // Pengguna dapat mengisinya manual atau memakai tombol crosshair di bawah.

    // Tombol crosshair kecil di dalam input lokasi
    const LocateButton = ({ field }) => (
        <button
            type="button"
            onClick={() => geolocateInto(field)}
            title={t("jastip.shop.use_my_location")}
            aria-label={t("jastip.shop.use_my_location")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-700 transition hover:bg-primary-50"
        >
            <FaLocationCrosshairs className={locatingField === field ? "animate-pulse" : ""} />
        </button>
    );

    const searchSuggestion = () => {
        setSearch(suggestion);
        applyFilters({ search: suggestion });
    };

    const fieldLabel = "mb-1.5 block text-xs font-semibold text-neutral-500";

    return (
        <div className="min-h-screen bg-neutral-50 pb-16 pt-10 md:pt-12">
            <Head title="Jastip - Barengin" />
            <Container>
                {/* ── Kartu pencarian: kata kunci + Dibeli di + Diambil di ── */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyFilters();
                    }}
                    className="mb-12 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm md:mb-16 md:p-7"
                >
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_240px_240px_auto] md:items-end md:gap-6">
                        <div>
                            <label className={fieldLabel}>{t("jastip.shop.search_label")}</label>
                            <Input
                                size="sm"
                                leftIcon={<FaMagnifyingGlass />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t("jastip.shop.search_ph")}
                            />
                        </div>
                        <div>
                            <label className={fieldLabel}>{t("jastip.shop.from_label")}</label>
                            <PlaceAutocomplete
                                size="sm"
                                leftIcon={<FaPlaneDeparture />}
                                rightAddon={<LocateButton field="from" />}
                                value={fromQ}
                                onChange={setFromQ}
                                placeholder={t("jastip.shop.from_ph")}
                            />
                        </div>
                        <div>
                            <label className={fieldLabel}>{t("jastip.shop.to_label")}</label>
                            <PlaceAutocomplete
                                size="sm"
                                leftIcon={<FaLocationDot />}
                                rightAddon={<LocateButton field="to" />}
                                value={toQ}
                                onChange={setToQ}
                                countryCodes="id"
                                placeholder={t("jastip.shop.to_ph")}
                            />
                        </div>
                        <Button type="primary" rounded={false} size="sm" className="h-11 rounded-xl px-6">
                            {t("jastip.shop.search_btn")}
                        </Button>
                    </div>
                </form>

                {/* Sentinel: diletakkan tepat di bawah kartu pencarian. Bar tersemat
                    baru muncul setelah SELURUH kartu terlewat scroll (bukan saat
                    baru sebagian tertutup navbar), sehingga tidak ada tumpang tindih. */}
                <div ref={sentinelRef} aria-hidden="true" className="-mt-8 h-px" />

                {/* ── Bar pencarian tersemat: strip putih selebar layar yang
                    menempel di bawah navbar saat kartu pencarian terlewat scroll.
                    Satu baris kompak — terlihat seperti perpanjangan navbar. ── */}
                {barMounted && (
                    <div
                        className={`${stuck ? "animate-slide-down" : "animate-slide-up"} fixed inset-x-0 z-40 border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur`}
                        style={{ top: Math.max(navHeight - 1, 0) }}
                        onAnimationEnd={() => {
                            if (!stuck) setBarMounted(false);
                        }}
                    >
                        <Container>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    applyFilters();
                                }}
                                className="flex items-center gap-2.5 py-2.5 md:gap-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <Input
                                        size="sm"
                                        leftIcon={<FaMagnifyingGlass />}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder={t("jastip.shop.search_ph")}
                                    />
                                </div>
                                <div className="hidden w-[210px] md:block">
                                    <PlaceAutocomplete
                                        size="sm"
                                        leftIcon={<FaPlaneDeparture />}
                                        rightAddon={<LocateButton field="from" />}
                                        value={fromQ}
                                        onChange={setFromQ}
                                        placeholder={t("jastip.shop.from_ph")}
                                    />
                                </div>
                                <div className="hidden w-[210px] md:block">
                                    <PlaceAutocomplete
                                        size="sm"
                                        leftIcon={<FaLocationDot />}
                                        rightAddon={<LocateButton field="to" />}
                                        value={toQ}
                                        onChange={setToQ}
                                        countryCodes="id"
                                        placeholder={t("jastip.shop.to_ph")}
                                    />
                                </div>
                                <Button type="primary" rounded={false} size="sm" className="h-11 rounded-xl px-5">
                                    {t("jastip.shop.search_btn")}
                                </Button>
                            </form>
                        </Container>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
                    {/* ── Sidebar filter ── */}
                    <aside className="h-fit rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm md:p-7">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 lg:mb-4">
                            {/* Judul = tombol collapse di mobile; statis di desktop */}
                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen((v) => !v)}
                                className="flex items-center gap-2 text-lg font-bold text-neutral-700 lg:pointer-events-none"
                                aria-expanded={mobileFiltersOpen}
                            >
                                {t("jastip.shop.filter")}
                                {hasActiveFilter && (
                                    <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white lg:hidden">
                                        {[selectedCats.length, priceMin || priceMax ? 1 : 0, schedule ? 1 : 0].reduce((a, b) => a + b, 0) || "•"}
                                    </span>
                                )}
                                <FiChevronDown
                                    className={`text-neutral-400 transition-transform lg:hidden ${mobileFiltersOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {hasActiveFilter && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-danger-700 hover:bg-danger-50"
                                >
                                    <FaRotateLeft />
                                    {t("jastip.shop.reset")}
                                </button>
                            )}
                        </div>

                        {/* Isi filter — dapat dilipat di mobile, selalu tampil di desktop */}
                        <div className={`pt-4 lg:pt-0 ${mobileFiltersOpen ? "block" : "hidden"} lg:block`}>
                        {/* #9: filter jadwal jastip */}
                        <FilterSection title={t("jastip.shop.filter_schedule")}>
                            {[
                                { value: "", label: t("jastip.shop.schedule_all") },
                                { value: "ongoing", label: t("jastip.shop.schedule_ongoing") },
                                { value: "upcoming", label: t("jastip.shop.schedule_upcoming") },
                            ].map((opt) => (
                                <button
                                    key={opt.value || "all"}
                                    type="button"
                                    onClick={() => (opt.value === "" ? selectSchedule("") : selectSchedule(opt.value))}
                                    className={`flex w-full items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                                        schedule === opt.value
                                            ? "border-primary-600 bg-primary-50 font-semibold text-primary-700"
                                            : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${schedule === opt.value ? "bg-primary-600" : "bg-neutral-300"}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </FilterSection>

                        <FilterSection title={t("jastip.shop.filter_category")}>
                            {(showAllCats ? categories : categories.slice(0, CATEGORY_PREVIEW)).map((c) => (
                                <Checkbox
                                    key={c.id}
                                    id={`cat-${c.id}`}
                                    checked={selectedCats.includes(c.name)}
                                    onChange={() => toggleCategory(c.name)}
                                    label={c.name}
                                />
                            ))}
                            {categories.length > CATEGORY_PREVIEW && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllCats((v) => !v)}
                                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
                                >
                                    {showAllCats
                                        ? t("jastip.shop.show_less_categories")
                                        : t("jastip.shop.show_more_categories")}
                                    <FiChevronDown className={`transition-transform ${showAllCats ? "rotate-180" : ""}`} />
                                </button>
                            )}
                        </FilterSection>

                        <FilterSection title={t("jastip.shop.filter_price")}>
                            <Input
                                size="sm"
                                type="number"
                                min="0"
                                leftAddon="Rp"
                                value={priceMin}
                                onChange={(e) => setPriceMin(e.target.value)}
                                placeholder={t("jastip.shop.price_min")}
                            />
                            <Input
                                size="sm"
                                type="number"
                                min="0"
                                leftAddon="Rp"
                                value={priceMax}
                                onChange={(e) => setPriceMax(e.target.value)}
                                placeholder={t("jastip.shop.price_max")}
                            />
                            <Button
                                type="primary"
                                variant="outline"
                                rounded={false}
                                size="sm"
                                onClick={() => applyFilters()}
                                className="w-full justify-center rounded-lg"
                            >
                                {t("jastip.shop.apply")}
                            </Button>
                        </FilterSection>
                        </div>
                    </aside>

                    {/* ── Grid produk ── */}
                    <div>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-bold text-neutral-700">{t("jastip.shop.products")}</h2>
                            {/* Pintu masuk fitur Request Titipan */}
                            <Link
                                href="/jastip/requests"
                                className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
                            >
                                <FaPlaneDeparture size={13} />
                                {t("jastip.request.entry_btn")}
                            </Link>
                        </div>

                        {/* Saran typo: "Mungkin maksud Anda ..." */}
                        {foreignPickup && (
                            <div className="mb-5 rounded-xl border border-orange-200/60 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
                                {t("jastip.shop.pickup_id_only")}
                            </div>
                        )}

                        {products.data.length === 0 && suggestion && (
                            <div className="mb-5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-neutral-700">
                                {t("jastip.shop.did_you_mean")}{" "}
                                <button
                                    type="button"
                                    onClick={searchSuggestion}
                                    className="font-bold text-primary-700 underline-offset-2 hover:underline"
                                >
                                    {suggestion}
                                </button>
                                ?
                            </div>
                        )}

                        {products.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-20 text-center">
                                <FaMagnifyingGlass size={28} className="mb-3 text-neutral-300" />
                                <p className="text-sm font-semibold text-neutral-600">{t("jastip.shop.empty")}</p>
                                {hasActiveFilter && (
                                    <Button
                                        type="primary"
                                        variant="outline"
                                        size="xs"
                                        onClick={resetFilters}
                                        className="mt-4 gap-1.5"
                                    >
                                        <FaRotateLeft />
                                        {t("jastip.shop.reset")}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5">
                                {products.data.map((p) => (
                                    <JastipCard key={p.id} product={p} />
                                ))}
                            </div>
                        )}

                        {products.last_page > 1 && (
                            <Pagination
                                className="mt-10"
                                currentPage={products.current_page}
                                totalPages={products.last_page}
                                onPageChange={(page) => {
                                    if (page < 1 || page > products.last_page) return;
                                    applyFilters({ page });
                                }}
                            />
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
}

Index.layout = (page) => <MainLayout children={page} />;
