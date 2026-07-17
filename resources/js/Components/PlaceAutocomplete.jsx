import { useEffect, useRef, useState } from "react";
import Input from "@/Components/Input";

/**
 * Input lokasi dengan rekomendasi tempat (OpenStreetMap / Nominatim).
 * - prioritizeIndonesia: tampilkan hasil di Indonesia lebih dulu (untuk Trip).
 *
 * value/onChange bekerja dengan string nama tempat.
 */
export default function PlaceAutocomplete({
    label,
    value = "",
    onChange,
    placeholder,
    size = "md", // diteruskan ke <Input> (sm | md)
    leftIcon,
    rightAddon = null, // tombol opsional di kanan input (mis. "gunakan lokasi saya")
    prioritizeIndonesia = false,
    fullAddress = false, // true: pilih alamat lengkap (display_name), bukan hanya nama tempat
    countryCodes = "", // kode ISO alpha-2 (mis. "my") — batasi hasil hanya pada negara ini
    contextSuffix = "", // konteks lokasi (mis. "Denpasar, Bali") — dibiaskan ke kota/provinsi itu
}) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const wrapRef = useRef(null);
    const abortRef = useRef(null);
    const skipNextFetch = useRef(false);

    // Sinkron jika value dari luar berubah (mis. prefill filter)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
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

                // Bias pencarian ke kota/provinsi terpilih dengan menambah konteksnya
                // ke query (tanpa mengubah teks yang tampil di input).
                const searchQuery = contextSuffix ? `${q}, ${contextSuffix}` : q;

                const params = new URLSearchParams({
                    format: "jsonv2",
                    addressdetails: "1",
                    "accept-language": "id",
                    limit: "10",
                    q: searchQuery,
                });
                // Batasi hasil hanya pada negara terpilih (mis. kota di Malaysia saja).
                if (countryCodes) {
                    params.set("countrycodes", countryCodes);
                }

                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
                    { signal: abortRef.current.signal },
                );
                let data = await res.json();

                if (prioritizeIndonesia && Array.isArray(data)) {
                    data = [...data].sort((a, b) => {
                        const aId = a.address?.country_code === "id" ? 0 : 1;
                        const bId = b.address?.country_code === "id" ? 0 : 1;
                        return aId - bId;
                    });
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
    }, [query, prioritizeIndonesia, countryCodes, contextSuffix]);

    const handleSelect = (item) => {
        // fullAddress: pakai alamat lengkap (untuk kolom alamat spesifik),
        // selain itu cukup nama tempat singkat (untuk kolom kota/tujuan).
        const name = fullAddress
            ? item.display_name || item.name || query
            : item.name || item.display_name?.split(",")[0] || query;
        skipNextFetch.current = true;
        setQuery(name);
        onChange?.(name);
        setResults([]);
        setOpen(false);
    };

    return (
        <div className="relative" ref={wrapRef}>
            <Input
                label={label}
                placeholder={placeholder}
                size={size}
                leftIcon={leftIcon}
                rightAddon={rightAddon}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange?.(e.target.value);
                }}
                onFocus={() => results.length > 0 && setOpen(true)}
                autoComplete="off"
            />

            {open && (results.length > 0 || loading) && (
                <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                    {loading && results.length === 0 && (
                        <li className="px-4 py-2 text-sm text-neutral-400">
                            Mencari...
                        </li>
                    )}
                    {results.map((item) => (
                        <li key={item.place_id}>
                            <button
                                type="button"
                                onClick={() => handleSelect(item)}
                                className="block w-full px-4 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                            >
                                <span className="font-medium text-neutral-900">
                                    {item.name ||
                                        item.display_name?.split(",")[0]}
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
