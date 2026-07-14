import { FiAlertCircle } from "react-icons/fi";
import Button from "@/Components/Button";

// Varian ConfirmModal yang bisa memuat field input (children) di antara
// deskripsi dan bar aksi — dipakai mis. modal Re-trip (tanggal baru) dan
// modal Penawaran request jastip (harga + biaya). Gaya shell disamakan
// dengan ConfirmModal agar konsisten di semua halaman admin.
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
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
                {/* Sengaja bukan <form>: komponen Button memakai prop `type` untuk
                    warna sehingga tombol Batal ikut men-submit bila dibungkus form. */}
                <div className="p-6">
                    {/* Header: ikon + judul/deskripsi (rata kiri) */}
                    <div className="flex items-start gap-4">
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

                    {/* Field input */}
                    <div className="mt-5 space-y-4">{children}</div>

                    {/* Footer: bar aksi */}
                    <div className="flex items-center justify-end gap-3 mt-6 bg-neutral-50 -mx-6 -mb-6 p-4 border-t border-neutral-100">
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
        </div>
    );
}
