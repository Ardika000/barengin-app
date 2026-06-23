import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Input from "@/Components/Input";
import Button from "@/Components/Button";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import { FaPlaneDeparture, FaSearch } from "react-icons/fa";

export default function TripSearchForm({ naked = true }) {
    const { filters = {} } = usePage().props;

    const [tujuan, setTujuan] = useState(filters.tujuan || "");
    const [startDate, setStartDate] = useState(filters.start_date || "");
    const [endDate, setEndDate] = useState(filters.end_date || "");

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
                        label="Tujuan"
                        placeholder="Jakarta"
                        leftIcon={<FaPlaneDeparture />}
                        value={tujuan}
                        onChange={setTujuan}
                        prioritizeIndonesia
                    />
                </div>

                <div className="md:col-span-3">
                    <Input
                        label="Tanggal Mulai"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>

                <div className="md:col-span-3">
                    <Input
                        label="Tanggal Selesai"
                        type="date"
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
                        Cari
                    </Button>
                </div>
            </div>
        </form>
    );
}
