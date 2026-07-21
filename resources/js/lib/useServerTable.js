import { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";

/**
 * Pencarian / filter / pagination server-side yang KONSISTEN untuk semua tabel
 * dashboard admin. Semua nilai dikirim sebagai query param di URL (bisa di-share
 * & bertahan saat refresh), mengikuti pola halaman Pesan.
 *
 * - `set(key, value, { debounce })`  -> ubah filter (teks pakai debounce, select langsung). Reset ke halaman 1.
 * - `goPage(page)`                   -> pindah halaman (langsung).
 *
 * Nilai kosong ("" / null / "all") tidak dikirim agar URL tetap bersih.
 *
 * @param {string} baseUrl  Path halaman (default: pathname saat ini).
 * @param {object} initial  Nilai filter awal dari props server (mis. { search, sort }).
 * @param {object} opts     { debounceMs = 350, only } - `only` untuk partial reload Inertia.
 */
export function useServerTable(baseUrl, initial = {}, { debounceMs = 350, only } = {}) {
    const url = baseUrl || (typeof window !== "undefined" ? window.location.pathname : "/");
    const [values, setValues] = useState(initial);
    const valuesRef = useRef(initial);
    const timer = useRef(null);

    const go = (next) => {
        const params = {};
        Object.entries(next).forEach(([k, v]) => {
            if (v !== "" && v != null && v !== "all") params[k] = v;
        });
        router.get(url, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            ...(only ? { only } : {}),
        });
    };

    const set = (key, value, { debounce = false } = {}) => {
        const next = { ...valuesRef.current, [key]: value, page: 1 };
        valuesRef.current = next;
        setValues(next);
        clearTimeout(timer.current);
        if (debounce) timer.current = setTimeout(() => go(next), debounceMs);
        else go(next);
    };

    const goPage = (page) => {
        const next = { ...valuesRef.current, page };
        valuesRef.current = next;
        setValues(next);
        clearTimeout(timer.current);
        go(next);
    };

    useEffect(() => () => clearTimeout(timer.current), []);

    return { values, set, goPage };
}
