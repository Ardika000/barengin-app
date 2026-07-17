import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Select from "@/Components/Select";
import Button from "@/Components/Button";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import { detectCity } from "@/lib/useGeoCity";
import { useTranslation } from "@/lib/useTranslation";
import { FaMapMarkerAlt, FaShoppingBag, FaSearch } from "react-icons/fa";
import { FaLocationCrosshairs } from "react-icons/fa6";

// Kategori jastip (nama harus cocok dengan tabel jastip_categories → filter etalase).
const CATEGORY_OPTIONS = [
    "Makanan & Minuman",
    "Fashion",
    "Elektronik",
    "Skincare & Kecantikan",
    "Sepatu",
    "Parfum",
];

export default function JastipSearchForm({ naked = false }) {
    const { t } = useTranslation();

    const [toQ, setToQ] = useState("");     // ambil dari mana (lokasi pengambilan)
    const [fromQ, setFromQ] = useState(""); // mau jastip dari mana (lokasi pembelian)
    const [category, setCategory] = useState("");
    const [schedule, setSchedule] = useState("ongoing");
    const [locating, setLocating] = useState(false);

    // "Ambil dari mana" TIDAK diisi otomatis. Pengguna menekan tombol crosshair
    // sendiri bila memang ingin memakai lokasinya saat ini.
    const useMyLocation = async () => {
        if (locating) return;
        setLocating(true);
        const city = await detectCity();
        setLocating(false);
        if (city) setToQ(city);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            "/jastip",
            {
                to_q: toQ || undefined,
                from_q: fromQ || undefined,
                categories: category ? [category] : undefined,
                schedule: schedule || undefined,
            },
            { preserveScroll: true },
        );
    };

    return (
        <form
            onSubmit={handleSearch}
            className={`w-full ${naked ? "bg-white rounded-2xl shadow-lg p-6" : ""}`}
        >
            <div className="grid grid-cols-1 md:grid-cols-14 gap-4 items-end animate-fade-in">
                <div className="md:col-span-4">
                    <PlaceAutocomplete
                        label={t("search.jastip_pickup")}
                        placeholder="Jakarta"
                        leftIcon={<FaMapMarkerAlt />}
                        value={toQ}
                        onChange={setToQ}
                        countryCodes="id"
                        rightAddon={
                            <button
                                type="button"
                                onClick={useMyLocation}
                                title={t("search.use_my_location")}
                                aria-label={t("search.use_my_location")}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-700 transition hover:bg-primary-50"
                            >
                                <FaLocationCrosshairs
                                    className={locating ? "animate-pulse" : ""}
                                />
                            </button>
                        }
                    />
                </div>

                <div className="md:col-span-4">
                    <PlaceAutocomplete
                        label={t("search.jastip_from")}
                        placeholder="Kuala Lumpur"
                        leftIcon={<FaShoppingBag />}
                        value={fromQ}
                        onChange={setFromQ}
                    />
                </div>

                <div className="md:col-span-2">
                    <Select label={t("search.jastip_category")} value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">{t("search.status_all")}</option>
                        {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                </div>

                <div className="md:col-span-2">
                    <Select label={t("search.status")} value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                        <option value="">{t("search.status_all")}</option>
                        <option value="ongoing">{t("search.status_ongoing")}</option>
                        <option value="upcoming">{t("search.status_upcoming")}</option>
                    </Select>
                </div>

                <div className="md:col-span-2">
                    <Button
                        type="primary"
                        rounded={true}
                        className="w-full h-12 flex items-center justify-center gap-2"
                    >
                        <FaSearch />
                        {t("search.cari")}
                    </Button>
                </div>
            </div>
        </form>
    );
}
