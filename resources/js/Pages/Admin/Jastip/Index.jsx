import React, { useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import Pagination from "@/Components/Pagination";
import JastipProductCard from "@/Components/JastipProductCard";
import { useTranslation } from "@/lib/useTranslation";
import { FiSearch, FiPlus, FiShoppingCart, FiAlertCircle, FiUploadCloud } from "react-icons/fi";
import { LuMapPin, LuTruck } from "react-icons/lu";

const STATUS_BADGE = {
    paid: "bg-blue-100 text-primary-700",
    pending: "bg-amber-100 text-amber-700",
    unpaid: "bg-neutral-100 text-neutral-500",
};

export default function Index({ items = [], orders = {} }) {
    const { t } = useTranslation();
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("latest");
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });
    const [publishModal, setPublishModal] = useState({ open: false, id: null, name: "" });

    const rows = useMemo(() => {
        const q = search.toLowerCase();
        let list = items.filter(
            (i) => i.name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q),
        );
        if (sortBy === "best") list = [...list].sort((a, b) => b.sold - a.sold);
        else if (sortBy === "stock") list = [...list].sort((a, b) => (b.max_slot - b.sold) - (a.max_slot - a.sold));
        return list;
    }, [items, search, sortBy]);

    const orderRows = orders?.data ?? [];

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

    const goPage = (page) =>
        router.get(window.location.pathname, { orders_page: page }, {
            preserveScroll: true, preserveState: true, replace: true, only: ["orders"],
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
                description={<>{t("jastip.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.name}</span>{t("jastip.delete_desc_suffix")}</>}
                confirmLabel={t("jastip.delete_confirm")}
                confirmClass="bg-red-600 hover:bg-red-700"
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
                confirmClass="bg-primary-700 hover:bg-blue-700"
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
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-neutral-400 py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-primary-700"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-44 appearance-none rounded-xl border border-neutral-400 bg-white py-2.5 pl-4 pr-10 text-sm outline-none transition-all focus:border-primary-700 cursor-pointer"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((item) => (
                    <JastipProductCard
                        key={item.id}
                        item={item}
                        manage
                        onEdit={() => router.visit(`/admin/jastip/${item.id}/edit`)}
                        onPublish={() => setPublishModal({ open: true, id: item.id, name: item.name })}
                        onGroupChat={() => router.post(`/chat/jastip/${item.id}/group`)}
                        onDelete={() => setDeleteModal({ open: true, id: item.id, name: item.name })}
                    />
                ))}

                {/* Kartu tambah */}
                <Link
                    href="/admin/jastip/create"
                    className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-700 hover:text-primary-700"
                >
                    <FiShoppingCart size={30} />
                    <span className="text-sm font-semibold">{t("jastip.add_btn")}</span>
                </Link>
            </div>

            {/* Aktivitas Penjualan */}
            <div className="mt-10">
                <h2 className="mb-4 text-xl font-bold text-neutral-700">{t("jastip.sales_activity")}</h2>
                <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-left">
                            <thead>
                                <tr className="bg-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-500">
                                    <th className="px-5 py-3">{t("jastip.col_order")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_buyer")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_product")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_service")}</th>
                                    <th className="px-5 py-3">{t("jastip.col_status")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {orderRows.length > 0 ? (
                                    orderRows.map((o) => (
                                        <tr key={o.id} className="transition hover:bg-neutral-50/50">
                                            <td className="px-5 py-3.5 text-sm font-medium text-neutral-500">{o.code}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <img
                                                        src={o.avatar}
                                                        alt={o.buyer}
                                                        className="h-8 w-8 rounded-full border border-neutral-200 object-cover"
                                                        onError={(e) => (e.target.src = "/assets/default-profile.png")}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-neutral-700">{o.buyer}</div>
                                                        {o.username && <div className="truncate text-xs text-neutral-400">@{o.username}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-sm text-neutral-600">
                                                {o.item} <span className="text-neutral-400">×{o.qty}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                                                    {o.shipping ? <LuTruck size={13} /> : <LuMapPin size={13} />}
                                                    {o.shipping ? t("jastip.service_delivery") : t("jastip.service_pickup")}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[o.status] || "bg-neutral-100 text-neutral-500"}`}>
                                                    {t(`jastip.order_status.${o.status}`, o.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-5 py-12 text-center text-sm text-neutral-500">
                                            {t("jastip.no_orders")}
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
                                onPageChange={goPage}
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
