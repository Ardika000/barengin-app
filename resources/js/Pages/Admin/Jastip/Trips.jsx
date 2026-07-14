import React, { useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import FormModal from "@/Components/FormModal";
import EmptyState from "@/Components/EmptyState";
import Pagination from "@/Components/Pagination";
import { useTranslation } from "@/lib/useTranslation";
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiMapPin, FiInbox } from "react-icons/fi";
import { FaPlaneDeparture } from "react-icons/fa6";

const emptyForm = {
    title: "",
    origin_city: "",
    destination_city: "",
    pickup_location: "",
    start_date: "",
    end_date: "",
    allow_requests: true,
};

// "Destinasi Jastip" — tempat-tempat yang akan dikunjungi jastiper. Tiap
// destinasi bisa membuka/menutup Request Titipan dari pembeli.
export default function Trips({ trips = {} }) {
    const { t } = useTranslation();
    const rows = trips.data ?? [];

    const form = useForm({ ...emptyForm });
    const [formModal, setFormModal] = useState({ open: false, id: null }); // id null = buat baru
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

    const openCreate = () => {
        form.setDefaults({ ...emptyForm });
        form.reset();
        form.clearErrors();
        setFormModal({ open: true, id: null });
    };

    const openEdit = (trip) => {
        const values = {
            title: trip.title ?? "",
            origin_city: trip.origin_city ?? "",
            destination_city: trip.destination_city ?? "",
            pickup_location: trip.pickup_location ?? "",
            start_date: trip.start_date ?? "",
            end_date: trip.end_date ?? "",
            allow_requests: trip.allow_requests,
        };
        form.setDefaults(values);
        form.reset();
        form.clearErrors();
        setFormModal({ open: true, id: trip.id });
    };

    const submitForm = () => {
        const url = formModal.id ? `/admin/jastip/trips/${formModal.id}` : "/admin/jastip/trips";
        form.post(url, {
            preserveScroll: true,
            onSuccess: () => setFormModal({ open: false, id: null }),
        });
    };

    // Toggle terima-request langsung dari tabel (kirim seluruh field agar valid)
    const toggleAllow = (trip) => {
        router.post(`/admin/jastip/trips/${trip.id}`, {
            title: trip.title ?? "",
            origin_city: trip.origin_city,
            destination_city: trip.destination_city,
            pickup_location: trip.pickup_location ?? "",
            start_date: trip.start_date,
            end_date: trip.end_date,
            allow_requests: !trip.allow_requests,
        }, { preserveScroll: true });
    };

    const confirmDelete = () =>
        router.delete(`/admin/jastip/trips/${deleteModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ open: false, id: null, name: "" }),
        });

    const inputClass =
        "w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-700";
    const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-500";

    const field = (name, label, props = {}) => (
        <div>
            <label className={labelClass}>{label}</label>
            <input
                value={form.data[name]}
                onChange={(e) => form.setData(name, e.target.value)}
                className={inputClass}
                {...props}
            />
            {form.errors[name] && <p className="mt-1 text-xs text-danger-700">{form.errors[name]}</p>}
        </div>
    );

    return (
        <>
            <ConfirmModal
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
                onConfirm={confirmDelete}
                icon={<FiAlertCircle size={26} />}
                iconClass="bg-red-100 text-red-500"
                title={t("jastip.trips.delete_title")}
                description={<>{t("jastip.trips.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.name}</span>{t("jastip.trips.delete_desc_suffix")}</>}
                confirmLabel={t("jastip.delete_confirm")}
                confirmType="danger"
            />

            <FormModal
                open={formModal.open}
                onClose={() => setFormModal({ open: false, id: null })}
                onSubmit={submitForm}
                processing={form.processing}
                icon={<FaPlaneDeparture size={20} />}
                iconClass="bg-blue-100 text-primary-700"
                title={formModal.id ? t("jastip.trips.edit_title") : t("jastip.trips.create_title")}
                description={t("jastip.trips.form_desc")}
                confirmLabel={t("common.save", "Simpan")}
                confirmType="primary"
            >
                {field("title", t("jastip.trips.form_title"), { placeholder: t("jastip.trips.form_title_ph") })}
                <div className="grid grid-cols-2 gap-3">
                    {field("destination_city", t("jastip.trips.form_destination"))}
                    {field("origin_city", t("jastip.trips.form_pickup_city"))}
                </div>
                {field("pickup_location", t("jastip.trips.form_pickup_loc"), { placeholder: t("jastip.trips.form_pickup_loc_ph") })}
                <div className="grid grid-cols-2 gap-3">
                    {field("start_date", t("jastip.trips.form_start"), { type: "date" })}
                    {field("end_date", t("jastip.trips.form_end"), { type: "date" })}
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-600">
                    <input
                        type="checkbox"
                        checked={form.data.allow_requests}
                        onChange={(e) => form.setData("allow_requests", e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-700 focus:ring-primary-200"
                    />
                    {t("jastip.trips.allow_requests")}
                </label>
            </FormModal>

            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-700">{t("jastip.trips.title")}</h1>
                    <p className="text-sm text-neutral-500">{t("jastip.trips.subtitle")}</p>
                </div>
                <Button size="sm" className="gap-2 whitespace-nowrap self-start md:self-auto" onClick={openCreate}>
                    <FiPlus /> {t("jastip.trips.add_btn")}
                </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse text-left">
                        <thead>
                            <tr className="bg-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-500">
                                <th className="px-5 py-3">{t("jastip.trips.col_destination")}</th>
                                <th className="px-5 py-3">{t("jastip.trips.col_pickup")}</th>
                                <th className="px-5 py-3">{t("jastip.trips.col_window")}</th>
                                <th className="px-5 py-3 text-center">{t("jastip.trips.col_requests")}</th>
                                <th className="px-5 py-3 text-center">{t("jastip.trips.col_allow")}</th>
                                <th className="px-5 py-3 text-center">{t("admin.trip.col_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {rows.length > 0 ? (
                                rows.map((trip) => (
                                    <tr key={trip.id} className="transition hover:bg-neutral-50/50">
                                        <td className="px-5 py-3.5">
                                            <div className="text-sm font-semibold text-neutral-700">
                                                {trip.title || trip.destination_city}
                                            </div>
                                            <div className="text-xs text-neutral-400">{trip.destination_city}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-neutral-600">
                                            {trip.origin_city}
                                            {trip.pickup_location && (
                                                <div className="max-w-[220px] truncate text-xs text-neutral-400">{trip.pickup_location}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-neutral-700 whitespace-nowrap">
                                            {trip.window_label}
                                            {!trip.is_open && (
                                                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500">
                                                    {t("jastip.trips.closed")}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {trip.pending_requests > 0 ? (
                                                <Link
                                                    href={`/admin/jastip/requests?trip_id=${trip.id}`}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-200"
                                                >
                                                    <FiInbox size={12} /> {trip.pending_requests}
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-neutral-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {/* Saklar terima request */}
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={trip.allow_requests}
                                                onClick={() => toggleAllow(trip)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                    trip.allow_requests ? "bg-primary-700" : "bg-neutral-300"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                                        trip.allow_requests ? "translate-x-6" : "translate-x-1"
                                                    }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEdit(trip)}
                                                    title={t("jastip.action_edit")}
                                                    className="rounded-lg bg-amber-50 p-2 text-amber-600 transition-colors hover:bg-amber-100"
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({ open: true, id: trip.id, name: trip.title || trip.destination_city })}
                                                    title={t("jastip.action_delete")}
                                                    className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        <EmptyState
                                            icon={<FiMapPin size={30} />}
                                            title={t("jastip.trips.empty_title")}
                                            description={t("jastip.trips.empty_desc")}
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-100 bg-neutral-50 p-4 md:flex-row">
                    <span className="text-xs font-medium text-neutral-500">
                        {t("common.showing")} {trips.from ?? 0}–{trips.to ?? 0} {t("common.of")} {trips.total ?? 0} {t("common.data")}
                    </span>
                    {trips.last_page > 1 && (
                        <Pagination
                            currentPage={trips.current_page}
                            totalPages={trips.last_page}
                            onPageChange={(p) => router.get("/admin/jastip/trips", { page: p }, { preserveState: true, preserveScroll: true })}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

Trips.layout = (page) => (
    <AdminLayout title="Destinasi Jastip">
        <Head title="Destinasi Jastip" />
        {page}
    </AdminLayout>
);
