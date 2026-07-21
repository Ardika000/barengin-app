import React from "react";
import { Link } from "@inertiajs/react";
import { FiMapPin, FiNavigation, FiCheckCircle } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

/**
 * Kartu "pantau" di dalam gelembung chat grup pergi bareng (`variant="pergi"`)
 * maupun grup jastip (`variant="jastip"`, menuju titik ambil barang).
 *
 * Dibagikan otomatis saat perjalanan memasuki jam keberangkatan. Tombolnya
 * membawa anggota grup ke peta live (posisi live, titik kumpul, titik tujuan).
 *
 * Isi `reference` beku sejak pesan dikirim, jadi status hidup/selesainya datang
 * terpisah lewat `state` ({ status }) yang disegarkan tiap poll - sama seperti
 * kartu tagihan patungan. Setelah perjalanan selesai kartunya menutup diri:
 * tombol diganti keterangan, dan halaman petanya juga dijaga di sisi server
 * supaya tautan lama tidak bisa dipakai lagi.
 */
export default function TrackJourneyCard({ reference, state, variant = "pergi" }) {
    const { t } = useTranslation();
    const isJastip = variant === "jastip";
    const trackUrl =
        reference?.url ||
        (isJastip
            ? `/jastip/${reference?.id}/track`
            : `/pergi-bareng/${reference?.id}/track`);

    // Teks per varian; kunci `track.*` lama tetap dipakai untuk pergi bareng.
    const copy = isJastip
        ? {
              label: t("track.jastip_card_label", "Ambil Barang"),
              hint: t(
                  "track.jastip_card_hint",
                  "Lihat rute ke titik ambil barang jastip di peta.",
              ),
              hintFinished: t(
                  "track.jastip_card_hint_finished",
                  "Masa pengambilan sudah lewat, peta ditutup.",
              ),
              open: t("track.jastip_open_map", "Pantau Pengambilan"),
              finished: t("track.jastip_finished", "Masa pengambilan telah berakhir"),
          }
        : {
              label: t("track.card_label", "Pantau Perjalanan"),
              hint: t(
                  "track.card_hint",
                  "Lihat posisi live rombongan, titik kumpul, dan tujuan di peta.",
              ),
              hintFinished: t(
                  "track.card_hint_finished",
                  "Peta live sudah ditutup untuk perjalanan ini.",
              ),
              open: t("track.open_map", "Pantau Perjalanan"),
              finished: t("track.finished", "Perjalanan telah selesai"),
          };

    // Tanpa state (mis. pesan lama yang belum ikut poll) kartu tetap berperilaku
    // seperti sebelumnya; server yang menolak kalau ternyata sudah selesai.
    const isFinished = state?.status === "finish";

    return (
        <div
            className={`w-[260px] max-w-full overflow-hidden rounded-xl border p-3 ${
                isFinished
                    ? "border-neutral-200 bg-neutral-50"
                    : "border-primary-200 bg-gradient-to-br from-primary-50 to-white"
            }`}
        >
            <div className="flex items-start gap-2">
                <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isFinished ? null : (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
                    )}
                    <FiMapPin
                        className={`relative h-4 w-4 ${
                            isFinished ? "text-neutral-400" : "text-primary-700"
                        }`}
                    />
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className={`text-[10px] font-bold uppercase tracking-wide ${
                            isFinished ? "text-neutral-500" : "text-primary-700"
                        }`}
                    >
                        {copy.label}
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

            <p className="mt-2 line-clamp-2 text-xs text-neutral-600">
                {isFinished ? copy.hintFinished : copy.hint}
            </p>

            {isFinished ? (
                <p className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600">
                    <FiCheckCircle className="h-3.5 w-3.5" />
                    {copy.finished}
                </p>
            ) : (
                <Link
                    href={trackUrl}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-800"
                >
                    <FiNavigation className="h-3.5 w-3.5" />
                    {copy.open}
                </Link>
            )}
        </div>
    );
}
