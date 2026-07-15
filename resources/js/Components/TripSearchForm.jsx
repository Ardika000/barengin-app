import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Input from "@/Components/Input";
import Button from "@/Components/Button";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import { useTranslation } from "@/lib/useTranslation";
import { FaPlaneDeparture, FaSearch } from "react-icons/fa";

export default function TripSearchForm({ naked = true }) {
    const { t } = useTranslation();
    const { filters = {} } = usePage().props;

    const [tujuan, setTujuan] = useState(filters.tujuan || "");
    const [startDate, setStartDate] = useState(filters.start_date || "");
    const [endDate, setEndDate] = useState(filters.end_date || "");

    // Tanggal hari ini (lokal) sebagai batas bawah agar tanggal lampau tak bisa dipilih.
    const todayStr = new Date().toLocaleDateString("en-CA");

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            "/trip-bareng",
            {
                tujuan: tujuan || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveScroll: true },
        );
    };

    return (
        <form
            onSubmit={handleSearch}
            className={`w-full ${naked ? "bg-white rounded-2xl shadow-lg p-6" : ""}`}
        >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end animate-fade-in">
                <div className="md:col-span-4">
                    <PlaceAutocomplete
                        label={t("search.destination")}
                        placeholder="Bromo"
                        leftIcon={<FaPlaneDeparture />}
                        value={tujuan}
                        onChange={setTujuan}
                        prioritizeIndonesia
                    />
                </div>

                <div className="md:col-span-3">
                    <Input
                        label={t("search.start_date")}
                        type="date"
                        min={todayStr}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="md:col-span-3">
                    <Input
                        label={t("search.end_date")}
                        type="date"
                        min={startDate || todayStr}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
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
