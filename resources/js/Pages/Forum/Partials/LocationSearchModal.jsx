import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiSearch, FiTarget } from "react-icons/fi";

export default function LocationSearchModal({ onBack, onSelectLocation }) {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [items, setItems] = useState([]);
    const abortRef = useRef(null);

    useEffect(() => {
        return () => {
            try {
                abortRef.current?.abort();
            } catch {}
        };
    }, []);

    useEffect(() => {
        const qq = (q ?? "").trim();

        setLoading(true);

        const t = setTimeout(
            async () => {
                try {
                    abortRef.current?.abort();
                    abortRef.current = new AbortController();

                    const res = await fetch(
                        `/forum/locations/search?q=${encodeURIComponent(qq)}`,
                        {
                            headers: { Accept: "application/json" },
                            signal: abortRef.current.signal,
                        },
                    );

                    const json = await res.json();
                    setItems(Array.isArray(json?.data) ? json.data : []);
                } catch (e) {
                    if (e?.name === "AbortError") return;
                    setItems([]);
                } finally {
                    setLoading(false);
                }
            },
            qq.length >= 2 ? 350 : 0,
        );

        return () => clearTimeout(t);
    }, [q]);

    const viewItems = useMemo(() => items ?? [], [items]);

    const handlePickCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported on this device/browser.");
            return;
        }

        setGeoLoading(true);

        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 60000,
                });
            });

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            const res = await fetch(
                `/forum/locations/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
                { headers: { Accept: "application/json" } },
            );

            const json = await res.json();
            const place = json?.data;

            if (!place?.id) {
                alert("Failed to detect current location.");
                return;
            }

            onSelectLocation?.(place);
        } catch {
            alert(
                "Cannot access your location. Please allow location permission.",
            );
        } finally {
            setGeoLoading(false);
        }
    };

    const showingPopular = (q ?? "").trim().length < 2;

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-200 shrink-0">
                <button
                    type="button"
                    onClick={onBack}
                    className="h-9 w-9 rounded-lg hover:bg-neutral-100 inline-flex items-center justify-center"
                    aria-label="Back"
                >
                    <FiArrowLeft />
                </button>

                <div className="flex-1 text-center font-semibold">
                    Search Location
                </div>

                <div className="w-9" />
            </div>

            {/* search box */}
            <div className="px-6 py-4 border-b border-neutral-100 shrink-0">
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                    <FiSearch className="text-neutral-500" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="w-full outline-none text-sm"
                        placeholder="Cari Lokasi..."
                    />

                    <button
                        type="button"
                        className="h-9 w-9 rounded-lg hover:bg-neutral-100 inline-flex items-center justify-center disabled:opacity-50"
                        aria-label="Use current location"
                        onClick={handlePickCurrentLocation}
                        disabled={geoLoading}
                        title="Use current location"
                    >
                        <FiTarget />
                    </button>
                </div>

                {geoLoading ? (
                    <div className="mt-2 text-xs text-neutral-500">
                        Detecting current location...
                    </div>
                ) : null}
            </div>

            <div className="px-6 py-5 flex-1 min-h-0 max-h-[320px] overflow-y-auto">
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-sm text-neutral-500 px-1 py-2">
                            {showingPopular
                                ? "Loading popular locations..."
                                : "Searching..."}
                        </div>
                    ) : null}

                    {!loading && showingPopular && viewItems.length ? (
                        <div className="text-xs text-neutral-500 px-1 pb-2">
                            Popular locations
                        </div>
                    ) : null}

                    {!loading && viewItems.length === 0 ? (
                        <div className="text-sm text-neutral-500 px-1 py-2">
                            {showingPopular
                                ? "No popular locations yet."
                                : "No locations found."}
                        </div>
                    ) : null}

                    {viewItems.map((x) => {
                        const count = Number(x.posts_count);
                        const showCount = Number.isFinite(count) && count > 0;

                        return (
                            <button
                                key={x.id}
                                type="button"
                                onClick={() => onSelectLocation?.(x)}
                                className="w-full text-left rounded-xl px-3 py-3 hover:bg-neutral-50 border border-neutral-100"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-neutral-900 truncate">
                                            {x.name || x.display_name}
                                        </div>
                                        <div className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                                            {x.display_name}
                                        </div>
                                    </div>

                                    {showCount ? (
                                        <div className="shrink-0 text-xs text-neutral-500">
                                            {count}+ Post
                                        </div>
                                    ) : null}
                                </div>

                                <div className="text-[11px] text-neutral-400 mt-1">
                                    {x.address?.city
                                        ? `${x.address.city} • `
                                        : ""}
                                    {x.address?.country ?? ""}{" "}
                                    {typeof x.lat === "number" &&
                                    typeof x.lng === "number"
                                        ? `• ${x.lat.toFixed(4)}, ${x.lng.toFixed(4)}`
                                        : ""}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
