import React, { useEffect, useState, useRef } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import Pagination from "@/Components/Pagination";
import JastipProductCard from "@/Components/JastipProductCard";
import EmptyState from "@/Components/EmptyState";
import { useTranslation } from "@/lib/useTranslation";
import { FiSearch, FiPlus, FiShoppingCart, FiAlertCircle, FiUploadCloud, FiRefreshCw } from "react-icons/fi";

const STATUS_BADGE = {
    paid: "bg-blue-100 text-primary-700",
    pending: "bg-amber-100 text-amber-700",
    unpaid: "bg-neutral-100 text-neutral-500",
    refunded: "bg-red-100 text-red-600",
};

// Badge status siklus hidup jastip (jastiper): draft/published/buy_time/pickup_time/finished
const JASTIPER_STATUS_BADGE = {
    draft: "bg-neutral-100 text-neutral-600",
    published: "bg-green-100 text-green-700",
    buy_time: "bg-amber-100 text-amber-700",
    pickup_time: "bg-purple-100 text-purple-700",
    finished: "bg-blue-100 text-primary-700",
};

export default function Index({ items = {}, orders = {}, filters = {} }) {
    const { t } = useTranslation();
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });
    const [publishModal, setPublishModal] = useState({ open: false, id: null, name: "" });
    const [reopenModal, setReopenModal] = useState({ open: false, id: null, name: "" });

    const pagedRows = items.data ?? [];
    const orderRows = orders?.data ?? [];
    const isLastItemsPage = (items.current_page ?? 1) >= (items.last_page ?? 1);

    // Pencarian/sort/pagination produk + pencarian/pagination pesanan - semuanya
    // server-side dengan URL params, mengelola kedua tabel dalam satu tempat.
    const paramsRef = useRef({
        search: filters.search ?? "",
        sort: filters.sort ?? "latest",
        status: filters.status ?? "all",
        page: undefined,
        orders_search: filters.orders_search ?? "",
        orders_page: undefined,
    });
    const [ui, setUi] = useState({
        search: filters.search ?? "",
        sort: filters.sort ?? "latest",
        status: filters.status ?? "all",
        orders_search: filters.orders_search ?? "",
    });
    const timer = useRef(null);

    const go = () => {
        const p = paramsRef.current;
        const out = {};
        if (p.search) out.search = p.search;
        if (p.sort && p.sort !== "latest") out.sort = p.sort;
        if (p.status && p.status !== "all") out.status = p.status;
        if (p.page && p.page > 1) out.page = p.page;
        if (p.orders_search) out.orders_search = p.orders_search;
        if (p.orders_page && p.orders_page > 1) out.orders_page = p.orders_page;
        router.get("/admin/jastip", out, { preserveState: true, preserveScroll: true, replace: true });
    };

    const update = (patch, { debounce = false, resetPage = false, resetOrdersPage = false } = {}) => {
        paramsRef.current = { ...paramsRef.current, ...patch };
        if (resetPage) paramsRef.current.page = 1;
        if (resetOrdersPage) paramsRef.current.orders_page = 1;
        setUi((u) => ({ ...u, ...patch }));
        clearTimeout(timer.current);
        if (debounce) timer.current = setTimeout(go, 350);
        else go();
    };

    useEffect(() => () => clearTimeout(timer.current), []);

    const confirmDelete = () =>
        router.delete(`/admin/jastip/${deleteModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ open: false, id: null, name: "" }),
        });

    const confirmPublish = () =>
        router.post(`/admin/jastip/${publishModal.id}/publish`, {}, {
            preserveScroll: true,
            onSuccess: () => setPublishModal({ open: false, id: null, name: "" }),
        });

    const confirmReopen = () =>
        router.post(`/admin/jastip/${reopenModal.id}/reopen`, {}, {
            preserveScroll: true,
            onSuccess: () => setReopenModal({ open: false, id: null, name: "" }),
        });

    return (
        <>
            <ConfirmModal
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
                onConfirm={confirmDelete}
                icon={<FiAlertCircle size={26} />}
                iconClass="bg-red-100 text-red-500"
                title={t("jastip.delete_title")}
                description={
                    <>
                        {t("jastip.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.name}</span>{t("jastip.delete_desc_suffix")}
                    </>
                }
                confirmLabel={t("jastip.delete_confirm")}
                confirmType="danger"
            />
            <ConfirmModal
                open={publishModal.open}
                onClose={() => setPublishModal({ open: false, id: null, name: "" })}
                onConfirm={confirmPublish}
                icon={<FiUploadCloud size={26} />}
                iconClass="bg-blue-100 text-primary-700"
                title={t("jastip.publish_title")}
                description={<>{t("jastip.publish_desc_prefix")} <span className="font-semibold text-neutral-700">{publishModal.name}</span> {t("jastip.publish_desc_suffix")}</>}
                confirmLabel={t("jastip.publish_confirm")}
                confirmType="primary"
            />
            <ConfirmModal
                open={reopenModal.open}
                onClose={() => setReopenModal({ open: false, id: null, name: "" })}
                onConfirm={confirmReopen}
                icon={<FiRefreshCw size={24} />}
                iconClass="bg-green-100 text-green-600"
                title={t("jastip.reopen_title")}
                description={<>{t("jastip.reopen_desc_prefix")} <span className="font-semibold text-neutral-700">{reopenModal.name}</span>{t("jastip.reopen_desc_suffix")}</>}
                confirmLabel={t("jastip.reopen_confirm")}
                confirmType="primary"
            />

            {/* List Product */}
            <div className="mb-2">
                <h1 className="text-2xl font-bold text-neutral-700">{t("jastip.list_title")}</h1>
            </div>

            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        placeholder={t("jastip.search_ph")}
                        value={ui.search}
                        onChange={(e) => update({ search: e.target.value }, { debounce: true, resetPage: true })}
                        className="w-full rounded-xl border border-neutral-400 py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary-700"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative min-w-0 flex-1 sm:flex-none">
                        <select
                            value={ui.sort}
                            onChange={(e) => update({ sort: e.target.value }, { resetPage: true })}
                            className="w-full sm:w-44 appearance-none rounded-xl border border-neutral-400 bg-white py-2.5 pl-4 pr-10 text-sm outline-none transition-all focus:border-primary-700 cursor-pointer"
                        >
                            <option value="latest">{t("jastip.sort_latest")}</option>
                            <option value="best">{t("jastip.sort_best")}</option>
                            <option value="stock">{t("jastip.sort_stock")}</option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <Button isButtonLink href="/admin/jastip/create" size="sm" className="gap-2 whitespace-nowrap">
                        <FiPlus /> {t("jastip.add_btn")}
                    </Button>
                </div>
            </div>

            {/* Filter status jastip (draft/published/buy_time/finished) */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                {[
                    { value: "all", label: t("jastip.filter_status_all") },
                    { value: "draft", label: t("jastip.jastiper_status.draft") },
                    { value: "published", label: t("jastip.jastiper_status.published") },
                    { value: "buy_time", label: t("jastip.jastiper_status.buy_time") },
                    { value: "pickup_time", label: t("jastip.jastiper_status.pickup_time") },
                    { value: "finished", label: t("jastip.jastiper_status.finished") },
                ].map((opt) => {
                    const active = ui.status === opt.value;
                    const activeClass =
                        opt.value === "all"
                            ? "bg-primary-700 text-white border-primary-700"
                            : `${JASTIPER_STATUS_BADGE[opt.value]} border-current`;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => update({ status: opt.value }, { resetPage: true })}
                            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                                active
                                    ? activeClass
                                    : "border-neutral-300 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pagedRows.map((item) => (
                    <JastipProductCard
                        key={item.id}
                        item={item}
                        manage
                        onViewDetail={() => router.visit(`/jastip/${item.id}`)}
                        onEdit={() => router.visit(`/admin/jastip/${item.id}/edit`)}
                        onPublish={() => setPublishModal({ open: true, id: item.id, name: item.name })}
                        onGroupChat={() => router.post(`/chat/jastip/${item.id}/group`)}
                        onTrack={() => router.post(`/admin/jastip/${item.id}/track`)}
                        onReopen={() => setReopenModal({ open: true, id: item.id, name: item.name })}
                        onToggleRequests={() => router.post(`/admin/jastip/${item.id}/toggle-requests`, {}, { preserveScroll: true })}
                        onDelete={() => setDeleteModal({ open: true, id: item.id, name: item.name })}
                    />
                ))}

                {/* Kartu tambah - hanya di halaman terakhir agar tetap di ujung daftar */}
                {isLastItemsPage && (
                    <Link
                        href="/admin/jastip/create"
                        className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-700 hover:text-primary-700"
                    >
                        <FiShoppingCart size={30} />
                        <span className="text-sm font-semibold">{t("jastip.add_btn")}</span>
                    </Link>
                )}
            </div>

            {items.last_page > 1 && (
                <Pagination
                    className="mt-8"
                    currentPage={items.current_page}
                    totalPages={items.last_page}
                    onPageChange={(p) => update({ page: p })}
                />
            )}

            {/* Aktivitas Penjualan */}
            <div id="sales-activity" className="mt-10 scroll-mt-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-bold text-neutral-700">{t("jastip.sales_activity")}</h2>
                    <div className="relative w-full sm:max-w-xs">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder={t("jastip.sales_search_ph")}
                            value={ui.orders_search}
                            onChange={(e) => update({ orders_search: e.target.value }, { debounce: true, resetOrdersPage: true })}
                            className="w-full rounded-xl border border-neutral-400 py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary-700"
                        />
                    </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] border-collapse text-left">
                            <thead>
                                <tr className="bg-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-500">
                                    <th className="px-5 py-3">{t("jastip.col_order")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_buyer")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_product")}</th>
                                    <th className="px-5 py-3 text-center">{t("jastip.col_quantity")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_status")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_jastip_status")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {orderRows.length > 0 ? (
                                    orderRows.map((o) => (
                                        <tr key={o.id} className="transition hover:bg-neutral-50/50">
                                            <td className="px-5 py-3.5 text-sm font-medium text-neutral-500">{o.code}</td>
                                            <td className="px-5 py-3.5">
                                                {o.username ? (
                                                    <Link
                                                        href={`/forum/users/${o.username}`}
                                                        className="flex items-center gap-2.5 group/buyer"
                                                        title={t("jastip.view_buyer_profile")}
                                                    >
                                                        <img
                                                            src={o.avatar}
                                                            alt={o.buyer}
                                                            className="h-8 w-8 rounded-full border border-neutral-200 object-cover"
                                                            onError={(e) => (e.target.src = "/assets/default-profile.png")}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-semibold text-neutral-700 group-hover/buyer:text-primary-700 group-hover/buyer:underline">{o.buyer}</div>
                                                            <div className="truncate text-xs text-neutral-400">@{o.username}</div>
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center gap-2.5">
                                                        <img
                                                            src={o.avatar}
                                                            alt={o.buyer}
                                                            className="h-8 w-8 rounded-full border border-neutral-200 object-cover"
                                                            onError={(e) => (e.target.src = "/assets/default-profile.png")}
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-semibold text-neutral-700">{o.buyer}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-neutral-600">{o.item}</td>
                                            <td className="px-5 py-3.5 text-center text-sm font-semibold text-neutral-700 tabular-nums">{o.qty}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[o.status] || "bg-neutral-100 text-neutral-500"}`}>
                                                    {t(`jastip.order_status.${o.status}`, o.status)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${JASTIPER_STATUS_BADGE[o.jastiper_status] || "bg-neutral-100 text-neutral-500"}`}>
                                                    {t(`jastip.jastiper_status.${o.jastiper_status}`, o.jastiper_status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6">
                                            <EmptyState icon={<FiShoppingCart size={30} />} title={t("jastip.no_orders_title")} description={t("jastip.no_orders_desc")} />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 bg-neutral-50 p-4 md:flex-row">
                        <span className="text-xs font-medium text-neutral-500">
                            {t("common.showing")} {orders?.from ?? 0}–{orders?.to ?? 0} {t("common.of")} {orders?.total ?? 0} {t("common.data")}
                        </span>
                        {orders?.last_page > 1 && (
                            <Pagination
                                currentPage={orders.current_page}
                                totalPages={orders.last_page}
                                onPageChange={(p) => update({ orders_page: p })}
                                scrollTargetId="sales-activity"
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

Index.layout = (page) => (
    <AdminLayout title="Manajemen Jastip">
        <Head title="Manajemen Jastip" />
        {page}
    </AdminLayout>
);
