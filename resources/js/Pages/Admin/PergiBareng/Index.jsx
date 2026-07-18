import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import EmptyState from "@/Components/EmptyState";
import Pagination from "@/Components/Pagination";
import { useTranslation } from "@/lib/useTranslation";
import { useServerTable } from "@/lib/useServerTable";
import { DEFAULT_IMAGE } from "@/lib/images";
import { FiSearch, FiTrash2, FiPlus, FiUsers, FiRefreshCw, FiNavigation } from "react-icons/fi";
import { FaCarSide } from "react-icons/fa";
import { BsChatDots } from "react-icons/bs";
import { MdReceiptLong } from "react-icons/md";
import OngoingSection from "@/Pages/Admin/Partials/OngoingSection";
import SplitBillModal from "./Partials/SplitBillModal";

export default function Index({ trips = {}, ongoing = [], filters = {} }) {
    const { t: translate } = useTranslation();
    const rows = trips.data ?? [];
    const [billModal, setBillModal] = useState({ open: false, trip: null });
    const { values, set, goPage } = useServerTable("/admin/pergi-bareng", {
        search: filters.search ?? "",
        sort: filters.sort ?? "latest",
    });
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

    const openGroupChat = (id) => router.post(`/chat/pergi-bareng/${id}/group`);

    // Pantau perjalanan: bagikan kartu ke grup lalu buka peta live. Server yang
    // memvalidasi statusnya (harus "berlangsung") dan mengarahkan ke peta.
    const trackTrip = (id) => router.post(`/admin/pergi-bareng/${id}/track`);

    const confirmDelete = () => {
        router.delete(`/admin/pergi-bareng/${deleteModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ open: false, id: null, name: "" }),
        });
    };

    // Status selaras dengan Riwayat "Jalan Bareng" (JalanBarengCard)
    const STATUS_META = {
        waiting: { key: "ph.status_waiting", cls: "bg-amber-100 text-amber-700" },
        ongoing: { key: "ph.status_ongoing", cls: "bg-blue-100 text-primary-700" },
        finish: { key: "ph.status_finish", cls: "bg-success-50 text-success-700" },
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{translate("admin.pergi.index_title")}</h1>
                <p className="text-neutral-500 text-sm">{translate("admin.pergi.index_subtitle")}</p>
            </div>

            {/* Sedang berlangsung — penyelenggara bisa menyelesaikan lebih cepat */}
            <OngoingSection
                items={ongoing.map((o) => ({
                    id: o.id,
                    title: o.name,
                    subtitle: o.destination,
                    image: o.image,
                    meta: `${o.date_label} · ${o.time_label} · ${o.joined}/${o.capacity}`,
                }))}
                finishUrl={(id) => `/admin/pergi-bareng/${id}/finish`}
                title={translate("admin.pergi.ongoing_title")}
                emptyText={translate("admin.pergi.ongoing_empty")}
                finishLabel={translate("admin.ongoing.finish")}
                confirmTitle={translate("admin.pergi.finish_title")}
                confirmDescription={translate("admin.pergi.finish_desc")}
                confirmLabel={translate("admin.ongoing.finish_confirm")}
                onTrack={trackTrip}
                trackLabel={translate("admin.pergi.action_track")}
            />

            <SplitBillModal
                open={billModal.open}
                trip={billModal.trip}
                onClose={() => setBillModal({ open: false, trip: null })}
            />

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <Head title="Managemen Pergi Bareng" />

            {/* Modal hapus */}
            <ConfirmModal
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
                onConfirm={confirmDelete}
                title={translate("admin.pergi.delete_title")}
                description={<>{translate("admin.trip.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.name}</span>{translate("admin.trip.delete_desc_suffix")}</>}
            />

            {/* Toolbar */}
            <div className="p-4 sm:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder={translate("admin.pergi.search_ph")}
                            value={values.search}
                            onChange={(e) => set("search", e.target.value, { debounce: true })}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-400 focus:border-primary-700 outline-none text-sm transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={values.sort}
                                onChange={(e) => set("sort", e.target.value)}
                                className="appearance-none w-44 pl-4 pr-10 py-2.5 rounded-xl border border-neutral-400 bg-white text-sm focus:border-primary-700 outline-none cursor-pointer transition-all"
                            >
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

                        <Button isButtonLink href="/admin/pergi-bareng/create" size="sm" className="gap-2 whitespace-nowrap">
                            <FiPlus /> {translate("admin.pergi.add_btn")}
                        </Button>
                    </div>
                </div>

                {/* Tabel */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[820px]">
                        <thead>
                            <tr className="bg-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                <th className="py-3 px-5">{translate("admin.pergi.col_id")}</th>
                                <th className="py-3 px-5">{translate("admin.pergi.col_destination")}</th>
                                <th className="py-3 px-5">{translate("admin.pergi.col_departure")}</th>
                                <th className="py-3 px-5">{translate("admin.pergi.col_time")}</th>
                                <th className="py-3 px-5">{translate("admin.trip.col_seats")}</th>
                                <th className="py-3 px-5">{translate("admin.trip.col_status")}</th>
                                <th className="py-3 px-5 text-center">{translate("admin.trip.col_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {rows.length > 0 ? (
                                rows.map((t) => (
                                    <tr key={t.id} className="hover:bg-neutral-50/50 transition">
                                        <td className="py-3.5 px-5 text-sm font-medium text-neutral-500">{t.code}</td>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={t.image}
                                                    alt={t.name}
                                                    className="w-11 h-11 rounded-lg object-cover border border-neutral-200"
                                                    onError={(e) => (e.target.src = DEFAULT_IMAGE)}
                                                />
                                                <span className="font-semibold text-neutral-700 text-sm max-w-[220px] break-words">{t.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm text-neutral-600 max-w-[200px]">
                                            <span className="line-clamp-2">{t.departure}</span>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm text-neutral-700 whitespace-nowrap">
                                            <div className="font-medium">{t.date_label}</div>
                                            <div className="text-xs text-neutral-400">{t.time_label}</div>
                                        </td>
                                        <td className="py-3.5 px-5 text-sm font-semibold text-primary-700 whitespace-nowrap">
                                            {t.joined}/{t.capacity}
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_META[t.status]?.cls ?? "bg-neutral-100 text-neutral-600"}`}>
                                                {STATUS_META[t.status] ? translate(STATUS_META[t.status].key) : t.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link
                                                    href={`/admin/pergi-bareng/${t.id}/requests`}
                                                    className="relative p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                                    title={translate("admin.pergi.action_requests")}
                                                >
                                                    <FiUsers size={16} />
                                                    {t.pending_requests > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                                            {t.pending_requests}
                                                        </span>
                                                    )}
                                                </Link>
                                                {/* Pantau perjalanan — hanya saat berlangsung */}
                                                {t.status === "ongoing" && (
                                                    <button
                                                        onClick={() => trackTrip(t.id)}
                                                        className="p-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                                                        title={translate("admin.pergi.action_track")}
                                                    >
                                                        <FiNavigation size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openGroupChat(t.id)}
                                                    className="p-2 bg-blue-50 text-primary-700 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title={translate("admin.pergi.action_chat")}
                                                >
                                                    <BsChatDots size={16} />
                                                </button>
                                                {/* Bagi tagihan hanya masuk akal
                                                    setelah perjalanan selesai */}
                                                {t.status === "finish" && (
                                                    <button
                                                        onClick={() => setBillModal({ open: true, trip: t })}
                                                        disabled={t.has_split_bill}
                                                        className="p-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-50"
                                                        title={
                                                            t.has_split_bill
                                                                ? translate("admin.pergi.action_split_bill_done")
                                                                : translate("admin.pergi.action_split_bill")
                                                        }
                                                    >
                                                        <MdReceiptLong size={16} />
                                                    </button>
                                                )}
                                                {t.status === "finish" && (
                                                    <Link
                                                        href={`/admin/pergi-bareng/${t.id}/reopen`}
                                                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                        title={translate("admin.pergi.action_reopen")}
                                                    >
                                                        <FiRefreshCw size={16} />
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => setDeleteModal({ open: true, id: t.id, name: t.name })}
                                                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                    title={translate("admin.trip.action_delete")}
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState icon={<FaCarSide size={30} />} title={translate("admin.pergi.empty_title")} description={translate("admin.pergi.empty_desc")} />
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
