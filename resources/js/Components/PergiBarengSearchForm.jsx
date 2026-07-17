import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Input from "@/Components/Input";
import Button from "@/Components/Button";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import { detectCity } from "@/lib/useGeoCity";
import {
    FaMapMarkerAlt,
    FaPlane,
    FaUser,
    FaSearch,
} from "react-icons/fa";
import { FaLocationCrosshairs } from "react-icons/fa6";
import { useTranslation } from "@/lib/useTranslation";

export default function PergiSearchForm({ naked = true }) {
    const { t } = useTranslation();
    const { filters = {} } = usePage().props;

    const [dari, setDari] = useState(filters.dari || "");
    const [ke, setKe] = useState(filters.ke || "");
    const [tanggal, setTanggal] = useState(filters.tanggal || "");
    const [waktu, setWaktu] = useState(filters.waktu || "");
    const [jumlah, setJumlah] = useState(filters.jumlah || "");
    const [locating, setLocating] = useState(false);

    // Batasi ke hari ini ke depan. Untuk waktu, hanya batasi bila tanggal yang
    // dipilih adalah hari ini (agar jam lampau tak bisa dipilih); tanggal mendatang
    // bebas memilih jam berapa pun.
    const todayStr = new Date().toLocaleDateString("en-CA");
    const timeMin =
        tanggal === todayStr
            ? new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : undefined;

    // "Dari mana" TIDAK lagi diisi otomatis dengan lokasi user. Pengguna bisa
    // menekan tombol crosshair untuk mengisi lokasinya sendiri saat dibutuhkan.
    const useMyLocation = async () => {
        if (locating) return;
        setLocating(true);
        const city = await detectCity();
        setLocating(false);
        if (city) setDari(city);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            "/pergi-bareng",
            {
                dari: dari || undefined,
                ke: ke || undefined,
                tanggal: tanggal || undefined,
                waktu: waktu || undefined,
                jumlah: jumlah || undefined,
                sort: filters.sort || undefined,
            },
            { preserveScroll: true },
        );
    };

    return (
        <form
            onSubmit={handleSearch}
            className={`w-full ${naked ? "bg-white rounded-2xl shadow-lg p-6" : ""}`}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-16 gap-4 items-end animate-fade-in">
                <div className="lg:col-span-3">
                    <PlaceAutocomplete
                        label={t("search.from")}
                        placeholder="Jln Sentul, Bogor Selatan"
                        leftIcon={<FaMapMarkerAlt />}
                        value={dari}
                        onChange={setDari}
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

                <div className="lg:col-span-3">
                    <PlaceAutocomplete
                        label={t("search.to")}
                        placeholder="Bandar Soekarno Hatta"
                        leftIcon={<FaPlane />}
                        value={ke}
                        onChange={setKe}
                        countryCodes="id"
                    />
                </div>

                <div className="lg:col-span-3">
                    <Input
                        label={t("search.depart_date")}
                        type="date"
                        min={todayStr}
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                    />
                </div>

                <div className="lg:col-span-3">
                    <Input
                        label={t("search.meet_time")}
                        type="time"
                        min={timeMin}
                        value={waktu}
                        onChange={(e) => setWaktu(e.target.value)}
                    />
                </div>

                <div className="lg:col-span-2">
                    <Input
                        label={t("search.people")}
                        type="number"
                        min={1}
                        placeholder="1"
                        leftIcon={<FaUser />}
                        value={jumlah}
                        onChange={(e) => setJumlah(e.target.value)}
                    />
                </div>

                <div className="lg:col-span-2">
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
