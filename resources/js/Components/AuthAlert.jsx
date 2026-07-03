import { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiXCircle, FiX } from "react-icons/fi";

const VARIANTS = {
    success: { Icon: FiCheckCircle, box: "bg-green-50 border-green-200 text-green-700", icon: "text-green-500" },
    error: { Icon: FiXCircle, box: "bg-red-50 border-red-200 text-red-700", icon: "text-red-500" },
    warning: { Icon: FiAlertCircle, box: "bg-amber-50 border-amber-200 text-amber-700", icon: "text-amber-500" },
    info: { Icon: FiInfo, box: "bg-blue-50 border-blue-200 text-primary-700", icon: "text-primary-500" },
};

// Alert box untuk halaman auth: menampilkan pesan flash Laravel di atas form.
// Dipakai sebagai pengganti toast (toast sulit terlihat pada layout dua kolom).
export default function AuthAlert({ className = "" }) {
    const { flash } = usePage().props;
    const message = flash?.message || null;
    const type = flash?.type || "info";

    const [dismissed, setDismissed] = useState(false);

    // Tampilkan lagi setiap kali muncul pesan flash baru
    useEffect(() => {
        setDismissed(false);
    }, [message, type]);

    if (!message || dismissed) return null;

    const v = VARIANTS[type] || VARIANTS.info;
    const { Icon } = v;

    return (
        <div
            role="alert"
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${v.box} ${className}`}
        >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${v.icon}`} />
            <span className="flex-1 leading-relaxed">{message}</span>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Tutup"
                className="-mr-1 -mt-0.5 rounded-md p-0.5 text-current/70 transition hover:bg-black/5"
            >
                <FiX className="h-4 w-4" />
            </button>
        </div>
    );
}
