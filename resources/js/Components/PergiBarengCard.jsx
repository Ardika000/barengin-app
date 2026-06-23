import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/Components/Button";
import {
    FaMapMarkerAlt,
    FaClock,
    FaUsers,
    FaCar,
    FaBus,
    FaTrain,
    FaHeart,
    FaStar,
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { BsLightningFill, BsChatDots } from "react-icons/bs";

export default function PergiBarengCard({ data }) {
    const {
        image = "/assets/pergi-bareng/PergiBarengHeader.avif",
        title = "Terminal Cibubur",
        address = "Gang. Siliwangi No 5, Jakarta Timur",
        date = "31 Jan 26",
        time = "09:00",
        capacity = "15/20 Orang",
        remainingSeats = 5,
        user = {
            name: "Edwin Hendly",
            avatar: "/assets/default-profile.png",
            rating: 4.9,
            reviews: 120,
            verified: true,
        },
        transportType = "Mobil Pribadi",
        transportIcon = "car",
        href = "#",
        liked = false,
    } = data || {};

    const [isLiked, setIsLiked] = useState(Boolean(liked));

    const handleToggleLike = () => {
        if (!data?.id) return;
        setIsLiked((v) => !v);
        router.post(
            "/favorites/toggle",
            { type: "pergi_bareng", id: data.id },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setIsLiked((v) => !v),
            },
        );
    };

    const TransportIcon = () => {
        switch (transportIcon) {
            case "bus":
                return <FaBus className="h-4 w-4" />;
            case "train":
                return <FaTrain className="h-4 w-4" />;
            default:
                return <FaCar className="h-4 w-4" />;
        }
    };

    const handleChat = () => {
        const otherUserId = data?.user?.id; // pastikan backend mengirim ini

        if (!otherUserId) {
            alert("Organizer id belum tersedia.");
            return;
        }

        router.post("/chat/personal", { user_id: otherUserId });
    };

    return (
        <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md">
            {/* --- Bagian Gambar --- */}
            <div className="relative">
                <img
                    src={image}
                    alt={title}
                    className="h-44 w-full object-cover"
                    onError={(e) => {
                        e.target.src =
                            "/assets/pergi-bareng/PergiBarengHeader.avif";
                    }}
                />

                <button
                    type="button"
                    onClick={handleToggleLike}
                    aria-pressed={isLiked}
                    aria-label={isLiked ? "Batal sukai" : "Sukai"}
                    className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow transition-transform hover:scale-105 cursor-pointer"
                >
                    <FaHeart
                        className={`h-5 w-5 transition-colors ${isLiked ? "text-red-500" : "text-gray-400"}`}
                    />
                </button>

                {/* SISA KURSI DINAMIS */}
                <div className="absolute left-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full bg-neutral-800/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">
                    <BsLightningFill className="text-yellow-400" />
                    <span>sisa {remainingSeats} kursi lagi</span>
                </div>
            </div>

            {/* --- Bagian Konten --- */}
            <div className="p-5">
                {/* Judul & Lokasi */}
                <div className="mb-4 space-y-1">
                    <h3 className="text-lg font-bold text-neutral-900 line-clamp-1">
                        {title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-neutral-500 font-medium">
                        <FaMapMarkerAlt className="text-primary-600 shrink-0" />
                        <span className="truncate">{address}</span>
                    </div>
                </div>

                {/* Tanggal & Kapasitas */}
                <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <FaClock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        <span className="truncate whitespace-nowrap">
                            {date} - {time}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                        <FaUsers className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{capacity}</span>
                    </div>
                </div>

                <hr className="my-4 border-t border-dashed border-neutral-200" />

                {/* Info Penyelenggara */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-200">
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="min-w-0 max-w-[140px] sm:max-w-[160px]">
                            {/* NAMA */}
                            <div className="flex items-center gap-1 text-sm font-bold text-neutral-900 min-w-0">
                                <span className="truncate">{user.name}</span>
                                {user.verified && (
                                    <MdVerified className="size-4 shrink-0 text-blue-500" />
                                )}
                            </div>

                            {/* RATING */}
                            <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-500 min-w-0">
                                <FaStar className="size-3 shrink-0 text-yellow-400" />
                                <span className="shrink-0 font-bold text-neutral-900">
                                    {user.rating}
                                </span>
                                <span className="truncate">
                                    ({user.reviews} ulasan)
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="xs"
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        onClick={handleChat}
                    >
                        <BsChatDots size={14} />
                        Chat
                    </Button>
                </div>

                <hr className="my-4 border-t border-dashed border-neutral-200" />

                {/* Transportasi & Tombol Aksi */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                            <TransportIcon />
                        </div>

                        <div className="min-w-0 text-xs">
                            <p className="whitespace-nowrap text-neutral-400">
                                Transportasi
                            </p>
                            <p className="truncate font-medium text-neutral-700">
                                {transportType}
                            </p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        isButtonLink={true}
                        href={href}
                        className="px-4 py-2 shrink-0 whitespace-nowrap"
                    >
                        Ikut Pergi
                    </Button>
                </div>
            </div>
        </div>
    );
}
