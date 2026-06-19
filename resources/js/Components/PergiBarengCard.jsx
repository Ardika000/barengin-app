import React from "react";
import { Link, router } from "@inertiajs/react";
import Button from "@/Components/Button";
import { FaMapMarkerAlt, FaClock, FaUsers, FaComment, FaCar, FaBus, FaTrain } from "react-icons/fa";

export default function PergiBarengCard({ data }) {
    const {
        image = "/assets/default-trip.jpg",
        title = "Terminal Cibubur",
        address = "Gang. Siliwangi No 5, Jakarta Timur",
        date = "31 Jan 26",
        time = "09:00",
        capacity = "15/20 Orang",
        remainingSeats = 5,
        user = {
            name: "Edwin Hendly",
            avatar: "/assets/default-avatar.png",
            rating: 4.9,
            reviews: 120,
            verified: true,
        },
        transportType = "Mobil Pribadi",
        transportIcon = "car",
        href = "#",
    } = data || {};

    const TransportIcon = () => {
        switch (transportIcon) {
            case "bus": return <FaBus className="w-4 h-4" />;
            case "train": return <FaTrain className="w-4 h-4" />;
            default: return <FaCar className="w-4 h-4" />;
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
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover" />
            {/* Remaining seats badge */}
            <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full whitespace-nowrap">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
                Sisa {remainingSeats} Kursi lagi
            </span>
            </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
            {/* Title & Address */}
            <div className="min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 leading-snug line-clamp-2">
                {title}
            </h3>
            <div className="mt-1 flex items-start gap-1.5 text-neutral-500 text-sm">
                <FaMapMarkerAlt className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary-700" />
                <span className="truncate min-w-0">{address}</span>
            </div>
            </div>

            {/* Date & Capacity (dibuat 1 baris, tidak wrap) */}
            <div className="flex items-center justify-between gap-3 text-sm text-neutral-600">
            <div className="flex items-center gap-1.5 min-w-0">
                <FaClock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate whitespace-nowrap">
                {date} - {time}
                </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <FaUsers className="w-3.5 h-3.5 text-neutral-400" />
                <span>{capacity}</span>
            </div>
            </div>

            {/* User Info + Chat (rapi, tidak dorong-dorongan) */}
            <div className="flex items-center justify-between gap-3">
            {/* kiri */}
            <div className="flex items-center gap-2.5 min-w-0">
                <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-neutral-200 shrink-0"
                />

                <div className="min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                    {user.name}
                    </p>

                    {user.verified && (
                    <svg
                        className="w-3.5 h-3.5 text-blue-500 shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-label="verified"
                    >
                        <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                        />
                    </svg>
                    )}
                </div>

                <div className="flex items-center gap-1 text-xs text-neutral-500 whitespace-nowrap">
                    <span className="text-yellow-500">★</span>
                    <span className="font-medium text-neutral-700">{user.rating}</span>
                    <span className="truncate">({user.reviews} ulasan)</span>
                </div>
                </div>
            </div>

            {/* kanan */}
            <Button
                type="primary"
                variant="outline"
                size="sm"
                rounded={true}
                className="gap-1.5 text-xs h-8 px-3 shrink-0"
                onClick={handleChat}
            >
                <FaComment className="w-3 h-3" />
                Chat
            </Button>
            </div>

            {/* Transport Type & Join Button (spasi konsisten) */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 shrink-0">
                <TransportIcon />
                </div>

                <div className="text-xs min-w-0">
                <p className="text-neutral-400 whitespace-nowrap">Transportasi</p>
                <p className="font-medium text-neutral-700 truncate">
                    {transportType}
                </p>
                </div>
            </div>

            <Button
                isButtonLink
                href={href}
                type="primary"
                variant="solid"
                size="sm"
                rounded={true}
                className="text-sm h-9 px-5 shrink-0 whitespace-nowrap"
            >
                Ikut Pergi
            </Button>
            </div>
        </div>
        </div>
    );
}