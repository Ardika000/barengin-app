import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import LocationInput from "@/Components/LocationInput";
import { useTranslation } from "@/lib/useTranslation";
import { FiPlus, FiX, FiUploadCloud, FiChevronLeft } from "react-icons/fi";

// Penanda kolom wajib
const Req = () => <span className="text-red-500"> *</span>;

export default function Create({ transportations = [], prefill = null }) {
    const { t } = useTranslation();
    const [preview, setPreview] = useState(null);

    // #14: saat "buka ulang", data ter-isi dari pergi bareng lama, tapi tanggal &
    // waktu SELALU dikosongkan agar jastiper mengatur jadwal baru.
    const { data, setData, post, processing, errors } = useForm({
        name: prefill?.name ?? "",
        destination_loc: prefill?.destination_loc ?? "",
        departure_loc: prefill?.departure_loc ?? "",
        date: "",
        time: "",
        transportation: prefill?.transportation ?? "",
        description: prefill?.description ?? "",
        people_amount: prefill?.people_amount ?? "",
        financing_estimates: prefill?.financing_estimates?.length ? prefill.financing_estimates : [""],
        image: null,
    });

    const setEstimate = (i, value) => {
        const next = [...data.financing_estimates];
        next[i] = value;
        setData("financing_estimates", next);
    };
    const addEstimate = () => setData("financing_estimates", [...data.financing_estimates, ""]);
    const removeEstimate = (i) =>
        setData("financing_estimates", data.financing_estimates.filter((_, idx) => idx !== i));

    const handleImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setData("image", file);
        setPreview(URL.createObjectURL(file));
    };

    const submit = (e) => {
        e.preventDefault();
        post("/admin/pergi-bareng", { forceFormData: true });
    };

    const fieldError = (key) =>
        errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>;

    // Tanggal tidak boleh sebelum hari ini (selaras backend after_or_equal:today).
    // `en-CA` menghasilkan format YYYY-MM-DD dalam zona waktu lokal.
    const todayStr = new Date().toLocaleDateString("en-CA");
    // Jam minimum hanya berlaku bila tanggal yang dipilih adalah hari ini.
    const timeMin =
        data.date === todayStr
            ? new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : undefined;

    const inputClass =
        "w-full px-4 py-2.5 rounded-xl border border-neutral-400 focus:border-primary-700 outline-none text-sm transition-all";
    const labelClass = "block text-sm font-medium text-neutral-700 mb-1.5";
    const cardTitle = "text-lg font-semibold text-primary-700 mb-4";

    return (
        <form onSubmit={submit}>
            <Head title="Tambah Pergi Bareng Baru" />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/admin/pergi-bareng"
                    className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
                >
                    <FiChevronLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-700">{t("admin.pergi.create_title")}</h1>
                    <p className="text-neutral-500 text-sm">{t("admin.pergi.create_subtitle")}</p>
                </div>
            </div>

            {prefill && (
                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-primary-700">
                    {t("admin.pergi.reopen_note")}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kolom kiri */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Destinasi & titik kumpul */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.pergi.form.section_destination")}</h3>

                        <div className="mb-4">
                            <label className={labelClass}>{t("admin.pergi.form.name_label")}<Req /></label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                placeholder={t("admin.pergi.form.name_ph")}
                                className={inputClass}
                            />
                            {fieldError("name")}
                        </div>

                        <div className="mb-4">
                            <label className={labelClass}>{t("admin.pergi.form.destination_label")}<Req /></label>
                            <LocationInput
                                value={data.destination_loc}
                                onChange={(v) => setData("destination_loc", v)}
                                placeholder={t("admin.pergi.form.destination_ph")}
                                className={inputClass}
                                countryCodes="id"
                            />
                            {fieldError("destination_loc")}
                        </div>

                        <div>
                            <label className={labelClass}>{t("admin.pergi.form.meeting_point_label")}<Req /></label>
                            <LocationInput
                                value={data.departure_loc}
                                onChange={(v) => setData("departure_loc", v)}
                                placeholder={t("admin.pergi.form.meeting_point_ph")}
                                className={inputClass}
                                countryCodes="id"
                            />
                            {fieldError("departure_loc")}
                        </div>
                    </div>

                    {/* Logistik */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.pergi.form.logistics_section")}</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>{t("admin.trip.form.date")}<Req /></label>
                                <input
                                    type="date"
                                    min={todayStr}
                                    value={data.date}
                                    onChange={(e) => setData("date", e.target.value)}
                                    className={inputClass}
                                />
                                {fieldError("date")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("admin.pergi.form.time_label")}<Req /></label>
                                <input
                                    type="time"
                                    min={timeMin}
                                    value={data.time}
                                    onChange={(e) => setData("time", e.target.value)}
                                    className={inputClass}
                                />
                                {fieldError("time")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("admin.pergi.form.transport_label")}<Req /></label>
                                <select
                                    value={data.transportation}
                                    onChange={(e) => setData("transportation", e.target.value)}
                                    className={inputClass + " bg-white cursor-pointer"}
                                >
                                    <option value="">{t("admin.pergi.form.transport_ph")}</option>
                                    {transportations.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                {fieldError("transportation")}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className={labelClass}>{t("admin.trip.form.description")}</label>
                            <textarea
                                rows={4}
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                placeholder={t("admin.pergi.form.description_ph")}
                                className={inputClass + " resize-none"}
                            />
                            {fieldError("description")}
                        </div>

                        <div>
                            <label className={labelClass}>{t("admin.pergi.form.financing_label")}</label>
                            <div className="space-y-2">
                                {data.financing_estimates.map((est, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={est}
                                            onChange={(e) => setEstimate(i, e.target.value)}
                                            placeholder={t("admin.pergi.form.financing_ph")}
                                            className={inputClass}
                                        />
                                        {data.financing_estimates.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEstimate(i)}
                                                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addEstimate}
                                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
                            >
                                <FiPlus /> {t("admin.pergi.form.add_estimate")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Kolom kanan */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.pergi.form.participants_section")}</h3>
                        <label className={labelClass}>{t("admin.trip.form.people_amount")}<Req /></label>
                        <input
                            type="number"
                            min="1"
                            value={data.people_amount}
                            onChange={(e) => setData("people_amount", e.target.value)}
                            placeholder="0"
                            className={inputClass}
                        />
                        {fieldError("people_amount")}
                        <p className="text-xs text-neutral-400 mt-2">{t("admin.pergi.form.people_amount_hint")}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.pergi.form.image_section")}</h3>
                        <label className="block cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
                            <div className="border-2 border-dashed border-neutral-300 rounded-xl h-44 flex flex-col items-center justify-center text-neutral-400 hover:border-primary-700 hover:text-primary-700 transition-colors overflow-hidden bg-neutral-50">
                                {preview ? (
                                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <FiUploadCloud size={28} className="mb-2" />
                                        <span className="text-sm font-medium">{t("admin.trip.form.upload")}</span>
                                    </>
                                )}
                            </div>
                        </label>
                        {fieldError("image")}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
                <Button disabled={processing} className="font-semibold">
                    {processing ? t("admin.trip.form.saving") : t("admin.pergi.form.submit")}
                </Button>
                <Button isButtonLink href="/admin/pergi-bareng" variant="outline" type="neutral" className="font-semibold">
                    {t("common.cancel")}
                </Button>
            </div>
        </form>
    );
}

Create.layout = (page) => (
    <AdminLayout title="Dasbor - Home">
        {page}
    </AdminLayout>
);
