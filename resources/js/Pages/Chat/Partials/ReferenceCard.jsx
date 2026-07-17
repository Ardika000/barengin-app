import React from "react";
import { Link } from "@inertiajs/react";
import { FiX, FiMapPin } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

// Kartu konteks Trip / Pergi Bareng / Jastip. Dua mode:
// - onDismiss diberikan → kartu tersemat di komposer (bisa ditutup, tidak nge-link).
// - tanpa onDismiss → kartu di dalam gelembung pesan (bisa diklik ke detail).
const TYPE_LABEL_KEYS = {
    trip: "chat.ref.trip",
    pergi_bareng: "chat.ref.pergi_bareng",
    jastip: "chat.ref.jastip",
};

export default function ReferenceCard({ reference, onDismiss = null, className = "" }) {
    const { t } = useTranslation();
    if (!reference) return null;

    const labelKey = TYPE_LABEL_KEYS[reference.type];
    const typeLabel = labelKey ? t(labelKey) : "";

    const body = (
        <div
            className={[
                "flex items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-2.5",
                onDismiss ? "" : "transition hover:bg-primary-50",
                className,
            ].join(" ")}
        >
            {reference.image_url ? (
                <img
                    src={reference.image_url}
                    alt={reference.title}
                    className="h-11 w-11 shrink-0 rounded-lg border border-primary-100 object-cover"
                    onError={(e) => { e.target.src = "/assets/default-image.png"; }}
                />
            ) : null}
            <div className="min-w-0 flex-1">
                {typeLabel ? (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                        {typeLabel}
                    </p>
                ) : null}
                <p className="truncate text-sm font-semibold text-neutral-800">
                    {reference.title}
                </p>
                {reference.subtitle ? (
                    <p className="flex items-center gap-1 truncate text-xs text-neutral-500">
                        <FiMapPin className="shrink-0" /> {reference.subtitle}
                    </p>
                ) : null}
            </div>
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                    aria-label={t("common.cancel")}
                >
                    <FiX className="h-4 w-4" />
                </button>
            ) : null}
        </div>
    );

    // Di dalam gelembung: kartu bisa diklik menuju halaman detail.
    if (!onDismiss && reference.url) {
        return (
            <Link href={reference.url} className="block">
                {body}
            </Link>
        );
    }

    return body;
}
