import { FiAlertCircle } from "react-icons/fi";

// Dialog konfirmasi standar (hapus/publish/dll) — dipakai konsisten di semua
// halaman admin. Tanpa blur backdrop, ukuran & gaya seragam.
export default function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Ya, Hapus",
    cancelLabel = "Batal",
    icon = <FiAlertCircle size={26} />,
    iconClass = "bg-red-100 text-red-500",
    confirmClass = "bg-red-600 hover:bg-red-700",
    processing = false,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
                <div className="p-6 text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${iconClass}`}>
                        {icon}
                    </div>
                    <h3 className="text-lg font-bold text-neutral-700 mb-1.5">{title}</h3>
                    <p className="text-neutral-500 text-sm mb-6 leading-relaxed">{description}</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-semibold hover:bg-neutral-50 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={processing}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${confirmClass}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
