import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Input from "@/Components/Input";
import Button from "@/Components/Button";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import {
    FaMapMarkerAlt,
    FaPlane,
    FaUser,
    FaSearch,
} from "react-icons/fa";

export default function PergiSearchForm({ naked = true }) {
    const { filters = {} } = usePage().props;

    const [dari, setDari] = useState(filters.dari || "");
    const [ke, setKe] = useState(filters.ke || "");
    const [tanggal, setTanggal] = useState(filters.tanggal || "");
    const [waktu, setWaktu] = useState(filters.waktu || "");
    const [jumlah, setJumlah] = useState(filters.jumlah || "");

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
                        label="Dari mana"
                        placeholder="Jln Sentul, Bogor Selatan"
                        leftIcon={<FaMapMarkerAlt />}
                        value={dari}
                        onChange={setDari}
                    />
                </div>

                <div className="lg:col-span-3">
                    <PlaceAutocomplete
                        label="Ke mana"
                        placeholder="Bandar Soekarno Hatta"
                        leftIcon={<FaPlane />}
                        value={ke}
                        onChange={setKe}
                    />
                </div>

                <div className="lg:col-span-3">
                    <Input
                        label="Tanggal Pergi"
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                    />
                </div>

                <div className="lg:col-span-3">
                    <Input
                        label="Waktu Kumpul"
                        type="time"
                        value={waktu}
                        onChange={(e) => setWaktu(e.target.value)}
                    />
                </div>

                <div className="lg:col-span-2">
                    <Input
                        label="Jumlah Orang"
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
                        Cari
                    </Button>
                </div>
            </div>
        </form>
    );
}
