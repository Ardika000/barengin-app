import React, { useState } from "react";
import { router } from "@inertiajs/react";
import ConfirmModal from "@/Components/ConfirmModal";
import { DEFAULT_IMAGE } from "@/lib/images";
import { FiCheckCircle, FiNavigation } from "react-icons/fi";

/**
 * Seksi "Sedang Berlangsung" untuk dasbor Trip / Pergi Bareng.
 *
 * Penyelenggara boleh menyelesaikan lebih cepat dari jadwal, jadi tombol
 * "Selesaikan" ada di sini. Aksinya tidak bisa dibatalkan, karena itu selalu
 * lewat konfirmasi.
 *
 * `items`: [{ id, title, subtitle, image, meta }]
 * `finishUrl(id)`: endpoint POST untuk menyelesaikan.
 * `onTrack(id)` + `trackLabel` (opsional): bila diisi, tiap baris memunculkan
 * tombol "Pantau Perjalanan" dan tata letaknya jadi satu kolom (satu baris per
 * perjalanan) agar muat dua tombol. Trip tidak memakainya, jadi dasbornya utuh.
 */
export default function OngoingSection({
    items = [],
    finishUrl,
    title,
    emptyText,
    finishLabel,
    confirmTitle,
    confirmDescription,
    confirmLabel,
    onTrack,
    trackLabel,
}) {
    const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });
    const [busyId, setBusyId] = useState(null);
    const hasTrack = typeof onTrack === "function";

    // Tanpa item, seksi ini hanya menambah kebisingan di dasbor.
    if (!items.length) {
        if (!emptyText) return null;

        return (
            <div className="mb-6 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-neutral-400">{emptyText}</p>
            </div>
        );
    }

    const doFinish = () => {
        const id = confirm.id;
        setBusyId(id);
        router.post(
            finishUrl(id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusyId(null);
                    setConfirm({ open: false, id: null, name: "" });
                },
            },
        );
    };

    return (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <ConfirmModal
                open={confirm.open}
                onClose={() => setConfirm({ open: false, id: null, name: "" })}
                onConfirm={doFinish}
                title={confirmTitle}
                // Bukan aksi menghapus: jangan pakai gaya merah bawaan.
                confirmLabel={confirmLabel}
                confirmType="success"
                icon={<FiCheckCircle size={24} />}
                iconClass="bg-success-50 text-success-700"
                processing={busyId !== null}
                description={
                    <>
                        {confirmDescription}{" "}
                        <span className="font-semibold text-neutral-700">
                            {confirm.name}
                        </span>
                    </>
                }
            />

            <div className="mb-4 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-700 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-700" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary-700">
                    {title}
                </h2>
                <span className="rounded-full bg-primary-700 px-2 py-0.5 text-[11px] font-bold text-white">
                    {items.length}
                </span>
            </div>

            <div
                className={
                    hasTrack
                        ? "grid gap-3 grid-cols-1"
                        : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                }
            >
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                    >
                        <img
                            src={item.image}
                            alt={item.title}
                            className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                            onError={(e) => (e.target.src = DEFAULT_IMAGE)}
                        />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-neutral-700">
                                {item.title}
                            </p>
                            {item.subtitle ? (
                                <p className="truncate text-xs text-neutral-500">
                                    {item.subtitle}
                                </p>
                            ) : null}
                            {item.meta ? (
                                <p className="truncate text-xs text-neutral-400">
                                    {item.meta}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            {hasTrack ? (
                                <button
                                    type="button"
                                    onClick={() => onTrack(item.id)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-800"
                                >
                                    <FiNavigation size={14} />
                                    {trackLabel}
                                </button>
                            ) : null}

                            <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() =>
                                    setConfirm({
                                        open: true,
                                        id: item.id,
                                        name: item.title,
                                    })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-success-700 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                            >
                                <FiCheckCircle size={14} />
                                {finishLabel}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
