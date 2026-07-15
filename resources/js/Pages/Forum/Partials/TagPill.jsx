import React from "react";
import { FiX } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

// `active`     : tag ini sedang menjadi filter aktif → di-highlight.
// `isClearAll` : pil khusus "semua" yang berfungsi sebagai penghapus filter.
export default function TagPill({
    tag,
    onClick,
    fontSize = "sm",
    onRemove,
    cursor,
    active = false,
    isClearAll = false,
}) {
    const { t } = useTranslation();

    const tone = active
        ? "bg-primary-700 text-white"
        : isClearAll
          ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition"
          : "bg-neutral-100 text-neutral-800 " +
            (onRemove ? "" : "hover:bg-neutral-200 transition");

    const label = isClearAll ? t("forum.filter.all") : tag;

    return (
        <div
            role="button"
            onClick={onClick}
            className={[
                "inline-flex items-center gap-2",
                "rounded-lg px-2.5 py-1.5",
                `text-${fontSize} font-medium`,
                "whitespace-nowrap",
                tone,
                cursor == "pointer" && "cursor-pointer",
            ].join(" ")}
        >
            {isClearAll ? (
                // X hanya muncul saat ada filter yang bisa dihapus (belum aktif).
                !active ? <FiX className="text-neutral-500" /> : null
            ) : (
                <span className={active ? "text-white/80" : "text-neutral-500"}>#</span>
            )}
            <span className="truncate">{label}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-neutral-500 hover:text-red-500"
                >
                    <FiX />
                </button>
            )}
        </div>
    );
}
