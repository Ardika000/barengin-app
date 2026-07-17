import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import StarRating from "@/Components/StarRating";
import ConfirmModal from "@/Components/ConfirmModal";
import EmptyState from "@/Components/EmptyState";
import Pagination from "@/Components/Pagination";
import { useTranslation } from "@/lib/useTranslation";
import { useServerTable } from "@/lib/useServerTable";
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiUploadCloud, FiEye, FiAlertCircle, FiMapPin, FiRefreshCw, FiChevronDown, FiClock } from "react-icons/fi";
import { BsChatDots } from "react-icons/bs";
import OngoingSection from "@/Pages/Admin/Partials/OngoingSection";

const STATUS_STYLES = {
    draft: "bg-blue-100 text-blue-700",
    created: "bg-sky-100 text-sky-700",
    ongoing: "bg-orange-100 text-orange-700",
    done: "bg-green-100 text-green-700",
};

export default function Index({ trips = {}, ongoing = [], filters = {} }) {
    const { t: translate } = useTranslation();
    const rows = trips.data ?? [];
    const { values, set, goPage } = useServerTable("/admin/trip", {
        search: filters.search ?? "",
        sort: filters.sort ?? "latest",
    });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });
    const [publishModal, setPublishModal] = useState({ open: false, id: null, name: "" });
    const [expandedId, setExpandedId] = useState(null); // baris riwayat yang terbuka

    const confirmDelete = () => {
        router.delete(`/admin/trip/${deleteModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ open: false, id: null, name: "" }),
        });
    };
    const confirmPublish = () => {
        router.post(`/admin/trip/${publishModal.id}/publish`, {}, {
            preserveScroll: true,
            onSuccess: () => setPublishModal({ open: false, id: null, name: "" }),
        });
    };

    const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");

    // Buka grup chat trip (pemandu). Backend akan membuat/menyertakan grup lalu
    // mengalihkan ke halaman chat.
    const openGroupChat = (id) => router.post(`/chat/trip/${id}/group`);

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{translate("admin.trip.index_title")}</h1>
                <p className="text-neutral-500 text-sm">{translate("admin.trip.index_subtitle")}</p>
            </div>

            {/* Sedang berlangsung — pemandu bisa menyelesaikan lebih cepat */}
            <OngoingSection
                items={ongoing.map((o) => ({
                    id: o.id,
                    title: o.name,
                    subtitle: o.location,
                    image: o.image,
                    meta: o.period_label,
                }))}
                finishUrl={(id) => `/admin/trip/${id}/finish`}
                title={translate("admin.trip.ongoing_title")}
                emptyText={translate("admin.trip.ongoing_empty")}
                finishLabel={translate("admin.ongoing.finish")}
                confirmTitle={translate("admin.trip.finish_title")}
                confirmDescription={translate("admin.trip.finish_desc")}
                confirmLabel={translate("admin.ongoing.finish_confirm")}
            />

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <Head title="Manajemen Trip" />

            <ConfirmModal
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
                onConfirm={confirmDelete}
                icon={<FiAlertCircle size={26} />}
                iconClass="bg-red-100 text-red-500"
                title={translate("admin.trip.delete_title")}
                description={<>{translate("admin.trip.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.name}</span>{translate("admin.trip.delete_desc_suffix")}</>}
                confirmLabel={translate("admin.trip.delete_confirm")}
                confirmType="danger"
            />
            <ConfirmModal
                open={publishModal.open}
                onClose={() => setPublishModal({ open: false, id: null, name: "" })}
                onConfirm={confirmPublish}
                icon={<FiUploadCloud size={26} />}
                iconClass="bg-blue-100 text-primary-700"
                title={translate("admin.trip.publish_title")}
                description={<>{translate("admin.trip.publish_desc_prefix")} <span className="font-semibold text-neutral-700">{publishModal.name}</span> {translate("admin.trip.publish_desc_suffix")}</>}
                confirmLabel={translate("admin.trip.publish_confirm")}
                confirmType="primary"
            />

            {/* Toolbar */}
            <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type="text" placeholder={translate("admin.trip.search_ph")} value={values.search} onChange={(e) => set("search", e.target.value, { debounce: true })}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-400 focus:border-primary-700 outline-none text-sm transition-all" />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select value={values.sort} onChange={(e) => set("sort", e.target.value)}
                            className="appearance-none w-44 pl-4 pr-10 py-2.5 rounded-xl border border-neutral-400 bg-white text-sm focus:border-primary-700 outline-none cursor-pointer transition-all">
                            <option value="latest">{translate("admin.trip.sort_latest")}</option>
                            <option value="seats">{translate("admin.trip.sort_seats")}</option>
                            <option value="status">{translate("admin.trip.sort_status")}</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <Button isButtonLink href="/admin/trip/create" size="sm" className="gap-2 whitespace-nowrap">
                        {translate("admin.trip.create_btn")} <FiPlus />
                    </Button>
                </div>
            </div>

            {/* Tabel (struktur konsisten dengan halaman dashboard lain) */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                            <th className="py-3 px-5">{translate("admin.trip.col_trip")}</th>
                            <th className="py-3 px-5">{translate("admin.trip.col_location")}</th>
                            <th className="py-3 px-5">{translate("admin.trip.col_date")}</th>
                            <th className="py-3 px-5">{translate("admin.trip.col_price")}</th>
                            <th className="py-3 px-5">{translate("admin.trip.col_seats")}</th>
                            <th className="py-3 px-5">{translate("admin.trip.col_rating")}</th>
                            <th className="py-3 px-5">{translate("admin.trip.col_status")}</th>
                            <th className="py-3 px-5 text-center">{translate("admin.trip.col_action")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {rows.length > 0 ? (
                            rows.map((t) => (
                                <tr key={t.id} className="hover:bg-neutral-50/50 transition">
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <img src={t.image} alt={t.name} className="w-11 h-11 rounded-lg object-cover border border-neutral-200"
                                                onError={(e) => (e.target.src = "/assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg")} />
                                            <span className="font-semibold text-neutral-700 text-sm max-w-[180px] truncate">{t.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5 text-sm text-neutral-600 max-w-[160px]"><span className="line-clamp-2">{t.location}</span></td>
                                    <td className="py-3.5 px-5 text-sm text-neutral-700 whitespace-nowrap">{t.date_label}</td>
                                    <td className="py-3.5 px-5 text-sm font-semibold text-neutral-700 whitespace-nowrap">{rupiah(t.price)}</td>
                                    <td className="py-3.5 px-5 text-sm font-semibold text-primary-700 whitespace-nowrap">{t.joined}/{t.capacity}</td>
                                    <td className="py-3.5 px-5 text-sm whitespace-nowrap">
                                        {t.rating_avg != null ? (
                                            <StarRating
                                                rating={t.rating_avg}
                                                reviews={t.rating_count}
                                                className="text-sm"
                                            />
                                        ) : (
                                            <span className="text-xs text-neutral-400">—</span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[t.status] || "bg-neutral-100 text-neutral-600"}`}>
                                            {t.status_label}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center justify-center gap-2">
                                            {t.is_draft ? (
                                                <>
                                                    <Link href={`/admin/trip/${t.id}/edit`} title={translate("admin.trip.action_edit")}
                                                        className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors">
                                                        <FiEdit2 size={16} />
                                                    </Link>
                                                    <button onClick={() => setPublishModal({ open: true, id: t.id, name: t.name })} title={translate("admin.trip.action_publish")}
                                                        className="p-2 bg-blue-50 text-primary-700 hover:bg-blue-100 rounded-lg transition-colors">
                                                        <FiUploadCloud size={16} />
                                                    </button>
                                                    <button onClick={() => setDeleteModal({ open: true, id: t.id, name: t.name })} title={translate("admin.trip.action_delete")}
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </>
                                            ) : t.status !== "done" ? (
                                                <Link href={`/trip-bareng/${t.id}`} title={translate("admin.trip.action_view")}
                                                    className="p-2 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors">
                                                    <FiEye size={16} />
                                                </Link>
                                            ) : (
                                                <Link href={`/admin/trip/${t.id}/reopen`} title={translate("admin.trip.action_retrip")}
                                                    className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                                                    <FiRefreshCw size={16} />
                                                </Link>
                                            )}
                                            {/* Grup chat trip (pemandu ↔ peserta run aktif) */}
                                            {!t.is_draft && (
                                                <button onClick={() => openGroupChat(t.id)} title={translate("admin.trip.action_group_chat")}
                                                    className="p-2 bg-blue-50 text-primary-700 hover:bg-blue-100 rounded-lg transition-colors">
                                                    <BsChatDots size={16} />
                                                </button>
                                            )}
                                            {/* Riwayat run sebelumnya (hasil re-trip) */}
                                            {t.histories?.length > 0 && (
                                                <button
                                                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                                                    title={translate("admin.trip.history_title")}
                                                    className="p-2 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors"
                                                >
                                                    <FiChevronDown size={16} className={`transition-transform ${expandedId === t.id ? "rotate-180" : ""}`} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )).flatMap((row, i) => {
                                const t = rows[i];
                                if (expandedId !== t.id || !t.histories?.length) return [row];
                                return [
                                    row,
                                    <tr key={`${t.id}-history`} className="bg-neutral-50/70">
                                        <td colSpan="8" className="px-5 py-4">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
                                                <FiClock size={13} /> {translate("admin.trip.history_title")}
                                            </p>
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                                        <th className="py-1.5 pr-4">{translate("admin.trip.history_period")}</th>
                                                        <th className="py-1.5 pr-4">{translate("admin.trip.history_joined")}</th>
                                                        <th className="py-1.5 pr-4">{translate("admin.trip.history_revenue")}</th>
                                                        <th className="py-1.5">{translate("admin.trip.history_completed")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100">
                                                    {t.histories.map((h) => (
                                                        <tr key={h.id} className="text-sm text-neutral-600">
                                                            <td className="py-2 pr-4 whitespace-nowrap">{h.period_label}</td>
                                                            <td className="py-2 pr-4 font-semibold text-primary-700">{h.joined}</td>
                                                            <td className="py-2 pr-4 whitespace-nowrap">{rupiah(h.revenue)}</td>
                                                            <td className="py-2 whitespace-nowrap">{h.completed_label}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </td>
                                    </tr>,
                                ];
                            })
                        ) : (
                            <tr>
                                <td colSpan="8">
                                    <EmptyState icon={<FiMapPin size={30} />} title={translate("admin.trip.empty_title")} description={translate("admin.trip.empty_desc")} />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-50 p-4 border-t border-neutral-100">
                <span className="text-xs text-neutral-500 font-medium">
                    {translate("common.showing")} {trips.from ?? 0}–{trips.to ?? 0} {translate("common.of")} {trips.total ?? 0} {translate("common.data")}
                </span>
                {trips.last_page > 1 && (
                    <Pagination currentPage={trips.current_page} totalPages={trips.last_page} onPageChange={goPage} />
                )}
            </div>
        </div>
        </>
    );
}

Index.layout = (page) => (
    <AdminLayout title="Dasbor - Home">
        {page}
    </AdminLayout>
);
