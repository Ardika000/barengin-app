import { FaHeart } from "react-icons/fa";
import { BsLightningFill } from "react-icons/bs";
import { MdDateRange } from "react-icons/md";
import { MdPeopleAlt } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { FaMapMarkerAlt } from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { BsChatDots } from "react-icons/bs";
import { Link, router } from "@inertiajs/react";

import Button from "@/Components/Button";

export default function TripCard({ trip }) {
    const {
        title,
        location,
        date,
        capacity,
        joined_count,
        remaining_seats,
        rating,
        price,
        guide,
        guide_avatar,
        guide_badge,
        guide_rating,
        guide_reviews,
        image,
        liked,
    } = trip;

    const joinedCountSafe = typeof joined_count === "number" ? joined_count : 0;
    const capacitySafe = typeof capacity === "number" ? capacity : 0;
    const handleOpenChat = () => {
            const otherUserId = trip?.guide_id;
    
            if (!otherUserId) {
                alert("Host user id belum tersedia. Pastikan backend mengirim trip.host.id");
                return;
            }
    
            router.post("/chat/personal", { user_id: otherUserId });
        };

    return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
            {/* --- Bagian Gambar --- */}
            <div className="relative">
                <img
                    src={image}
                    alt={title}
                    className="h-44 w-full object-cover"
                    onError={(e) => {
                        e.target.src =
                            "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop";
                    }}
                />
                <button className="absolute right-3 top-3 bg-white/90 rounded-full p-2 shadow z-10 hover:scale-105 transition-transform">
                    <FaHeart
                        className={`h-5 w-5 ${liked ? "text-red-500" : "text-gray-400"}`}
                    />
                </button>

                {/* SISA KURSI DINAMIS */}
                <div className="absolute left-3 bottom-3 bg-neutral-800/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium z-10">
                    <BsLightningFill className="text-yellow-400" />
                    <span>sisa {remaining_seats} kursi lagi</span>
                </div>
            </div>

            {/* --- Bagian Konten --- */}
            <div className="p-5">
                {/* Judul & Lokasi */}
                <div className="mb-4 space-y-1">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                        {title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                        <FaMapMarkerAlt className="text-primary-600" />
                        <p>{location}</p>
                    </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 divide-x divide-dashed divide-gray-300">
                    {/* --- KOLOM TANGGAL --- */}
                    <div className="flex flex-col gap-1.5 pl-1 min-w-0">
                        <div className="flex items-center gap-1 text-neutral-500 font-medium">
                            <MdDateRange
                                size={14}
                                className="text-neutral-400 shrink-0"
                            />
                            <span className="truncate">Tanggal Trip</span>
                        </div>
                        <div className="flex flex-col min-w-0" title={date}>
                            <span className="text-neutral-800 font-semibold leading-tight pr-1.5 truncate">
                                {date?.split(" (")[0]}
                            </span>
                            {date?.includes("(") && (
                                <span className="text-neutral-600 font-medium leading-tight truncate">
                                    ({date?.split(" (")[1]}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* --- KOLOM KAPASITAS --- */}
                    <div className="flex flex-col gap-1.5 pl-3 min-w-0">
                        <div className="flex items-center gap-1 text-neutral-500 font-medium">
                            <MdPeopleAlt
                                size={14}
                                className="text-primary-500 shrink-0"
                            />
                            <span className="truncate">Kapasitas</span>
                        </div>
                        <p className="text-neutral-800 font-semibold">
                            {typeof joined_count === "number"
                                ? `${joined_count}/${capacity} orang`
                                : `${capacity} orang`}
                        </p>
                    </div>

                    {/* --- KOLOM RATING --- */}
                    <div className="flex flex-col gap-1.5 pl-3 min-w-0">
                        <div className="flex items-center gap-1 text-neutral-500 font-medium">
                            <FaStar
                                size={14}
                                className="text-yellow-400 shrink-0"
                            />
                            <span className="truncate">Rating Trip</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-neutral-500">
                        <span className="text-neutral-900 font-bold">
                            {guide_rating}
                        </span>
                        <span>({guide_reviews} ulasan)</span>
                    </div>
                    </div>
                </div>

                <hr className="border-t border-dashed border-gray-300 my-5" />

                {/* Info Pemandu */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="h-11 w-11 shrink-0 rounded-full bg-gray-200 overflow-hidden border border-neutral-200">
                            <img
                                src={guide_avatar}
                                alt={guide}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        
                        <div className="min-w-0 max-w-[140px] sm:max-w-[160px]">
                            {/* NAMA */}
                            <div className="flex items-center gap-1 text-sm font-bold text-gray-900 min-w-0">
                                <span className="truncate">{guide}</span>
                                <MdVerified className="text-blue-500 shrink-0 size-4" />
                            </div>

                            {/* BADGE */}
                            <div className="text-orange-500 text-xs font-semibold mt-0.5 truncate">
                                {guide_badge}
                            </div>

                            {/* RATING */}
                            <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-neutral-500 min-w-0">
                                <FaStar className="text-yellow-400 size-3 shrink-0" />
                                <span className="text-neutral-900 font-bold shrink-0">
                                    {guide_rating}
                                </span>
                                <span className="truncate">({guide_reviews} ulasan)</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="xs"
                        variant="outline"
                        className="px-4 py-2.5 flex gap-1 items-center shrink-0"
                        onClick={handleOpenChat}
                    >
                        <BsChatDots size={14} />
                        Chat Pemandu
                    </Button>
                </div>

                <hr className="border-t border-dashed border-gray-300 my-5" />

                {/* Harga & Tombol Aksi */}
                <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-gray-900">
                        Rp {price?.toLocaleString("id-ID") ?? 0}
                        <span className="text-sm font-medium text-gray-500 ml-1">
                            / orang
                        </span>
                    </div>
                    <Button
                        size="sm"
                        isButtonLink={true}
                        href={`/trip-bareng/${trip.id}`}
                        className="px-4 py-2"
                    >
                        Ikut Trip
                    </Button>
                </div>
            </div>
        </div>
    );
}