import React from "react";
import { Link } from "@inertiajs/react";
import { FiMapPin, FiNavigation } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

/**
 * Kartu "pantau perjalanan" di dalam gelembung chat grup pergi bareng.
 *
 * Dibagikan otomatis oleh penyelenggara saat perjalanan berlangsung. Tombolnya
 * membawa siapa pun anggota grup ke peta live (lokasi live tiap anggota, titik
 * kumpul, dan titik tujuan). Kartu ini hanya "pintu" — data live-nya dimuat di
 * halaman peta, jadi kartu tidak butuh status dari server.
 */
export default function TrackJourneyCard({ reference }) {
    const { t } = useTranslation();
    const trackUrl = reference?.url || `/pergi-bareng/${reference?.id}/track`;

    return (
        <div className="w-full min-w-[240px] overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-3">
            <div className="flex items-start gap-2">
                <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
                    <FiMapPin className="relative h-4 w-4 text-primary-700" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                        {t("track.card_label", "Pantau Perjalanan")}
                    </p>
                    <p className="truncate text-sm font-semibold text-neutral-800">
                        {reference?.title}
                    </p>
                    {reference?.subtitle ? (
                        <p className="truncate text-xs text-neutral-500">
                            {reference.subtitle}
                        </p>
                    ) : null}
                </div>
            </div>

            <p className="mt-2 text-xs text-neutral-600">
                {t(
                    "track.card_hint",
                    "Lihat posisi live rombongan, titik kumpul, dan tujuan di peta.",
                )}
            </p>

            <Link
                href={trackUrl}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-800"
            >
                <FiNavigation className="h-3.5 w-3.5" />
                {t("track.open_map", "Pantau Perjalanan")}
            </Link>
        </div>
    );
}
