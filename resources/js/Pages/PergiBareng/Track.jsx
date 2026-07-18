import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, router } from "@inertiajs/react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
    FiArrowLeft,
    FiNavigation,
    FiCrosshair,
    FiMaximize,
    FiClock,
    FiMapPin,
    FiAlertCircle,
} from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

const JAKARTA = [-6.1751, 106.8272];

// Pin titik kumpul / tujuan — warna selaras dengan detail perjalanan.
const makePinIcon = (color) =>
    L.divIcon({
        className: "",
        html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
            <circle cx="12" cy="12" r="4.5" fill="white"/>
        </svg>`,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
        popupAnchor: [0, -34],
    });

const ORIGIN_ICON = makePinIcon("#0c8ce9"); // primary-600
const DEST_ICON = makePinIcon("#2fb248"); // success-600

// Titik "kamu di sini" yang berdenyut. Class Tailwind di-inline di html divIcon —
// Tailwind memindainya dari sumber ini, jadi kelasnya ikut ter-build.
const USER_ICON = L.divIcon({
    className: "",
    html: `<span class="relative flex h-4 w-4">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-70"></span>
        <span class="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-primary-600 shadow-md"></span>
    </span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

// Jarak garis-lurus (km) antar dua koordinat — untuk fallback & throttle.
function haversineKm([lat1, lon1], [lat2, lon2]) {
    const R = 6371;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Menangkap instance peta Leaflet untuk kontrol imperatif (fit/center). */
function MapBinder({ onReady }) {
    const map = useMap();
    useEffect(() => {
        onReady(map);
    }, [map, onReady]);
    return null;
}

export default function Track({ trip }) {
    const { t } = useTranslation();

    const [map, setMap] = useState(null);
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [userPos, setUserPos] = useState(null);
    const [geoError, setGeoError] = useState(null); // 'denied' | 'unavailable' | 'unsupported'
    const [route, setRoute] = useState(null); // { line, distanceKm, durationMin }

    const didInitialFit = useRef(false);
    const lastRoutedRef = useRef(null);
    const watchIdRef = useRef(null);

    // ── Geocode titik kumpul & tujuan (Nominatim, bias Indonesia) ──────────
    useEffect(() => {
        const geocode = async (label) => {
            if (!label) return null;
            const base =
                "https://nominatim.openstreetmap.org/search?format=json&limit=1";
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
                } catch {
                    /* coba varian berikutnya */
                }
            }
            return null;
        };

        let cancelled = false;
        (async () => {
            const [o, d] = await Promise.all([
                geocode(trip.departure_loc),
                geocode(trip.destination_loc),
            ]);
            if (cancelled) return;
            setOrigin(o);
            setDestination(d);
        })();
        return () => {
            cancelled = true;
        };
    }, [trip.departure_loc, trip.destination_loc]);

    // ── Lokasi live pengguna (GPS) ─────────────────────────────────────────
    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setGeoError("unsupported");
            return;
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setGeoError(null);
                setUserPos([pos.coords.latitude, pos.coords.longitude]);
            },
            (err) => {
                setGeoError(
                    err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
                );
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
        );
        return () => {
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // ── Rute + estimasi dari posisi live pengguna → tujuan ─────────────────
    // Dihitung ulang hanya bila pengguna bergeser > ~40 m agar OSRM tidak dibanjiri.
    useEffect(() => {
        if (!userPos || !destination) return;
        if (
            lastRoutedRef.current &&
            haversineKm(lastRoutedRef.current, userPos) < 0.04
        ) {
            return;
        }
        lastRoutedRef.current = userPos;

        let cancelled = false;
        (async () => {
            const straightKm = haversineKm(userPos, destination);
            try {
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`,
                );
                const json = await res.json();
                const r = json?.routes?.[0];
                if (!cancelled && r?.geometry?.coordinates?.length) {
                    setRoute({
                        line: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                        distanceKm: r.distance / 1000,
                        durationMin: r.duration / 60,
                    });
                    return;
                }
                throw new Error("no route");
            } catch {
                // Fallback: garis lurus + estimasi pada ~40 km/jam.
                if (!cancelled) {
                    setRoute({
                        line: [userPos, destination],
                        distanceKm: straightKm,
                        durationMin: (straightKm / 40) * 60,
                    });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [userPos, destination]);

    // ── Fit awal supaya semua titik terlihat (sekali saja) ─────────────────
    useEffect(() => {
        if (!map) return;
        const pts = [origin, destination, userPos].filter(Boolean);
        if (!pts.length || didInitialFit.current) return;
        if (pts.length === 1) map.setView(pts[0], 14);
        else map.fitBounds(pts, { padding: [60, 60], maxZoom: 15 });
        didInitialFit.current = true;
    }, [map, origin, destination, userPos]);

    const fitAll = () => {
        const pts = [origin, destination, userPos].filter(Boolean);
        if (map && pts.length) {
            if (pts.length === 1) map.setView(pts[0], 15);
            else map.fitBounds(pts, { padding: [60, 60], maxZoom: 16 });
        }
    };
    const centerMe = () => {
        if (map && userPos) map.setView(userPos, 16);
    };

    const goBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
        } else {
            router.visit("/chat");
        }
    };

    const arrived = route && route.distanceKm <= 0.05;

    const etaText = useMemo(() => {
        if (!route) return "—";
        const m = Math.round(route.durationMin);
        if (m < 1) return `< 1 ${t("track.minutes", "mnt")}`;
        if (m < 60) return `${m} ${t("track.minutes", "mnt")}`;
        return `${Math.floor(m / 60)} ${t("track.hours", "j")} ${m % 60} ${t("track.minutes", "mnt")}`;
    }, [route, t]);

    const distanceText = route ? `${route.distanceKm.toFixed(1)} km` : "—";

    return (
        <div className="relative h-screen w-full overflow-hidden bg-neutral-200">
            <Head title={`${t("track.page_title", "Pantau Perjalanan")} — ${trip.name}`} />

            <MapContainer
                center={origin || destination || JAKARTA}
                zoom={13}
                scrollWheelZoom
                zoomControl={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution="© OpenStreetMap"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {origin ? (
                    <Marker position={origin} icon={ORIGIN_ICON}>
                        <Popup>
                            <b>{t("track.origin", "Titik Kumpul")}</b>
                            <br />
                            {trip.departure_loc}
                        </Popup>
                    </Marker>
                ) : null}

                {destination ? (
                    <Marker position={destination} icon={DEST_ICON}>
                        <Popup>
                            <b>{t("track.destination", "Tujuan")}</b>
                            <br />
                            {trip.destination_loc}
                        </Popup>
                    </Marker>
                ) : null}

                {userPos ? (
                    <Marker position={userPos} icon={USER_ICON}>
                        <Popup>{t("track.you", "Lokasimu")}</Popup>
                    </Marker>
                ) : null}

                {route?.line ? (
                    <Polyline
                        positions={route.line}
                        pathOptions={{ color: "#0c8ce9", weight: 5, opacity: 0.8 }}
                    />
                ) : null}

                <MapBinder onReady={setMap} />
            </MapContainer>

            {/* ── Bar atas ─────────────────────────────────────────────── */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-4">
                <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur">
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
                        aria-label={t("track.back", "Kembali")}
                    >
                        <FiArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                            {t("track.page_title", "Pantau Perjalanan")}
                        </p>
                        <p className="truncate text-sm font-semibold text-neutral-800">
                            {trip.name}
                        </p>
                    </div>
                </div>

                {/* Peringatan izin lokasi / tujuan tidak ketemu */}
                {geoError ? (
                    <div className="pointer-events-auto mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 shadow">
                        <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            {geoError === "denied"
                                ? t(
                                      "track.geo_denied",
                                      "Akses lokasi ditolak. Aktifkan izin lokasi untuk melihat posisimu di peta.",
                                  )
                                : geoError === "unsupported"
                                  ? t("track.geo_unsupported", "Perangkat tidak mendukung lokasi.")
                                  : t("track.geo_unavailable", "Lokasi tidak tersedia saat ini.")}
                        </span>
                    </div>
                ) : null}

                {destination === null && origin === null ? null : destination ===
                  null ? (
                    <div className="pointer-events-auto mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 shadow">
                        <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{t("track.dest_missing", "Lokasi tujuan tidak ditemukan di peta.")}</span>
                    </div>
                ) : null}
            </div>

            {/* ── Tombol peta mengambang ───────────────────────────────── */}
            <div className="absolute right-3 top-24 z-[1000] flex flex-col gap-2 sm:right-4">
                <button
                    type="button"
                    onClick={centerMe}
                    disabled={!userPos}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary-700 shadow-lg transition hover:bg-primary-50 disabled:opacity-40"
                    title={t("track.recenter_me", "Ke lokasiku")}
                >
                    <FiCrosshair className="h-5 w-5" />
                </button>
                <button
                    type="button"
                    onClick={fitAll}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-700 shadow-lg transition hover:bg-neutral-100"
                    title={t("track.fit_all", "Tampilkan semua")}
                >
                    <FiMaximize className="h-5 w-5" />
                </button>
            </div>

            {/* ── Panel estimasi bawah ─────────────────────────────────── */}
            <div className="absolute inset-x-0 bottom-0 z-[1000] p-3 sm:p-4">
                <div className="mx-auto max-w-md rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
                    {arrived ? (
                        <p className="text-center text-sm font-semibold text-success-700">
                            {t("track.arrived", "Kamu sudah sampai di tujuan 🎉")}
                        </p>
                    ) : (
                        <>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                                {t("track.remaining", "Sisa perjalanan ke tujuan")}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2.5">
                                    <FiNavigation className="h-5 w-5 shrink-0 text-primary-700" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-medium text-neutral-500">
                                            {t("track.distance", "Jarak")}
                                        </p>
                                        <p className="truncate text-base font-bold text-neutral-800">
                                            {distanceText}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl bg-success-50 px-3 py-2.5">
                                    <FiClock className="h-5 w-5 shrink-0 text-success-700" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-medium text-neutral-500">
                                            {t("track.eta", "Estimasi waktu")}
                                        </p>
                                        <p className="truncate text-base font-bold text-neutral-800">
                                            {etaText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Legenda titik */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
                        <span className="inline-flex items-center gap-1.5">
                            <FiMapPin className="h-3.5 w-3.5 text-primary-600" />
                            {t("track.origin", "Titik Kumpul")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <FiMapPin className="h-3.5 w-3.5 text-success-600" />
                            {t("track.destination", "Tujuan")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full border border-white bg-primary-600 ring-1 ring-primary-300" />
                            {userPos
                                ? t("track.you", "Lokasimu")
                                : t("track.locating", "Mencari lokasimu…")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
