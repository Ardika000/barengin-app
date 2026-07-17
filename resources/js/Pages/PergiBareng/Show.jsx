import React, { useState, useEffect }from "react";
import { FaChevronLeft } from "react-icons/fa";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import StarRating from "@/Components/StarRating";
import { useTranslation } from "@/lib/useTranslation";
import { DEFAULT_IMAGE } from "@/lib/images";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {
    FaCalendarAlt, FaRegClock, FaUserFriends, FaCheckCircle,
    FaMapMarkerAlt, FaCar, FaInfoCircle, FaHeart, FaRegHeart,
    FaMinus, FaPlus, FaLock
} from "react-icons/fa";
import { BsChatDots, BsPeople } from "react-icons/bs";

const JAKARTA = [-6.1751, 106.8272];

// Pin berwarna (biru = titik kumpul, hijau = titik tujuan) agar konsisten
// dengan warna label di detail perjalanan.
const makePinIcon = (color) =>
    L.divIcon({
        className: "",
        html: `<svg width="26" height="34" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
            <circle cx="12" cy="12" r="4.5" fill="white"/>
        </svg>`,
        iconSize: [26, 34],
        iconAnchor: [13, 34],
        popupAnchor: [0, -30],
    });

const ORIGIN_ICON = makePinIcon("#0c8ce9"); // primary-600
const DEST_ICON = makePinIcon("#2fb248");   // success-600

// Menyesuaikan tampilan peta agar kedua titik terlihat (atau fokus ke satu
// titik bila hanya satu yang tersedia).
function MapView({ origin, destination }) {
    const map = useMap();
    useEffect(() => {
        if (origin && destination) {
            map.fitBounds([origin, destination], { padding: [28, 28], maxZoom: 15 });
        } else if (origin) {
            map.setView(origin, 14);
        } else if (destination) {
            map.setView(destination, 14);
        }
    }, [origin, destination, map]);
    return null;
}

export default function Show({ trip }) {
    const { auth } = usePage().props;
    const isLoggedIn = Boolean(auth?.user);
    const { t } = useTranslation();

    const [origin, setOrigin] = useState(null);          // titik kumpul
    const [destination, setDestination] = useState(null); // titik tujuan
    const [routeLine, setRouteLine] = useState(null);     // jalur antar titik
    const [isLiked, setIsLiked] = useState(Boolean(trip.liked));

    // ── Join state ──────────────────────────────────────────
    const remaining = Math.max(0, trip.remaining ?? (trip.capacity - trip.joined));
    const isFull = remaining < 1;
    const [seats, setSeats] = useState(1);
    const [joining, setJoining] = useState(false);

    const handleSeatChange = (type) => {
        setSeats((s) => {
            if (type === "minus") return Math.max(1, s - 1);
            return Math.min(remaining, s + 1);
        });
    };

    const handleJoin = () => {
        if (isFull || seats < 1) return;
        setJoining(true);
        router.post(
            `/pergi-bareng/${trip.id}/join`,
            { quantity: seats },
            { onFinish: () => setJoining(false) },
        );
    };

    const handleToggleLike = () => {
        setIsLiked((v) => !v);
        router.post(
            "/favorites/toggle",
            { type: "pergi_bareng", id: trip.id },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setIsLiked((v) => !v),
            },
        );
    };

    const [following, setFollowing] = useState(
        Boolean(trip.organizer?.is_following),
    );

    const handleToggleFollow = () => {
        if (!trip.organizer?.username) return;
        setFollowing((v) => !v);
        router.post(
            `/forum/users/${trip.organizer.username}/follow`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setFollowing((v) => !v),
            },
        );
    };

    // Status "diikuti" per peserta, di-key per username. Peserta multi-kursi
    // muncul beberapa baris, jadi state per-username menjaga semua barisnya tetap
    // selaras saat tombol Ikuti/Mengikuti ditekan.
    const [participantFollows, setParticipantFollows] = useState(() => {
        const map = {};
        for (const p of trip.participants ?? []) {
            if (p.username) map[p.username] = Boolean(p.is_following);
        }
        return map;
    });

    const toggleParticipantFollow = (username) => {
        if (!username) return;
        setParticipantFollows((m) => ({ ...m, [username]: !m[username] }));
        router.post(
            `/forum/users/${username}/follow`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onError: () =>
                    setParticipantFollows((m) => ({
                        ...m,
                        [username]: !m[username],
                    })),
            },
        );
    };

    useEffect(() => {
        const geocode = async (label) => {
            if (!label) return null;
            // Coba beberapa varian: bias ke Indonesia (countrycodes=id) pada
            // label mentah dulu — ini menemukan POI spesifik seperti "Bandung
            // Factory Outlet" maupun nama kota. Fallback: tambah ", Indonesia".
            const base = "https://nominatim.openstreetmap.org/search?format=json&limit=1";
            const urls = [
                `${base}&countrycodes=id&q=${encodeURIComponent(label)}`,
                `${base}&q=${encodeURIComponent(`${label}, Indonesia`)}`,
            ];
            for (const url of urls) {
                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data && data.length > 0) {
                        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                    }
                } catch (error) {
                    console.error("Gagal cari koordinat:", error);
                }
            }
            return null;
        };

        let cancelled = false;

        (async () => {
            const [o, d] = await Promise.all([
                geocode(trip?.details?.titik_kumpul),
                geocode(trip?.details?.titik_tujuan),
            ]);
            if (cancelled) return;

            setOrigin(o);
            setDestination(d);

            if (o && d) {
                // Coba ambil rute jalan sebenarnya (OSRM); fallback ke garis lurus
                try {
                    const res = await fetch(
                        `https://router.project-osrm.org/route/v1/driving/${o[1]},${o[0]};${d[1]},${d[0]}?overview=full&geometries=geojson`
                    );
                    const json = await res.json();
                    const coords = json?.routes?.[0]?.geometry?.coordinates?.map(
                        ([lng, lat]) => [lat, lng]
                    );
                    if (!cancelled) setRouteLine(coords?.length ? coords : [o, d]);
                } catch {
                    if (!cancelled) setRouteLine([o, d]);
                }
            } else if (!cancelled) {
                setRouteLine(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [trip?.details?.titik_kumpul, trip?.details?.titik_tujuan]);

    const handleChatOrganizer = () => {
        const otherUserId = trip?.organizer?.id;

        if (!otherUserId) {
            toast.error("ID penyelenggara belum tersedia.");
            return;
        }

        // Sertakan kartu referensi Pergi Bareng agar penyelenggara paham konteksnya.
        router.post("/chat/personal", {
            user_id: otherUserId,
            ref_type: "pergi_bareng",
            ref_id: trip.id,
        });
    };

    const handleOpenGroupChat = () => {
        router.post(`/chat/pergi-bareng/${trip.id}/group`);
    };

    return (
        <MainLayout>
            <Head title={`Detail Perjalanan - ${trip.title}`} />
            
            <div className="bg-white border-b border-neutral-200 py-4">
                <Container>
                    <button
                        type="button"
                        onClick={() => (window.history.length > 1 ? window.history.back() : router.visit("/pergi-bareng"))}
                        className="inline-flex items-center text-2xl font-bold text-neutral-700 hover:text-primary-700 mb-2 gap-3 transition"
                    >
                        <FaChevronLeft className="text-xl" /> {t("pb.show.back")}
                    </button>
                </Container>
            </div> 

            <Container className="py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Kiri: Detail Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Card Header dengan Gambar */}
                        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col md:flex-row">
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-neutral-700 mb-4">{trip.title}</h1>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 mb-6">
                                        <div className="flex items-center gap-1.5"><FaCalendarAlt className="text-primary-600"/> {trip.date}</div>
                                        <div className="flex items-center gap-1.5"><FaRegClock className="text-primary-600"/> {trip.time}</div>
                                        <div className="flex items-center gap-1.5"><FaUserFriends className="text-primary-600"/> {trip.joined}/{trip.capacity} {t("pb.show.seats_filled")}</div>
                                    </div>
                                </div>
                                
                                {/* Organizer Info */}
                                <div className="flex items-center gap-4">
                                    <img src={trip.organizer.avatar} alt={trip.organizer.name} className="w-12 h-12 rounded-full object-cover border border-neutral-200" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1 font-semibold text-neutral-700">
                                            {trip.organizer.name} {trip.organizer.verified && <FaCheckCircle className="text-primary-500 text-sm"/>}
                                        </div>
                                        <StarRating
                                            rating={trip.organizer.rating}
                                            reviews={trip.organizer.reviews}
                                            withReviewsLabel
                                            className="text-xs"
                                        />
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {trip.organizer?.is_self ? (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                                                {t("pb.show.created_by_you")}
                                            </span>
                                        ) : (
                                            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleChatOrganizer}>
                                                <BsChatDots className="text-sm" />
                                                {t("pb.show.chat_organizer")}
                                            </Button>
                                        )}
                                        {/* Grup chat perjalanan — hanya untuk anggota / penyelenggara */}
                                        {(trip.is_participant || trip.organizer?.is_self) && (
                                            <button
                                                type="button"
                                                onClick={handleOpenGroupChat}
                                                title={t("pb.show.group_chat")}
                                                aria-label={t("pb.show.group_chat")}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary-700 text-primary-700 transition hover:bg-primary-50"
                                            >
                                                <BsPeople className="text-base" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Gambar Bus */}
                            <div className="relative w-full md:w-1/3 bg-neutral-100 min-h-[250px] md:min-h-[200px]">
                                <img
                                    src={
                                        !trip.img_name
                                            ? DEFAULT_IMAGE
                                            : trip.img_name.startsWith("/") || trip.img_name.startsWith("http")
                                                ? trip.img_name
                                                : `/storage/${trip.img_name}`
                                    }
                                    alt={trip.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.src = DEFAULT_IMAGE;
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleToggleLike}
                                    aria-pressed={isLiked}
                                    aria-label={isLiked ? "Batal sukai" : "Sukai"}
                                    className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow transition-transform hover:scale-105"
                                >
                                    {isLiked ? (
                                        <FaHeart className="h-5 w-5 text-red-500" />
                                    ) : (
                                        <FaRegHeart className="h-5 w-5 text-neutral-500" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Deskripsi */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-neutral-100 rounded-md"><FaInfoCircle className="text-neutral-600 text-sm"/></span>
                                {t("pb.show.description")}
                            </h3>
                            {trip.description && (
                                <p className="text-neutral-600 text-sm leading-relaxed mb-4">{trip.description}</p>
                            )}

                            <h4 className="font-semibold text-sm mb-2">{t("pb.show.trip_details")}</h4>
                            <ul className="space-y-3 mt-3">
                                <li className="flex items-start gap-3 text-sm">
                                    <FaMapMarkerAlt className="text-primary-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">{t("pb.show.pickup")}</span> {trip.details.titik_kumpul}</div>
                                </li>
                                <li className="flex items-start gap-3 text-sm">
                                    <FaMapMarkerAlt className="text-success-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">{t("pb.show.destination")}</span> {trip.details.titik_tujuan}</div>
                                </li>
                                <li className="flex items-start gap-3 text-sm">
                                    <FaCar className="text-primary-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">{t("pb.show.transport")}</span> {trip.details.transportasi}</div>
                                </li>
                                <li className="flex items-start gap-3 text-sm">
                                    <FaRegClock className="text-primary-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">{t("pb.show.meet_time")}</span> {trip.details.jam_kumpul}</div>
                                </li>
                            </ul>
                        </div>

                        {/* Teman Pergi Bareng */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <span className="p-1.5 bg-neutral-100 rounded-md"><FaUserFriends className="text-neutral-600 text-sm"/></span>
                                    Teman Pergi Bareng
                                </h3>
                                <span className="text-sm font-semibold">{trip.joined}/{trip.capacity} Orang</span>
                            </div>

                            <div className="space-y-3">
                                {/* Organizer */}
                                <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-xl bg-neutral-50">
                                    {trip.organizer.username ? (
                                        <Link
                                            href={`/forum/users/${trip.organizer.username}`}
                                            className="flex items-center gap-3 flex-1 min-w-0"
                                        >
                                            <img src={trip.organizer.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold flex items-center gap-1 truncate">{trip.organizer.name} <FaCheckCircle className="text-primary-500 text-xs shrink-0"/></p>
                                                <p className="text-xs text-neutral-500">{t("pb.show.organizer")}</p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <img src={trip.organizer.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold flex items-center gap-1 truncate">{trip.organizer.name} <FaCheckCircle className="text-primary-500 text-xs shrink-0"/></p>
                                                <p className="text-xs text-neutral-500">{t("pb.show.organizer")}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!trip.organizer?.is_self && (
                                        <Button
                                            size="xs"
                                            variant={following ? "outline" : "solid"}
                                            className="ml-2 shrink-0"
                                            onClick={handleToggleFollow}
                                        >
                                            {following ? t("lb.following") : t("lb.follow")}
                                        </Button>
                                    )}
                                </div>
                                
                                {/* Participants (sudah diperluas sesuai jumlah kursi yang dipesan) */}
                                {trip.participants.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition">
                                        {p.username ? (
                                            <Link
                                                href={`/forum/users/${p.username}`}
                                                className="flex items-center gap-3 flex-1 min-w-0"
                                            >
                                                <img src={p.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold flex items-center gap-1 truncate">{p.name} {p.verified && <FaCheckCircle className="text-primary-500 text-xs shrink-0"/>}</p>
                                                    <p className="text-xs text-neutral-500">{p.seat_label || t("pb.show.participant")}</p>
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <img src={p.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold flex items-center gap-1 truncate">{p.name} {p.verified && <FaCheckCircle className="text-primary-500 text-xs shrink-0"/>}</p>
                                                    <p className="text-xs text-neutral-500">{p.seat_label || t("pb.show.participant")}</p>
                                                </div>
                                            </div>
                                        )}
                                        {/* Tombol ikuti/mengikuti — tidak tampil untuk diri sendiri */}
                                        {p.username && !p.is_self && (
                                            <Button
                                                size="xs"
                                                variant={participantFollows[p.username] ? "outline" : "solid"}
                                                className="ml-2 shrink-0"
                                                onClick={() => toggleParticipantFollow(p.username)}
                                            >
                                                {participantFollows[p.username] ? t("lb.following") : t("lb.follow")}
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {/* Empty Seats */}
                                {[...Array(Math.max(0, trip.capacity - trip.joined))].map((_, i) => (
                                    <div key={`empty-${i}`} className="flex items-center gap-4 p-3 border border-dashed border-neutral-300 rounded-xl bg-neutral-50/50">
                                        <div className="w-10 h-10 rounded-full border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-sm font-medium">{trip.joined + i + 1}</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-neutral-600">Kursi Tersedia</p>
                                            <p className="text-xs text-neutral-400">Belum ada yang bergabung</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Kanan: Sidebar Aksi */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                                {/* Map */}
                                <div className="h-56 bg-neutral-200 relative z-0">
                                    <MapContainer
                                        center={origin || destination || JAKARTA}
                                        zoom={13}
                                        scrollWheelZoom={false}
                                        className="w-full h-full z-0"
                                    >
                                        <TileLayer
                                            attribution='© OpenStreetMap'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />

                                        {origin && (
                                            <Marker position={origin} icon={ORIGIN_ICON}>
                                                <Popup>
                                                    <b className="font-bold">{t("pb.show.pickup")}:</b> <br />
                                                    {trip?.details?.titik_kumpul || "Lokasi belum ditentukan"}
                                                </Popup>
                                            </Marker>
                                        )}

                                        {destination && (
                                            <Marker position={destination} icon={DEST_ICON}>
                                                <Popup>
                                                    <b className="font-bold">{t("pb.show.destination")}:</b> <br />
                                                    {trip?.details?.titik_tujuan || "Lokasi belum ditentukan"}
                                                </Popup>
                                            </Marker>
                                        )}

                                        {routeLine && (
                                            <Polyline
                                                positions={routeLine}
                                                pathOptions={{ color: "#0c8ce9", weight: 4, opacity: 0.75 }}
                                            />
                                        )}

                                        <MapView origin={origin} destination={destination} />
                                    </MapContainer>

                                    <Button
                                        size="sm"
                                        variant="solid"
                                        className="absolute bottom-3 right-3 z-[1000] bg-primary-600 text-white shadow-md hover:bg-primary-700"
                                        onClick={() => {
                                            const o = encodeURIComponent(trip?.details?.titik_kumpul || "");
                                            const d = encodeURIComponent(trip?.details?.titik_tujuan || "");
                                            const url = trip?.details?.titik_tujuan
                                                ? `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`
                                                : `https://www.google.com/maps/search/?api=1&query=${o}`;
                                            window.open(url, "_blank");
                                        }}
                                    >
                                        Buka di Google Maps
                                    </Button>
                                </div>
                                <div className="p-5">
                                    <h4 className="font-bold text-sm mb-3">{t("pb.show.estimate_title")}</h4>
                                    <div className="space-y-2 text-sm text-neutral-600 mb-4">
                                        {trip.financing_estimates?.length > 0 ? (
                                            <ul className="list-disc list-inside space-y-1">
                                            {trip.financing_estimates.map((item) => (
                                                <li key={item.id}>{item.name}</li>
                                            ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-neutral-400">Belum ada estimasi pembiayaan.</p>
                                        )}
                                    </div>
                                    <div className="bg-warning-50 text-warning-700 p-3 rounded-lg text-xs flex items-start gap-2 mb-4 border border-warning-100">
                                        <FaInfoCircle className="mt-0.5 shrink-0 flex-shrink-0" />
                                        <p>{t("pb.show.estimate_note")}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tombol Aksi / Join */}
                            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                                <p className="text-xs text-neutral-500 mb-1">{t("pb.show.join_now")}</p>
                                <p className="text-sm font-bold mb-4">{trip.title}</p>

                                {!isLoggedIn ? (
                                    <Button isButtonLink href="/login" type="primary" className="w-full justify-center gap-2">
                                        <FaLock className="text-xs" /> {t("pb.show.login_to_join")}
                                    </Button>
                                ) : trip.organizer?.is_self ? (
                                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-center text-sm text-neutral-600">
                                        {t("pb.show.you_organizer")}
                                    </div>
                                ) : trip.is_participant ? (
                                    <div className="bg-success-50 border border-success-100 rounded-xl p-3 text-center text-sm font-semibold text-success-700">
                                        {t("pb.show.already_joined")}
                                    </div>
                                ) : trip.has_requested ? (
                                    <div className="space-y-3">
                                        <div className="bg-warning-50 border border-warning-100 rounded-xl p-3 text-center text-sm font-semibold text-warning-700">
                                            {t("pb.show.request_pending")}
                                        </div>
                                        <Button isButtonLink href={`/pergi-bareng/${trip.id}/request-sent`} variant="outline" className="w-full justify-center">
                                            {t("pb.show.view_status")}
                                        </Button>
                                    </div>
                                ) : isFull ? (
                                    <Button type="neutral" disabled className="w-full justify-center opacity-60 cursor-not-allowed">
                                        {t("pb.show.full")}
                                    </Button>
                                ) : (
                                    <>
                                        {/* Counter kursi */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="font-bold text-neutral-700 text-sm">{t("pb.show.seat_count")}</p>
                                                <p className="text-xs text-neutral-500">{remaining} {t("pb.show.quota_left")}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSeatChange("minus")}
                                                    disabled={seats <= 1}
                                                    className="w-8 h-8 rounded-full border-2 border-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 transition"
                                                >
                                                    <FaMinus className="text-xs" />
                                                </button>
                                                <span className="font-bold text-lg w-4 text-center">{seats}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSeatChange("plus")}
                                                    disabled={seats >= remaining}
                                                    className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-sm hover:bg-primary-800 disabled:opacity-50 transition"
                                                >
                                                    <FaPlus className="text-xs" />
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            type="primary"
                                            className="w-full justify-center"
                                            onClick={handleJoin}
                                            disabled={joining}
                                        >
                                            {joining ? t("common.processing") : <>{t("pb.show.join_submit")} &rarr;</>}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </MainLayout>
    );
}
