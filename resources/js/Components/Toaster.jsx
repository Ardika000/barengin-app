import { useEffect, useState } from "react";
import { subscribe, dismissToast } from "@/lib/toast";
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiXCircle, FiX } from "react-icons/fi";

const VARIANTS = {
    success: { Icon: FiCheckCircle, badge: "bg-success-100", iconColor: "text-success-600" },
    error: { Icon: FiXCircle, badge: "bg-danger-100", iconColor: "text-danger-600" },
    warning: { Icon: FiAlertTriangle, badge: "bg-warning-100", iconColor: "text-warning-600" },
    info: { Icon: FiInfo, badge: "bg-primary-100", iconColor: "text-primary-600" },
};

export default function Toaster() {
    const [items, setItems] = useState([]);

    useEffect(() => subscribe(setItems), []);

    if (items.length === 0) return null;

    return (
        <div className="fixed top-20 inset-x-3 sm:inset-x-auto sm:right-5 z-[10000] flex flex-col items-center sm:items-end gap-2.5 font-poppins pointer-events-none">
            {items.map((t) => {
                const v = VARIANTS[t.type] || VARIANTS.info;
                const { Icon } = v;
                return (
                    <div
                        key={t.id}
                        className="pointer-events-auto flex items-start gap-3 w-full sm:w-[360px] max-w-[420px] bg-white rounded-2xl shadow-[0_4px_16px_-4px_rgba(0,0,0,0.15)] ring-1 ring-neutral-200/70 p-3 animate-toast-in"
                    >
                        <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${v.badge}`}
                        >
                            <Icon className={v.iconColor} size={18} />
                        </span>
                        <p className="flex-1 min-w-0 self-center text-sm text-neutral-700 leading-snug break-words">
                            {t.message}
                        </p>
                        <button
                            type="button"
                            onClick={() => dismissToast(t.id)}
                            className="shrink-0 -mr-0.5 -mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                            aria-label="Tutup notifikasi"
                        >
                            <FiX size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
