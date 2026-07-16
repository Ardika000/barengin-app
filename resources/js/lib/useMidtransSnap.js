import { useEffect, useState } from "react";

// Client key sandbox yang sama dengan yang dipakai TripBareng/Checkout.
// snap.js mengunci client key dari pemuatan PERTAMA di sebuah tab, jadi nilai
// fallback di sini harus persis sama dengan halaman checkout — kalau berbeda,
// popup pembayaran yang dibuka setelahnya akan memakai key yang salah.
const FALLBACK_CLIENT_KEY = "Mid-client-mGla22pQRRj2Oeks";
const SNAP_SRC = "https://app.sandbox.midtrans.com/snap/snap.js";

/** Muat snap.js sekali per halaman; mengembalikan true bila window.snap siap. */
export function useMidtransSnap(clientKey) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (window.snap) {
            setReady(true);
            return;
        }

        const existing = document.querySelector('script[src*="midtrans.com/snap/snap.js"]');
        if (existing) {
            existing.addEventListener("load", () => setReady(true));
            if (window.snap) setReady(true);
            return;
        }

        const script = document.createElement("script");
        script.src = SNAP_SRC;
        script.setAttribute("data-client-key", clientKey || FALLBACK_CLIENT_KEY);
        script.onload = () => setReady(true);
        script.onerror = () => setReady(false);
        document.body.appendChild(script);
    }, [clientKey]);

    return ready;
}
