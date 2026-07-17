import React, { useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import StarRating from "@/Components/StarRating";
import Pagination from "@/Components/Pagination";
import FormModal from "@/Components/FormModal";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";
import {
    FaPlaneDeparture,
    FaLocationDot,
    FaRegCalendar,
    FaChevronLeft,
    FaBoxOpen,
} from "react-icons/fa6";

// "Request Titipan" — daftar destinasi jastiper yang menerima permintaan
// barang di luar katalog. Pembeli memilih destinasi lalu mengajukan request.
export default function Browse({ trips = {} }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const rows = trips.data ?? [];

    const [requestModal, setRequestModal] = useState({ open: false, trip: null });
    const form = useForm({
        jastip_item_id: null,
        item_name: "",
        description: "",
        quantity: 1,
        budget: "",
        note: "",
        image: null,
    });

    const openRequest = (trip) => {
        if (!auth?.user) {
            router.visit("/login");
            return;
        }
        form.reset();
        form.clearErrors();
        form.setData("jastip_item_id", trip.id);
        setRequestModal({ open: true, trip });
    };

    const submitRequest = () =>
        form.post("/jastip/requests", {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => setRequestModal({ open: false, trip: null }),
        });

    const inputClass =
        "w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-700";
    const labelClass = "mb-1.5 block text-xs font-semibold text-neutral-500";

    const fieldError = (name) =>
        form.errors[name] ? <p className="mt-1 text-xs text-danger-700">{form.errors[name]}</p> : null;

    return (
        <div className="min-h-screen bg-neutral-50 pb-16 pt-10 md:pt-12">
            <Head title="Request Titipan - Barengin" />

            {/* Form pengajuan request */}
            <FormModal
                open={requestModal.open}
                onClose={() => setRequestModal({ open: false, trip: null })}
                onSubmit={submitRequest}
                processing={form.processing}
                icon={<FaBoxOpen size={20} />}
                iconClass="bg-blue-100 text-primary-700"
                title={t("jastip.request.form_title")}
                description={
                    requestModal.trip && (
                        <>
                            {t("jastip.request.form_desc_prefix")}{" "}
                            <span className="font-semibold text-neutral-700">{requestModal.trip.jastiper.name}</span>
                            {" — "}{requestModal.trip.destination_city}. {t("jastip.request.form_desc")}
                        </>
                    )
                }
                confirmLabel={t("jastip.request.cta")}
                confirmType="primary"
                size="md"
            >
                <div>
                    <label className={labelClass}>{t("jastip.request.form.item_name")}</label>
                    <input
                        value={form.data.item_name}
                        onChange={(e) => form.setData("item_name", e.target.value)}
                        placeholder={t("jastip.request.form.item_name_ph")}
                        className={inputClass}
                    />
                    {fieldError("item_name")}
                </div>
                <div>
                    <label className={labelClass}>{t("jastip.request.form.link_desc")}</label>
                    <textarea
                        rows={2}
                        value={form.data.description}
                        onChange={(e) => form.setData("description", e.target.value)}
                        placeholder={t("jastip.request.form.link_desc_ph")}
                        className={inputClass + " resize-none"}
                    />
                    {fieldError("description")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>{t("jastip.request.form.qty")}</label>
                        <input
                            type="number"
                            min="1"
                            value={form.data.quantity}
                            onChange={(e) => form.setData("quantity", e.target.value)}
                            className={inputClass}
                        />
                        {fieldError("quantity")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.request.form.budget")}</label>
                        <input
                            type="number"
                            min="0"
                            value={form.data.budget}
                            onChange={(e) => form.setData("budget", e.target.value)}
                            placeholder="200000"
                            className={inputClass}
                        />
                        {fieldError("budget")}
                    </div>
                </div>
                <div>
                    <label className={labelClass}>{t("jastip.request.form.note")}</label>
                    <textarea
                        rows={2}
                        value={form.data.note}
                        onChange={(e) => form.setData("note", e.target.value)}
                        placeholder={t("jastip.request.form.note_ph")}
                        className={inputClass + " resize-none"}
                    />
                    {fieldError("note")}
                </div>
                <div>
                    <label className={labelClass}>{t("jastip.request.form.image")}</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => form.setData("image", e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                    />
                    {fieldError("image")}
                </div>
            </FormModal>

            <Container>
                <Link
                    href="/jastip"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-primary-700"
                >
                    <FaChevronLeft size={12} /> {t("jastip.request.back_to_shop")}
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-neutral-800 md:text-3xl">{t("jastip.request.browse_title")}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">{t("jastip.request.browse_subtitle")}</p>
                </div>

                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-20 text-center">
                        <FaPlaneDeparture size={28} className="mb-3 text-neutral-300" />
                        <p className="text-sm font-semibold text-neutral-600">{t("jastip.request.browse_empty")}</p>
                        <p className="mt-1 text-xs text-neutral-400">{t("jastip.request.browse_empty_desc")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {rows.map((trip) => (
                            <div key={trip.id} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                                {/* Jastiper */}
                                <div className="mb-4 flex items-center gap-3">
                                    <img
                                        src={trip.jastiper.avatar}
                                        alt={trip.jastiper.name}
                                        className="h-11 w-11 rounded-full border border-neutral-200 object-cover"
                                        onError={(e) => (e.target.src = "/assets/default-profile.png")}
                                    />
                                    <div className="min-w-0">
                                        {trip.jastiper.username ? (
                                            <Link
                                                href={`/forum/users/${trip.jastiper.username}`}
                                                className="block truncate text-sm font-bold text-neutral-700 hover:text-primary-700 hover:underline"
                                            >
                                                {trip.jastiper.name}
                                            </Link>
                                        ) : (
                                            <span className="block truncate text-sm font-bold text-neutral-700">{trip.jastiper.name}</span>
                                        )}
                                        {trip.jastiper.rating != null ? (
                                            <StarRating
                                                rating={trip.jastiper.rating}
                                                reviews={trip.jastiper.reviews}
                                                className="text-xs"
                                            />
                                        ) : (
                                            <span className="text-xs text-neutral-400">{t("jastip.request.new_jastiper")}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Rute */}
                                <div className="space-y-2 text-sm text-neutral-600">
                                    {trip.item_count > 0 && (
                                        <p className="text-xs font-semibold text-primary-700">
                                            {trip.item_count} {t("jastip.request.listed_items")}
                                        </p>
                                    )}
                                    <p className="flex items-center gap-2">
                                        <FaPlaneDeparture className="shrink-0 text-neutral-400" size={13} />
                                        {t("jastip.card.bought_in")} <span className="font-semibold text-neutral-800">{trip.destination_city}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <FaLocationDot className="shrink-0 text-primary-600" size={13} />
                                        {t("jastip.card.pickup_at")} <span className="font-semibold text-neutral-800">{trip.origin_city}</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <FaRegCalendar className="shrink-0 text-neutral-400" size={13} />
                                        {t("jastip.request.deadline")} <span className="font-semibold text-neutral-800">{trip.deadline_label}</span>
                                    </p>
                                </div>

                                <Button
                                    type="primary"
                                    size="sm"
                                    rounded={false}
                                    onClick={() => openRequest(trip)}
                                    className="mt-5 w-full justify-center rounded-xl"
                                >
                                    {t("jastip.request.cta")}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {trips.last_page > 1 && (
                    <Pagination
                        className="mt-10"
                        currentPage={trips.current_page}
                        totalPages={trips.last_page}
                        onPageChange={(p) => router.get("/jastip/requests", { page: p }, { preserveState: true, preserveScroll: true })}
                    />
                )}
            </Container>
        </div>
    );
}

Browse.layout = (page) => <MainLayout children={page} />;
