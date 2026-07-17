import React, { useState, useEffect, useMemo } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon (vite bundler issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

import Container from "@/Components/Container";
import Button from "@/Components/Button";
import ImageLightbox from "@/Components/ImageLightbox";
import StarRating from "@/Components/StarRating";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";

import {
    FaMapMarkerAlt,
    FaRegCalendarAlt,
    FaRegClock,
    FaCarSide,
    FaBed,
    FaUtensils,
    FaCamera,
    FaArrowRight,
    FaRegHeart,
    FaHeart,
    FaChevronLeft,
    FaTicketAlt,
    FaUserTie,
    FaCheckCircle,
} from "react-icons/fa";
import { BsChatText, BsPeople } from "react-icons/bs";
import { IoMdInformationCircleOutline } from "react-icons/io";

export default function Detail({ trip }) {
    const { t } = useTranslation();
    const currentTrip = trip;
    const authUser = usePage().props?.auth?.user;
    const isOwner = authUser && Number(authUser.id) === Number(currentTrip?.host?.id);

    const [isLiked, setIsLiked] = useState(Boolean(trip.liked));

    // Gambar aktivitas dibuka di ImageLightbox (bisa di-zoom & digeser), sama
    // seperti gambar di forum dan chat. `images` diisi per aktivitas yang diklik
    // agar navigasi kiri/kanan tetap dalam satu aktivitas.
    const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });

    const handleToggleLike = () => {
        setIsLiked((v) => !v);
        router.post(
            "/favorites/toggle",
            { type: "trip", id: trip.id },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setIsLiked((v) => !v),
            },
        );
    };

    const IconMap = {
        FaCarSide:    FaCarSide,
        FaBed:        FaBed,
        FaUtensils:   FaUtensils,
        FaCamera:     FaCamera,
        FaTicketAlt:  FaTicketAlt,
        FaUserTie:    FaUserTie,
        carside:      FaCarSide,
        car:          FaCarSide,
        transport:    FaCarSide,
        transportasi: FaCarSide,
        bed:          FaBed,
        hotel:        FaBed,
        penginapan:   FaBed,
        utensils:     FaUtensils,
        food:         FaUtensils,
        makan:        FaUtensils,
        camera:       FaCamera,
        foto:         FaCamera,
        dokumentasi:  FaCamera,
        ticket:       FaTicketAlt,
        ticketalt:    FaTicketAlt,
        tiket:        FaTicketAlt,
        usertie:      FaUserTie,
        guide:        FaUserTie,
        pemandu:      FaUserTie,
        "fa-car-side":   FaCarSide,
        "fa-bed":        FaBed,
        "fa-utensils":   FaUtensils,
        "fa-camera":     FaCamera,
        "fa-ticket-alt": FaTicketAlt,
        "fa-user-tie":   FaUserTie,
    };

    // Helper: toleran terhadap spasi, case, dan tanda hubung
    const getIcon = (name) => {
        if (!name) return FaCarSide;
        return (
            IconMap[name] ||
            IconMap[name.toLowerCase()] ||
            IconMap[name.toLowerCase().replace(/[\s\-_]/g, "")] ||
            FaCarSide
        );
    };

    // ── MAP STATE ──
    const [position, setPosition] = useState([-6.1751, 106.8272]); // Default: Jakarta

    // Cari koordinat berdasarkan trip.location (nama destinasi trip)
    useEffect(() => {
        const lokasi = currentTrip?.location || currentTrip?.title;
        if (!lokasi) return;

        const fetchCoordinates = async () => {
            try {
                const query = encodeURIComponent(`${lokasi}, Indonesia`);
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
                );
                const data = await response.json();

                if (data && data.length > 0) {
                    setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                } else {
                    console.log("Lokasi tidak ditemukan, tetap di posisi default.");
                }
            } catch (error) {
                console.error("Gagal cari koordinat:", error);
            }
        };

        fetchCoordinates();
    }, [currentTrip?.location, currentTrip?.title]);



    const handleOpenChat = () => {
        const otherUserId = currentTrip?.host?.id;

        if (!otherUserId) {
            toast.error("ID pemandu belum tersedia.");
            return;
        }

        // Sertakan kartu referensi Trip Bareng sebagai konteks percakapan.
        router.post("/chat/personal", {
            user_id: otherUserId,
            ref_type: "trip",
            ref_id: currentTrip.id,
        });
    };

    const handleOpenGroupChat = () => {
        router.post(`/chat/trip/${currentTrip.id}/group`);
    };

    return (
        <div className="min-h-screen bg-white pb-32">
            <Head title={`Trip ${currentTrip.title} - Barengin`} />

            <Container className="pt-6">
                {/* HERO */}
                <div className="relative h-[350px] md:h-[400px] w-full rounded-3xl overflow-hidden mb-10 shadow-sm">
                    <img
                        src={currentTrip.image || "/assets/trips/hero.jpg"}
                        alt={currentTrip.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src =
                                "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop";
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    <button
                        type="button"
                        onClick={() => (window.history.length > 1 ? window.history.back() : router.visit("/trip-bareng"))}
                        className="absolute top-6 left-6 md:top-8 md:left-8 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center text-white transition-all shadow-sm"
                        aria-label="Kembali"
                    >
                        <FaChevronLeft className="text-sm -ml-0.5" />
                    </button>

                    {currentTrip.already_joined && (
                        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10 flex items-center gap-2 rounded-full bg-success-600/95 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                            <FaCheckCircle className="text-base" />
                            Anda sudah didalam grup trip ini!
                        </div>
                    )}

                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 text-white">
                        <h1 className="text-4xl md:text-5xl font-bold mb-3">
                            {currentTrip.title}
                        </h1>
                        <div className="flex items-center text-sm md:text-base text-neutral-200 mb-6 gap-2 font-medium">
                            <FaMapMarkerAlt />
                            <span>{currentTrip.location}</span>
                            <span className="mx-1">•</span>
                            <span>{currentTrip.duration}</span>
                        </div>

                        {/* Avatar Group — peserta asli yang sudah bergabung */}
                        {currentTrip.joined_count > 0 && (
                            <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md w-fit px-4 py-2.5 rounded-full border border-white/20">
                                <div className="flex -space-x-3">
                                    {(currentTrip.participants ?? [])
                                        .slice(0, 4)
                                        .map((p, i) => (
                                            <img
                                                key={i}
                                                src={p.avatar}
                                                title={p.name}
                                                className="w-8 h-8 rounded-full border-2 border-white/40 object-cover bg-neutral-200"
                                                alt={p.name}
                                                onError={(e) => {
                                                    e.target.src = "/assets/default-profile.png";
                                                }}
                                            />
                                        ))}
                                    {currentTrip.joined_count > 4 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white/40 bg-blue-100 text-primary-700 flex items-center justify-center text-xs font-bold z-10">
                                            +{currentTrip.joined_count - 4}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs leading-tight">
                                    <p className="font-semibold text-white">{t("trip.detail.confirmed")}</p>
                                    <p className="text-white/80 font-medium">
                                        {currentTrip.joined_count}/{currentTrip.capacity} {t("trip.detail.joined")}
                                        {currentTrip.remaining_seats > 0 && (
                                            <> · {currentTrip.remaining_seats} {t("trip.detail.seats_left")}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT */}
                    <div className="lg:col-span-2 space-y-10">
                        <section>
                            <h2 className="text-2xl font-bold text-neutral-700 mb-4">
                                {t("trip.detail.about")} {currentTrip.title}
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-neutral-700 font-medium mb-5 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                                <FaRegCalendarAlt className="text-neutral-500 text-lg" />
                                <span>
                                    {t("trip.detail.will_run")}{" "}
                                    <strong>{currentTrip.date_range}</strong>
                                </span>
                            </div>
                            <p className="text-neutral-600 leading-relaxed text-[15px] text-justify">
                                {currentTrip.description}
                            </p>
                        </section>

                        <hr className="border-neutral-200" />

                        {/* Itinerary Timeline */}
                        <section>
                            <div className="space-y-0 relative">
                                {currentTrip.itinerary.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 md:gap-6 relative group">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 z-10 text-sm mt-1 transition-colors duration-300 bg-neutral-200 text-neutral-600 group-hover:bg-primary-600 group-hover:text-white">
                                                {item.step}
                                            </div>
                                            {idx !== currentTrip.itinerary.length - 1 && (
                                                <div className="w-0.5 h-full bg-neutral-200 mt-2 mb-1 rounded-full group-hover:bg-primary-300 transition-colors duration-300" />
                                            )}
                                        </div>
                                        <div className="pb-10 w-full">
                                            <h3 className="text-[17px] font-bold text-neutral-700 mb-1.5 group-hover:text-primary-700 transition-colors">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3 font-medium">
                                                <FaRegClock />
                                                <span>{item.time}</span>
                                            </div>
                                            <p className="text-neutral-600 text-[15px] leading-relaxed mb-4 whitespace-pre-line">
                                                {item.desc}
                                            </p>
                                            {item.images && item.images.length > 0 && (
                                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                    {item.images.map((img, imgIdx) => (
                                                        <button
                                                            key={imgIdx}
                                                            type="button"
                                                            onClick={() =>
                                                                setLightbox({
                                                                    open: true,
                                                                    images: item.images,
                                                                    index: imgIdx,
                                                                })
                                                            }
                                                            className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                                        >
                                                            <img
                                                                src={img}
                                                                alt={`Step ${item.step}`}
                                                                className="w-40 md:w-48 h-28 object-cover rounded-xl border border-neutral-200 cursor-zoom-in hover:border-primary-400 transition-all"
                                                                onError={(e) => {
                                                                    e.target.src =
                                                                        "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop";
                                                                }}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* MAP CARD — react-leaflet + Nominatim */}
                        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                            <div className="px-4 pt-4 pb-2">
                                <h3 className="text-[15px] font-bold text-neutral-700">{t("trip.detail.location")}</h3>
                                <p className="text-xs text-neutral-500 mt-0.5">{currentTrip.location}</p>
                            </div>

                            {/* Peta react-leaflet */}
                            <div className="h-52 bg-neutral-200 relative z-0">
                                <MapContainer
                                    key={`${position[0]}-${position[1]}`}
                                    center={position}
                                    zoom={13}
                                    scrollWheelZoom={false}
                                    className="w-full h-full z-0"
                                >
                                    <TileLayer
                                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={position}>
                                        <Popup>
                                            <b>{currentTrip.title}</b><br />
                                            {currentTrip.location}
                                        </Popup>
                                    </Marker>
                                </MapContainer>

                                {/* Tombol buka Google Maps */}
                                <Button
                                    size="sm"
                                    className="absolute bottom-3 right-3 z-[1000] bg-primary-600 text-white shadow-md hover:bg-primary-700 text-xs px-3 py-1.5"
                                    onClick={() =>
                                        window.open(
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTrip.location + ", Indonesia")}`,
                                            "_blank"
                                        )
                                    }
                                >
                                    <FaMapMarkerAlt className="inline mr-1" />
                                    {t("common.open_maps")}
                                </Button>
                            </div>
                        </div>

                        {/* Host Card */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img
                                    src={currentTrip.host.avatar || "https://i.pravatar.cc/150?u=kingsman"}
                                    className="w-12 h-12 rounded-full border border-neutral-200 object-cover"
                                    alt={currentTrip.host.name}
                                />
                                <div>
                                    <p className="text-[11px] text-neutral-500 font-medium mb-0.5">
                                        {t("trip.detail.guider")}
                                    </p>
                                    <h4 className="font-bold text-neutral-700 leading-tight mb-0.5">
                                        {currentTrip.host.name}
                                    </h4>
                                    {currentTrip.host.rating ? (
                                        <StarRating
                                            rating={currentTrip.host.rating}
                                            reviews={currentTrip.host.reviews}
                                            className="text-xs font-medium"
                                        />
                                    ) : (
                                        <div className="text-xs font-medium text-neutral-500">
                                            {t("trip.detail.guider_new")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {isOwner ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                                        {t("trip.detail.your_trip")}
                                    </span>
                                ) : (
                                    <button type="button" onClick={handleOpenChat} title={t("trip.detail.chat_host")} className="w-10 h-10 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors shadow-sm">
                                        <BsChatText className="text-lg" />
                                    </button>
                                )}
                                {/* Grup chat trip — hanya untuk peserta / pemandu */}
                                {(currentTrip.already_joined || isOwner) && (
                                    <button
                                        type="button"
                                        onClick={handleOpenGroupChat}
                                        title={t("trip.detail.group_chat")}
                                        aria-label={t("trip.detail.group_chat")}
                                        className="w-10 h-10 rounded-lg border border-primary-700 flex items-center justify-center text-primary-700 hover:bg-primary-50 transition-colors shadow-sm"
                                    >
                                        <BsPeople className="text-lg" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Pricing Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                            <h3 className="text-[17px] font-bold text-neutral-700 mb-2">{t("trip.detail.total_price")}</h3>
                            <div className="flex items-end gap-1 mb-6">
                                <span className="text-3xl font-bold text-primary-600">
                                    Rp {currentTrip.price.toLocaleString("id-ID")}
                                </span>
                                <span className="text-sm text-neutral-500 mb-1">{t("common.per_person")}</span>
                            </div>

                            <div className="space-y-4 mb-6">
                                {currentTrip.facilities && currentTrip.facilities.length > 0 ? (
                                    currentTrip.facilities.map((facility, index) => {
                                        const IconComponent = getIcon(facility.icon);
                                        return (
                                            <div key={index} className="flex items-center gap-3 text-sm text-neutral-700 font-medium">
                                                <IconComponent className="text-neutral-400 text-[17px] shrink-0" />
                                                {facility.name}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-neutral-500 italic">
                                        {t("trip.detail.no_facilities")}
                                    </p>
                                )}
                            </div>

                            <div className="bg-orange-50 border border-orange-200/60 rounded-xl p-4 flex items-start gap-3">
                                <IoMdInformationCircleOutline className="text-orange-600 text-xl shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800 leading-relaxed font-medium">
                                    {t("trip.detail.price_note")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>

            {/* STICKY BOTTOM BAR */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] z-[60]">
                <Container className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="hidden md:block">
                        <p className="text-sm text-neutral-500 mb-0.5 font-medium">{t("trip.detail.book_prompt")}</p>
                        <h3 className="text-lg font-bold text-neutral-700">{currentTrip.title}</h3>
                    </div>
                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-5 md:gap-8">
                        <div className="text-right">
                            <p className="text-[13px] text-neutral-500 mb-0.5 font-medium">{t("trip.detail.starting_from")}</p>
                            <p className="text-xl font-bold text-neutral-700">
                                Rp {currentTrip.price.toLocaleString("id-ID")}{" "}
                                <span className="text-sm font-medium text-neutral-500">{t("common.per_person")}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                isButtonLink
                                href={`/trip-bareng/${trip.id}/checkout`}
                                type="primary"
                                size="md"
                                className="px-6 md:px-8 font-semibold gap-2 shadow-sm rounded-xl"
                            >
                                {t("trip.detail.book_now")} <FaArrowRight className="text-sm" />
                            </Button>
                            <button
                                type="button"
                                onClick={handleToggleLike}
                                aria-pressed={isLiked}
                                aria-label={isLiked ? "Batal sukai trip" : "Sukai trip"}
                                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors bg-white shrink-0 ${
                                    isLiked
                                        ? "border-red-500 text-red-500 bg-red-50"
                                        : "border-neutral-300 text-neutral-500 hover:text-red-500 hover:border-red-500 hover:bg-red-50"
                                }`}
                            >
                                {isLiked ? (
                                    <FaHeart className="text-[17px]" />
                                ) : (
                                    <FaRegHeart className="text-[17px]" />
                                )}
                            </button>
                        </div>
                    </div>
                </Container>
            </div>

            <ImageLightbox
                images={lightbox.images}
                index={lightbox.index}
                open={lightbox.open}
                onClose={() => setLightbox((s) => ({ ...s, open: false }))}
                alt={t("trip.detail.activity_image")}
            />
        </div>
    );
}

Detail.layout = (page) => <MainLayout children={page} />;