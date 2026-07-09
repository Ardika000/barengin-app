import React from "react";
import { FiEdit2, FiTrash2, FiUploadCloud, FiUsers } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

const STATUS_STYLE = {
    published: "bg-primary-700 text-white",
    draft: "bg-neutral-800 text-white",
    sold_out: "bg-red-600 text-white",
};

const FALLBACK_IMG = "/assets/default-image.png";

// Kartu produk jastip. `manage` menampilkan aksi (edit/publish/hapus) saat hover.
export default function JastipProductCard({ item, manage = false, onEdit, onPublish, onDelete, onGroupChat }) {
    const { t } = useTranslation();

    const pct = item.max_slot > 0 ? Math.min(100, (item.sold / item.max_slot) * 100) : 0;
    const statusCls = STATUS_STYLE[item.status] || STATUS_STYLE.draft;
    const catLabel = item.category || "";

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md">
            {/* Gambar + badge status */}
            <div className="relative h-40 shrink-0 bg-neutral-100">
                <img
                    src={item.image || FALLBACK_IMG}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.src = FALLBACK_IMG; }}
                />
                <span className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${statusCls}`}>
                    {t(`jastip.status.${item.status}`, item.status)}
                </span>

                {manage && (
                    <div className="absolute left-2.5 top-2.5 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                        {/* #14: produk yang sudah dipublish tidak dapat diedit lagi */}
                        {item.is_draft && (
                            <button
                                type="button"
                                onClick={onEdit}
                                title={t("jastip.action_edit")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-amber-600 shadow-sm hover:bg-white"
                            >
                                <FiEdit2 size={15} />
                            </button>
                        )}
                        {item.is_draft && (
                            <button
                                type="button"
                                onClick={onPublish}
                                title={t("jastip.action_publish")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-primary-700 shadow-sm hover:bg-white"
                            >
                                <FiUploadCloud size={15} />
                            </button>
                        )}
                        {/* #15: chat grup dengan semua pembeli produk ini (hanya setelah publish) */}
                        {!item.is_draft && onGroupChat && (
                            <button
                                type="button"
                                onClick={onGroupChat}
                                title={t("jastip.action_group_chat")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-primary-700 shadow-sm hover:bg-white"
                            >
                                <FiUsers size={15} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onDelete}
                            title={t("jastip.action_delete")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-red-500 shadow-sm hover:bg-white"
                        >
                            <FiTrash2 size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Konten */}
            <div className="flex flex-1 flex-col p-4">
                <h3 className="truncate font-bold text-neutral-700">{item.name}</h3>
                <p className="mb-3 truncate text-xs text-neutral-500">{catLabel}</p>

                <div className="mt-auto">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-neutral-500">{t("jastip.progress")}</span>
                        <span className="font-semibold text-primary-700">
                            {item.sold}/{item.max_slot} {t("jastip.sold")}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                        <div
                            className="h-full rounded-full bg-primary-700"
                            style={{ width: `${pct}%`, transition: "width 500ms ease" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
