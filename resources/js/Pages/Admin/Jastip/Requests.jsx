import React, { useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import ConfirmModal from "@/Components/ConfirmModal";
import FormModal from "@/Components/FormModal";
import EmptyState from "@/Components/EmptyState";
import Pagination from "@/Components/Pagination";
import { useTranslation } from "@/lib/useTranslation";
import { FiInbox, FiAlertCircle, FiTag, FiX } from "react-icons/fi";
import { BsChatDots } from "react-icons/bs";

// Badge status request titipan
const REQUEST_STATUS_BADGE = {
    pending: "bg-amber-100 text-amber-700",
    quoted: "bg-blue-100 text-primary-700",
    paid: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
    cancelled: "bg-neutral-100 text-neutral-500",
};

// "Permintaan Titipan" - request barang di luar katalog yang masuk ke
// destinasi jastiper. Aksi: beri penawaran (harga + biaya) atau tolak.
export default function Requests({ requests = {}, item_options = [], filters = {} }) {
    const { t } = useTranslation();
    const rows = requests.data ?? [];

    const [quoteModal, setQuoteModal] = useState({ open: false, id: null, name: "" });
    const [rejectModal, setRejectModal] = useState({ open: false, id: null, name: "" });
    const quoteForm = useForm({ quoted_item_price: "", quoted_fee: "" });

    const applyFilter = (patch) => {
        const params = { status: filters.status ?? "all", item_id: filters.item_id ?? "", ...patch };
        Object.keys(params).forEach((k) => {
            if (params[k] === "" || params[k] == null || params[k] === "all") delete params[k];
        });
        router.get("/admin/jastip/requests", params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const openQuote = (req) => {
        quoteForm.reset();
        quoteForm.clearErrors();
        setQuoteModal({ open: true, id: req.id, name: req.item_name });
    };

    const submitQuote = () =>
        quoteForm.post(`/admin/jastip/requests/${quoteModal.id}/quote`, {
            preserveScroll: true,
            onSuccess: () => setQuoteModal({ open: false, id: null, name: "" }),
        });

    const confirmReject = () =>
        router.post(`/admin/jastip/requests/${rejectModal.id}/reject`, {}, {
            preserveScroll: true,
            onSuccess: () => setRejectModal({ open: false, id: null, name: "" }),
        });

    const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
    const selectClass =
        "appearance-none rounded-xl border border-neutral-400 bg-white py-2.5 pl-4 pr-9 text-sm outline-none transition-all focus:border-primary-700 cursor-pointer";

    return (
        <>
            <FormModal
                open={quoteModal.open}
                onClose={() => setQuoteModal({ open: false, id: null, name: "" })}
                onSubmit={submitQuote}
                processing={quoteForm.processing}
                size="lg"
                icon={<FiTag size={22} />}
                iconClass="bg-blue-100 text-primary-700"
                title={t("jastip.req.quote_title")}
                description={<>{t("jastip.req.quote_desc_prefix")} <span className="font-semibold text-neutral-700">{quoteModal.name}</span></>}
                confirmLabel={t("jastip.req.quote_btn")}
                confirmType="primary"
            >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-neutral-500">
                            {t("jastip.req.item_price_label")}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={quoteForm.data.quoted_item_price}
                            onChange={(e) => quoteForm.setData("quoted_item_price", e.target.value)}
                            placeholder="150000"
                            className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-700"
                        />
                        {quoteForm.errors.quoted_item_price && (
                            <p className="mt-1 text-xs text-danger-700">{quoteForm.errors.quoted_item_price}</p>
                        )}
                    </div>
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-neutral-500">
                            {t("jastip.req.fee_label")}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={quoteForm.data.quoted_fee}
                            onChange={(e) => quoteForm.setData("quoted_fee", e.target.value)}
                            placeholder="25000"
                            className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-700"
                        />
                        {quoteForm.errors.quoted_fee && (
                            <p className="mt-1 text-xs text-danger-700">{quoteForm.errors.quoted_fee}</p>
                        )}
                    </div>
                </div>
            </FormModal>

            <ConfirmModal
                open={rejectModal.open}
                onClose={() => setRejectModal({ open: false, id: null, name: "" })}
                onConfirm={confirmReject}
                icon={<FiAlertCircle size={26} />}
                iconClass="bg-red-100 text-red-500"
                title={t("jastip.req.reject_title")}
                description={<>{t("jastip.req.reject_desc_prefix")} <span className="font-semibold text-neutral-700">{rejectModal.name}</span>{t("jastip.req.reject_desc_suffix")}</>}
                confirmLabel={t("jastip.req.reject_btn")}
                confirmType="danger"
            />

            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-700">{t("jastip.req.title")}</h1>
                    <p className="text-sm text-neutral-500">{t("jastip.req.subtitle")}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={filters.item_id ?? ""}
                            onChange={(e) => applyFilter({ item_id: e.target.value })}
                            className={selectClass + " w-48"}
                        >
                            <option value="">{t("jastip.req.all_items")}</option>
                            {item_options.map((o) => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <select
                            value={filters.status ?? "all"}
                            onChange={(e) => applyFilter({ status: e.target.value })}
                            className={selectClass + " w-44"}
                        >
                            <option value="all">{t("jastip.filter_status_all")}</option>
                            {["pending", "quoted", "paid", "rejected", "cancelled"].map((s) => (
                                <option key={s} value={s}>{t(`jastip.request.status.${s}`)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse text-left">
                        <thead>
                            <tr className="bg-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-500">
                                <th className="px-5 py-3">{t("jastip.req.col_requester")}</th>
                                <th className="px-5 py-3">{t("jastip.req.col_item")}</th>
                                <th className="px-5 py-3">{t("jastip.req.col_destination")}</th>
                                <th className="px-5 py-3 text-center">{t("jastip.col_quantity")}</th>
                                <th className="px-5 py-3">{t("jastip.req.col_budget")}</th>
                                <th className="px-5 py-3">{t("jastip.col_status")}</th>
                                <th className="px-5 py-3 text-center">{t("admin.trip.col_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {rows.length > 0 ? (
                                rows.map((req) => (
                                    <tr key={req.id} className="transition hover:bg-neutral-50/50">
                                        <td className="px-5 py-3.5">
                                            {req.requester.username ? (
                                                <Link href={`/forum/users/${req.requester.username}`} className="group/buyer flex items-center gap-2.5">
                                                    <img
                                                        src={req.requester.avatar}
                                                        alt={req.requester.name}
                                                        className="h-8 w-8 rounded-full border border-neutral-200 object-cover"
                                                        onError={(e) => (e.target.src = "/assets/default-profile.png")}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-neutral-700 group-hover/buyer:text-primary-700 group-hover/buyer:underline">
                                                            {req.requester.name}
                                                        </div>
                                                        <div className="truncate text-xs text-neutral-400">@{req.requester.username}</div>
                                                    </div>
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-neutral-600">{req.requester.name}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                {req.image && (
                                                    <img src={req.image} alt={req.item_name} className="h-9 w-9 rounded-lg border border-neutral-200 object-cover" />
                                                )}
                                                <div className="min-w-0 max-w-[220px]">
                                                    <div className="truncate text-sm font-semibold text-neutral-700" title={req.item_name}>{req.item_name}</div>
                                                    {(req.description || req.note) && (
                                                        <div className="truncate text-xs text-neutral-400" title={req.description || req.note}>
                                                            {req.description || req.note}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-neutral-600 whitespace-nowrap">{req.destination}</td>
                                        <td className="px-5 py-3.5 text-center text-sm font-semibold tabular-nums text-neutral-700">{req.quantity}</td>
                                        <td className="px-5 py-3.5 text-sm text-neutral-700 whitespace-nowrap">
                                            {req.status === "pending"
                                                ? (req.budget != null ? rupiah(req.budget) : <span className="text-xs text-neutral-400">-</span>)
                                                : req.quoted_total != null
                                                    ? <span className="font-semibold">{rupiah(req.quoted_total)}</span>
                                                    : <span className="text-xs text-neutral-400">-</span>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${REQUEST_STATUS_BADGE[req.status] || "bg-neutral-100 text-neutral-500"}`}>
                                                {t(`jastip.request.status.${req.status}`, req.status)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-2">
                                                {req.status === "pending" && (
                                                    <button
                                                        onClick={() => openQuote(req)}
                                                        title={t("jastip.req.quote_btn")}
                                                        className="rounded-lg bg-blue-50 p-2 text-primary-700 transition-colors hover:bg-blue-100"
                                                    >
                                                        <FiTag size={16} />
                                                    </button>
                                                )}
                                                {["pending", "quoted"].includes(req.status) && (
                                                    <button
                                                        onClick={() => setRejectModal({ open: true, id: req.id, name: req.item_name })}
                                                        title={t("jastip.req.reject_btn")}
                                                        className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
                                                    >
                                                        <FiX size={16} />
                                                    </button>
                                                )}
                                                {req.requester.id && (
                                                    <button
                                                        onClick={() => router.post("/chat/personal", { user_id: req.requester.id })}
                                                        title={t("jastip.req.chat_btn")}
                                                        className="rounded-lg bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200"
                                                    >
                                                        <BsChatDots size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyState
                                            icon={<FiInbox size={30} />}
                                            title={t("jastip.req.empty_title")}
                                            description={t("jastip.req.empty_desc")}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 bg-neutral-50 p-4 md:flex-row">
                    <span className="text-xs font-medium text-neutral-500">
                        {t("common.showing")} {requests.from ?? 0}–{requests.to ?? 0} {t("common.of")} {requests.total ?? 0} {t("common.data")}
                    </span>
                    {requests.last_page > 1 && (
                        <Pagination
                            currentPage={requests.current_page}
                            totalPages={requests.last_page}
                            onPageChange={(p) => applyFilter({ page: p })}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

Requests.layout = (page) => (
    <AdminLayout title="Permintaan Titipan">
        <Head title="Permintaan Titipan" />
        {page}
    </AdminLayout>
);
