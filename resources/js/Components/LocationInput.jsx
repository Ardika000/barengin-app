import { useEffect, useRef, useState } from "react";

/**
 * Input lokasi dengan rekomendasi tempat (OpenStreetMap / Nominatim).
 * Berbeda dari PlaceAutocomplete: tidak memakai komponen <Input>, melainkan
 * <input> biasa dengan `className` yang dilempar, agar konsisten dengan styling form sekitarnya.
 *
 * value/onChange bekerja dengan string nama tempat.
 */
export default function LocationInput({
    value = "",
    onChange,
    placeholder,
    className = "",
    prioritizeIndonesia = true,
    countryCodes = "", // kode ISO alpha-2 (mis. "id") - batasi hasil hanya pada negara ini
}) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const wrapRef = useRef(null);
    const abortRef = useRef(null);
    const skipNextFetch = useRef(false);

    // Sinkron jika value dari luar berubah
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced fetch ke Nominatim
    useEffect(() => {
        if (skipNextFetch.current) {
            skipNextFetch.current = false;
            return;
        }

        const q = query.trim();
        if (q.length < 3) {
            setResults([]);
            return;
        }

        const handle = setTimeout(async () => {
            try {
                if (abortRef.current) abortRef.current.abort();
                abortRef.current = new AbortController();
                setLoading(true);

                const params = new URLSearchParams({
                    format: "jsonv2",
                    addressdetails: "1",
                    "accept-language": "id",
                    limit: "10",
                    q,
                });
                // Batasi hasil hanya pada negara terpilih (mis. "id" = Indonesia).
                if (countryCodes) {
                    params.set("countrycodes", countryCodes);
                }

                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    { signal: abortRef.current.signal },
                );
                let data = await res.json();

                if (prioritizeIndonesia && Array.isArray(data)) {
                    data = [...data].sort(
                        (a, b) =>
                            (a.address?.country_code === "id" ? 0 : 1) -
                            (b.address?.country_code === "id" ? 0 : 1),
                    );
                }

                setResults(Array.isArray(data) ? data : []);
                setOpen(true);
            } catch (e) {
                if (e.name !== "AbortError") setResults([]);
            } finally {
                setLoading(false);
            }
        }, 350);

        return () => clearTimeout(handle);
    }, [query, prioritizeIndonesia, countryCodes]);

    const handleSelect = (item) => {
        // Pakai alamat lengkap (display_name), bukan hanya judulnya
        const full = item.display_name || item.name || query;
        skipNextFetch.current = true;
        setQuery(full);
        onChange?.(full);
        setResults([]);
        setOpen(false);
    };

    return (
        <div className="relative" ref={wrapRef}>
            <input
                type="text"
                value={query}
                placeholder={placeholder}
                autoComplete="off"
                className={className}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange?.(e.target.value);
                }}
                onFocus={() => results.length > 0 && setOpen(true)}
            />

            {open && (results.length > 0 || loading) && (
                <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                    {loading && results.length === 0 && (
                        <li className="px-4 py-2 text-sm text-neutral-400">Mencari...</li>
                    )}
                    {results.map((item) => (
                        <li key={item.place_id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(item)}
                                className="block w-full px-4 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                                <span className="font-medium text-neutral-700">
                                    {item.name || item.display_name?.split(",")[0]}
                                </span>
                                <span className="block truncate text-xs text-neutral-500">
                                    {item.display_name}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
