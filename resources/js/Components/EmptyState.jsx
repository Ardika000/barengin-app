import React from "react";
import { FiInbox } from "react-icons/fi";

// Tampilan "kosong / tidak ditemukan" yang konsisten di semua halaman dashboard.
// icon: ReactNode (opsional) - default ikon inbox. title & description string.
export default function EmptyState({
    icon = <FiInbox size={32} />,
    title,
    description,
    className = "",
}) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 text-neutral-400 ${className}`}>
            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4 text-neutral-300">
                {icon}
            </div>
            {title && <h3 className="text-neutral-600 font-semibold mb-1">{title}</h3>}
            {description && (
                <p className="text-sm text-center max-w-sm leading-relaxed">{description}</p>
            )}
        </div>
    );
}
