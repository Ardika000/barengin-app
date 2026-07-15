import React from "react";
import { FiEdit2, FiTrash2, FiUploadCloud, FiUsers, FiEye, FiRefreshCw, FiInbox } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

const STATUS_STYLE = {
    published: "bg-primary-700 text-white",
    draft: "bg-neutral-800 text-white",
    sold_out: "bg-red-600 text-white",
};

// Badge siklus hidup jastiper (draft/published/buy_time/finished)
const LIFECYCLE_STYLE = {
    draft: "bg-neutral-800 text-white",
    published: "bg-green-600 text-white",
    buy_time: "bg-amber-500 text-white",
    finished: "bg-primary-700 text-white",
};

const FALLBACK_IMG = "/assets/default-image.png";

// Kartu produk jastip. `manage` menampilkan aksi (edit/publish/hapus) saat hover.
export default function JastipProductCard({ item, manage = false, onEdit, onPublish, onDelete, onGroupChat, onViewDetail, onReopen, onToggleRequests }) {
    const { t } = useTranslation();

    const pct = item.max_slot > 0 ? Math.min(100, (item.sold / item.max_slot) * 100) : 0;
    const catLabel = item.category || "";

    // Badge: pakai status siklus hidup jastiper bila tersedia, jika tidak fallback ke status lama
    const lifecycle = item.jastiper_status;
    const badgeCls = lifecycle ? (LIFECYCLE_STYLE[lifecycle] || LIFECYCLE_STYLE.draft) : (STATUS_STYLE[item.status] || STATUS_STYLE.draft);
    const badgeLabel = lifecycle ? t(`jastip.jastiper_status.${lifecycle}`, lifecycle) : t(`jastip.status.${item.status}`, item.status);
    const isFinished = lifecycle === "finished";

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
                <span className={`absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${badgeCls}`}>
                    {badgeLabel}
                </span>

                {manage && (
                    // Selalu tampil (juga di mobile yang tidak bisa hover) agar aksi mudah dijangkau.
                    <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                        {/* Lihat detail produk (etalase publik) — draft belum punya halaman publik */}
                        {!item.is_draft && onViewDetail && (
                            <button
                                type="button"
                                onClick={onViewDetail}
                                title={t("jastip.action_view_detail")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-neutral-600 shadow-sm hover:bg-white"
                            >
                                <FiEye size={15} />
                            </button>
                        )}
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
                        {/* Buka/tutup penerimaan request titipan — hanya item aktif
                            (bukan draft, belum selesai). Jastip selesai/draft tak bisa terima request. */}
                        {!item.is_draft && !isFinished && onToggleRequests && (
                            <button
                                type="button"
                                onClick={onToggleRequests}
                                title={item.allow_requests ? t("jastip.action_requests_on") : t("jastip.action_requests_off")}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm ${
                                    item.allow_requests ? "bg-primary-700 text-white hover:bg-primary-600" : " hover:bg-white bg-white/95 text-neutral-500"
                                }`}
                            >
                                <FiInbox size={15} />
                            </button>
                        )}
                        {/* #11: buka ulang jastip yang sudah selesai menjadi draft baru */}
                        {isFinished && onReopen && (
                            <button
                                type="button"
                                onClick={onReopen}
                                title={t("jastip.action_reopen")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-green-600 shadow-sm hover:bg-white"
                            >
                                <FiRefreshCw size={15} />
                            </button>
                        )}
                        {/* Hapus diblokir mulai H-1 batas pemesanan (can_delete dari server) */}
                        {(item.can_delete ?? true) && (
                            <button
                                type="button"
                                onClick={onDelete}
                                title={t("jastip.action_delete")}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-red-500 shadow-sm hover:bg-white"
                            >
                                <FiTrash2 size={15} />
                            </button>
                        )}
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
