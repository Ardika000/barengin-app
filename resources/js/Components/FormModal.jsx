import { useEffect } from "react";
import { createPortal } from "react-dom";
import { FiAlertCircle } from "react-icons/fi";
import Button from "@/Components/Button";

// Varian ConfirmModal yang bisa memuat field input (children) di antara
// deskripsi dan bar aksi - dipakai mis. modal Re-trip (tanggal baru) dan
// modal Penawaran request jastip (harga + biaya). Gaya shell disamakan
// dengan ConfirmModal agar konsisten di semua halaman admin.
const SIZE_MAP = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
};

export default function FormModal({
    open,
    onClose,
    onSubmit,
    title,
    description,
    children,
    confirmLabel = "Simpan",
    cancelLabel = "Batal",
    icon = <FiAlertCircle size={24} />,
    iconClass = "bg-blue-100 text-primary-700",
    confirmType = "primary", // primary | danger | success | warning | neutral
    processing = false,
    size = "sm", // sm | md | lg - lebar shell modal
}) {
    // Esc menutup modal - pasangan alami dari klik di luar. Hook harus berada di
    // atas early return supaya urutannya tidak berubah antar render.
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const overlay = (
        <div
            // Klik di area gelap menutup modal; klik di dalam panel tidak, karena
            // handler-nya dipasang di overlay dan panel menghentikan propagasi.
            onClick={onClose}
            role="presentation"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/40 p-4"
        >
            {/* Sengaja bukan <form>: komponen Button memakai prop `type` untuk
                warna sehingga tombol Batal ikut men-submit bila dibungkus form.
                Struktur header/body/footer: body bisa di-scroll bila field panjang
                sehingga modal tidak pernah melebihi tinggi layar. */}
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in-up ${SIZE_MAP[size] ?? SIZE_MAP.sm}`}
            >
                {/* Header: ikon + judul/deskripsi (rata kiri) */}
                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                        {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-neutral-700 mb-1">{title}</h3>
                        {description && (
                            <p className="text-neutral-500 text-sm leading-relaxed">{description}</p>
                        )}
                    </div>
                </div>

                {/* Field input - area yang bisa di-scroll */}
                {children && (
                    <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-2">{children}</div>
                )}

                {/* Footer: bar aksi */}
                <div className="flex items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50 p-4">
                    <Button
                        type="neutral"
                        variant="outline"
                        size="sm"
                        rounded={false}
                        onClick={onClose}
                        className="rounded-xl font-semibold"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type={confirmType}
                        size="sm"
                        rounded={false}
                        onClick={onSubmit}
                        disabled={processing}
                        className="rounded-xl font-semibold shadow-sm disabled:opacity-60"
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );

    // Di-portal ke <body>: modal ini dipakai di dalam kartu/sidebar yang
    // ber-position sticky, dan sticky selalu membuat stacking context baru -
    // sehingga z-index setinggi apa pun tetap terkurung di bawah navbar.
    return createPortal(overlay, document.body);
}
