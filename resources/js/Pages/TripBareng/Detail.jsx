import React, { useMemo } from "react";
import { Head, Link, router } from "@inertiajs/react";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import LocationMap from "@/Components/LocationMap";

import MainLayout from "@/Layouts/MainLayout";

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
    FaChevronLeft,
    FaTicketAlt,
    FaUserTie,
} from "react-icons/fa";

import { BsChatText } from "react-icons/bs";
import { IoMdInformationCircleOutline } from "react-icons/io";

export default function Detail({ trip }) {
    const currentTrip = trip;

    const IconMap = {
        FaCarSide: FaCarSide,
        FaBed: FaBed,
        FaUtensils: FaUtensils,
        FaCamera: FaCamera,
        FaTicketAlt: FaTicketAlt,
        FaUserTie: FaUserTie,
        carside: FaCarSide,
        car: FaCarSide,
        transport: FaCarSide,
        transportasi: FaCarSide,
        bed: FaBed,
        hotel: FaBed,
        penginapan: FaBed,
        utensils: FaUtensils,
        food: FaUtensils,
        makan: FaUtensils,
        camera: FaCamera,
        foto: FaCamera,
        dokumentasi: FaCamera,
        ticket: FaTicketAlt,
        ticketalt: FaTicketAlt,
        tiket: FaTicketAlt,
        usertie: FaUserTie,
        guide: FaUserTie,
        pemandu: FaUserTie,
        "fa-car-side": FaCarSide,
        "fa-bed": FaBed,
        "fa-utensils": FaUtensils,
        "fa-camera": FaCamera,
        "fa-ticket-alt": FaTicketAlt,
        "fa-user-tie": FaUserTie,
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

    const mapQuery = useMemo(() => {
        return (
            currentTrip?.location_detail ||
            currentTrip?.location ||
            currentTrip?.title ||
            "Indonesia"
        );
    }, [currentTrip]);

    const mapLabel = useMemo(() => {
        return currentTrip?.title
            ? `Lokasi ${currentTrip.title}`
            : "Lokasi Trip";
    }, [currentTrip]);

    const handleOpenChat = () => {
        const otherUserId = currentTrip?.host?.id;

        if (!otherUserId) {
            alert("Host user id belum tersedia. Pastikan backend mengirim trip.host.id");
            return;
        }

        router.post("/chat/personal", { user_id: otherUserId });
    };

    return (
        <div className="min-h-screen bg-white pb-32">
            <Head title={`Trip ${currentTrip.title} - Barengin`} />

            <Container className="pt-6">
                {/* HERO */}
                <div className="relative h-[350px] md:h-[400px] w-full rounded-3xl overflow-hidden mb-10 shadow-sm">
                    <img
                        src="/assets/trips/hero.jpg"
                        alt={currentTrip.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src =
                                "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop";
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    <Link
                        href="/trip-bareng"
                        className="absolute top-6 left-6 md:top-8 md:left-8 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center text-white transition-all shadow-sm"
                        aria-label="Kembali"
                    >
                        <FaChevronLeft className="text-sm -ml-0.5" />
                    </Link>

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

                        {/* Avatar Group — dinamis berdasarkan joined_count */}
                        {currentTrip.joined_count > 0 && (
                            <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md w-fit px-4 py-2.5 rounded-full border border-white/20">
                                <div className="flex -space-x-3">
                                    {Array.from({
                                        length: Math.min(
                                            currentTrip.joined_count,
                                            3,
                                        ),
                                    }).map((_, i) => (
                                        <img
                                            key={i}
                                            src={`https://i.pravatar.cc/100?img=${i + 10}`}
                                            className="w-8 h-8 rounded-full border-2 border-white/40 object-cover"
                                            alt="User"
                                        />
                                    ))}
                                    {currentTrip.joined_count > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white/40 bg-blue-100 text-primary-700 flex items-center justify-center text-xs font-bold z-10">
                                            +{currentTrip.joined_count - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs leading-tight">
                                    <p className="font-semibold text-white">
                                        Wisatawan Terkonfirmasi
                                    </p>
                                    <p className="text-white/80 font-medium">
                                        {currentTrip.joined_count}/
                                        {currentTrip.capacity} telah bergabung
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
                            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                                Tentang {currentTrip.title}
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-neutral-700 font-medium mb-5 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                                <FaRegCalendarAlt className="text-neutral-500 text-lg" />
                                <span>
                                    Trip akan berlangsung dari{" "}
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
                                    <div
                                        key={idx}
                                        className="flex gap-4 md:gap-6 relative group"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 z-10 text-sm mt-1 transition-colors duration-300 bg-neutral-200 text-neutral-600 group-hover:bg-primary-600 group-hover:text-white">
                                                {item.step}
                                            </div>
                                            {idx !==
                                                currentTrip.itinerary.length -
                                                    1 && (
                                                <div className="w-0.5 h-full bg-neutral-200 mt-2 mb-1 rounded-full group-hover:bg-primary-300 transition-colors duration-300" />
                                            )}
                                        </div>
                                        <div className="pb-10 w-full">
                                            <h3 className="text-[17px] font-bold text-neutral-900 mb-1.5 group-hover:text-primary-700 transition-colors">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3 font-medium">
                                                <FaRegClock />
                                                <span>{item.time}</span>
                                            </div>
                                            <p className="text-neutral-600 text-[15px] leading-relaxed mb-4 whitespace-pre-line">
                                                {item.desc}
                                            </p>
                                            {item.images &&
                                                item.images.length > 0 && (
                                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                        {item.images.map(
                                                            (img, imgIdx) => (
                                                                <img
                                                                    key={imgIdx}
                                                                    src={img}
                                                                    alt={`Step ${item.step}`}
                                                                    className="w-40 md:w-48 h-28 object-cover rounded-xl border border-neutral-200 shrink-0 hover:border-primary-400 transition-all"
                                                                    onError={(
                                                                        e,
                                                                    ) => {
                                                                        e.target.src =
                                                                            "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop";
                                                                    }}
                                                                />
                                                            ),
                                                        )}
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
                        {/* MAP CARD */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
                            <div className="mb-3">
                                <h3 className="text-[15px] font-bold text-neutral-900">
                                    Lokasi Trip
                                </h3>

                                <p className="text-xs text-neutral-500">
                                    {mapQuery}
                                </p>
                            </div>

                            <LocationMap
                                query={mapQuery}
                                label={mapLabel}
                                height={280}
                                zoom={12}
                            />
                        </div>

                        {/* Host Card */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img
                                    src={
                                        currentTrip.host.avatar ||
                                        "https://i.pravatar.cc/150?u=kingsman"
                                    }
                                    className="w-12 h-12 rounded-full border border-neutral-200 object-cover"
                                    alt={currentTrip.host.name}
                                />
                                <div>
                                    <p className="text-[11px] text-neutral-500 font-medium mb-0.5">
                                        {currentTrip.host.label}
                                    </p>
                                    <h4 className="font-bold text-neutral-900 leading-tight mb-0.5">
                                        {currentTrip.host.name}
                                    </h4>
                                    <div className="text-xs font-medium">
                                        <span className="text-orange-500">
                                            {currentTrip.host.role}
                                        </span>
                                        <span className="text-neutral-400 mx-1">
                                            •
                                        </span>
                                        <span className="text-neutral-500">
                                            {currentTrip.host.badge}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={handleOpenChat} className="w-10 h-10 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors shadow-sm">
                                <BsChatText className="text-lg" />
                            </button>
                        </div>

                        {/* Pricing Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200">
                            <h3 className="text-[17px] font-bold text-neutral-900 mb-2">
                                Total Harga
                            </h3>
                            <div className="flex items-end gap-1 mb-6">
                                <span className="text-3xl font-bold text-primary-600">
                                    Rp{" "}
                                    {currentTrip.price.toLocaleString("id-ID")}
                                </span>
                                <span className="text-sm text-neutral-500 mb-1">
                                    / orang
                                </span>
                            </div>

                            <div className="space-y-4 mb-6">
                                {currentTrip.facilities &&
                                currentTrip.facilities.length > 0 ? (
                                    currentTrip.facilities.map(
                                        (facility, index) => {
                                            const IconComponent = getIcon(
                                                facility.icon,
                                            );

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-3 text-sm text-neutral-700 font-medium"
                                                >
                                                    <IconComponent className="text-neutral-500 text-lg shrink-0" />
                                                    {facility.name}
                                                </div>
                                            );
                                        },
                                    )
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 text-sm text-neutral-700 font-medium">
                                            <FaCarSide className="text-neutral-500 text-lg shrink-0" />
                                            Perjalanan bandara
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-neutral-700 font-medium">
                                            <FaBed className="text-neutral-500 text-lg shrink-0" />
                                            Hotel Bawangan
                                        </div>

                                        <div className="flex items-center gap-3 text-sm text-neutral-700 font-medium">
                                            <FaUtensils className="text-neutral-500 text-lg shrink-0" />
                                            Sarapan setiap hari dan makan malam
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="bg-orange-50 border border-orange-200/60 rounded-xl p-4 flex items-start gap-3">
                                <IoMdInformationCircleOutline className="text-orange-600 text-xl shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800 leading-relaxed font-medium">
                                    Dapat dikembalikan sepenuhnya (refund) jika
                                    dibatalkan 7 hari sebelum keberangkatan.
                                    Tidak termasuk tiket pesawat.
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
                        <p className="text-sm text-neutral-500 mb-0.5 font-medium">
                            Pesan perjalanan anda sekarang
                        </p>
                        <h3 className="text-lg font-bold text-neutral-900">
                            {currentTrip.title}
                        </h3>
                    </div>
                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-5 md:gap-8">
                        <div className="text-right">
                            <p className="text-[13px] text-neutral-500 mb-0.5 font-medium">
                                Mulai dari
                            </p>
                            <p className="text-xl font-bold text-neutral-900">
                                Rp {currentTrip.price.toLocaleString("id-ID")}{" "}
                                <span className="text-sm font-medium text-neutral-500">
                                    / orang
                                </span>
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
                                Booking Sekarang{" "}
                                <FaArrowRight className="text-sm" />
                            </Button>
                            <button className="w-11 h-11 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-500 hover:text-red-500 hover:border-red-500 hover:bg-red-50 transition-colors bg-white shrink-0">
                                <FaRegHeart className="text-[17px]" />
                            </button>
                        </div>
                    </div>
                </Container>
            </div>
        </div>
    );
}

Detail.layout = (page) => <MainLayout children={page} />;