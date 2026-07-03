import React, { useState } from "react";
import Button from "@/Components/Button";
import Input from "@/Components/Input";
import LocationInput from "@/Components/LocationInput";
import { useTranslation } from "@/lib/useTranslation";
import { FiPlus, FiX, FiUploadCloud, FiTrash2, FiImage } from "react-icons/fi";

const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-neutral-400 focus:border-primary-700 outline-none text-sm transition-all";
const labelClass = "block text-sm font-medium text-neutral-700 mb-1.5";
const cardTitle = "text-lg font-semibold text-primary-700 mb-4";

const emptyActivity = () => ({
    name: "",
    date: "",
    start_time: "",
    end_time: "",
    description: "",
    images: [],
    existing_images: [],
});

export default function TripForm({ data, setData, errors, processing, onSubmit, submitLabel, facilities = [] }) {
    const { t } = useTranslation();
    // Tanggal mulai minimal besok (harus setelah hari ini)
    const minStartDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const [facilityOptions, setFacilityOptions] = useState(facilities);
    const [showFacilityModal, setShowFacilityModal] = useState(false);
    const [newFacility, setNewFacility] = useState("");
    const [imagePreview, setImagePreview] = useState(data.image_preview || null);

    const err = (key) => errors?.[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>;

    // ── Facilities ──
    const toggleFacility = (name) => {
        const has = data.facilities.includes(name);
        setData("facilities", has ? data.facilities.filter((f) => f !== name) : [...data.facilities, name]);
    };
    const addFacility = () => {
        const name = newFacility.trim();
        if (!name) return;
        if (!facilityOptions.includes(name)) setFacilityOptions([...facilityOptions, name]);
        if (!data.facilities.includes(name)) setData("facilities", [...data.facilities, name]);
        setNewFacility("");
        setShowFacilityModal(false);
    };

    // ── Trip image ──
    const handleTripImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setData("image", file);
        setImagePreview(URL.createObjectURL(file));
    };

    // ── Activities ──
    const updateActivity = (i, field, value) => {
        const next = data.activities.map((a, idx) => (idx === i ? { ...a, [field]: value } : a));
        setData("activities", next);
    };
    const addActivity = () => setData("activities", [...data.activities, emptyActivity()]);
    const removeActivity = (i) => setData("activities", data.activities.filter((_, idx) => idx !== i));
    const addActivityImages = (i, fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        updateActivity(i, "images", [...data.activities[i].images, ...files]);
    };
    const removeActivityImage = (i, imgIdx) => {
        updateActivity(i, "images", data.activities[i].images.filter((_, idx) => idx !== imgIdx));
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kolom kiri */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Informasi Umum */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.trip.form.general_info")}</h3>

                        <div className="mb-4">
                            <label className={labelClass}>{t("admin.trip.form.trip_name")}</label>
                            <Input type="text" size="sm" value={data.name} onChange={(e) => setData("name", e.target.value)}
                                placeholder={t("admin.trip.form.trip_name_ph")} />
                            {err("name")}
                        </div>

                        <div className="mb-4">
                            <label className={labelClass}>{t("admin.trip.form.location")}</label>
                            <LocationInput value={data.location} onChange={(v) => setData("location", v)}
                                placeholder={t("admin.trip.form.location_ph")} className={inputClass} />
                            {err("location")}
                        </div>

                        <div className="mb-4">
                            <label className={labelClass}>{t("admin.trip.form.about")}</label>
                            <textarea rows={4} value={data.description} onChange={(e) => setData("description", e.target.value)}
                                placeholder={t("admin.trip.form.about_ph")}
                                className={inputClass + " resize-none"} />
                            {err("description")}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>{t("admin.trip.form.people_amount")}</label>
                                <Input type="number" size="sm" min="1" value={data.people_amount}
                                    onChange={(e) => setData("people_amount", e.target.value)} placeholder="0" />
                                {err("people_amount")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("admin.trip.form.start_date")}</label>
                                <Input type="date" size="sm" min={minStartDate} value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} />
                                {err("start_date")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("admin.trip.form.end_date")}</label>
                                <Input type="date" size="sm" min={data.start_date || minStartDate} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} />
                                {err("end_date")}
                            </div>
                        </div>
                    </div>

                    {/* Rincian Harga */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.trip.form.price_section")}</h3>
                        <label className={labelClass}>{t("admin.trip.form.price_per_person")}</label>
                        <Input type="number" size="sm" min="0" leftAddon="Rp" value={data.price}
                            onChange={(e) => setData("price", e.target.value)} placeholder="contoh: 1500000" />
                        {err("price")}
                        <p className="text-xs text-neutral-400 mt-2">{t("admin.trip.form.price_note")}</p>
                    </div>

                    {/* Detail Aktivitas */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.trip.form.activities_section")}</h3>

                        <div className="space-y-5">
                            {data.activities.map((act, i) => (
                                <div key={i} className="rounded-2xl border border-neutral-200 p-5 relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-primary-700 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                                            <h4 className="font-semibold text-neutral-700">{t("admin.trip.form.activity_label")} {String(i + 1).padStart(2, "0")}</h4>
                                        </div>
                                        {data.activities.length > 1 && (
                                            <button type="button" onClick={() => removeActivity(i)}
                                                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                                <FiTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className={labelClass}>{t("admin.trip.form.activity_name")}</label>
                                        <Input type="text" size="sm" value={act.name} onChange={(e) => updateActivity(i, "name", e.target.value)}
                                            placeholder={t("admin.trip.form.activity_name_ph")} />
                                        {err(`activities.${i}.name`)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <label className={labelClass}>{t("admin.trip.form.date")}</label>
                                            <Input type="date" size="sm" min={data.start_date || minStartDate} max={data.end_date || undefined}
                                                value={act.date} onChange={(e) => updateActivity(i, "date", e.target.value)} />
                                            {err(`activities.${i}.date`)}
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t("admin.trip.form.start_time")}</label>
                                            <Input type="time" size="sm" value={act.start_time} onChange={(e) => updateActivity(i, "start_time", e.target.value)} />
                                            {err(`activities.${i}.start_time`)}
                                        </div>
                                        <div>
                                            <label className={labelClass}>{t("admin.trip.form.end_time")}</label>
                                            <Input type="time" size="sm" value={act.end_time} onChange={(e) => updateActivity(i, "end_time", e.target.value)} />
                                            {err(`activities.${i}.end_time`)}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className={labelClass}>{t("admin.trip.form.description")}</label>
                                        <textarea rows={3} value={act.description} onChange={(e) => updateActivity(i, "description", e.target.value)}
                                            placeholder={t("admin.trip.form.activity_desc_ph")}
                                            className={inputClass + " resize-none"} />
                                    </div>

                                    {/* Gambar aktivitas */}
                                    <label className={labelClass}>{t("admin.trip.form.activity_photo")}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(act.existing_images || []).map((url, idx) => (
                                            <div key={`ex-${idx}`} className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 opacity-70" title={t("admin.trip.form.old_photo_title")}>
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                        {act.images.map((file, idx) => (
                                            <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 group">
                                                <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeActivityImage(i, idx)}
                                                    className="absolute top-0 right-0 bg-black/60 text-white p-0.5 opacity-0 group-hover:opacity-100 transition">
                                                    <FiX size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 hover:border-primary-700 hover:text-primary-700 cursor-pointer transition">
                                            <input type="file" accept="image/*" multiple className="hidden"
                                                onChange={(e) => addActivityImages(i, e.target.files)} />
                                            <FiImage size={18} />
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={addActivity}
                            className="mt-4 w-full border-2 border-dashed border-neutral-300 rounded-2xl py-4 flex items-center justify-center gap-2 text-sm font-semibold text-primary-700 hover:bg-blue-50/40 transition">
                            <FiPlus /> {t("admin.trip.form.add_activity")}
                        </button>
                    </div>
                </div>

                {/* Kolom kanan */}
                <div className="space-y-6">
                    {/* Fasilitas */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.trip.form.facilities")}</h3>
                        <div className="space-y-2.5">
                            {facilityOptions.map((name) => (
                                <label key={name} className="flex items-center justify-between cursor-pointer">
                                    <span className="text-sm text-neutral-700">{name}</span>
                                    <input type="checkbox" checked={data.facilities.includes(name)} onChange={() => toggleFacility(name)}
                                        className="w-5 h-5 rounded border-neutral-300 text-primary-700 focus:ring-primary-700 cursor-pointer" />
                                </label>
                            ))}
                        </div>
                        <button type="button" onClick={() => setShowFacilityModal(true)}
                            className="mt-4 w-full border border-neutral-200 rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition">
                            <FiPlus /> {t("admin.trip.form.add_facility")}
                        </button>
                    </div>

                    {/* Gambar Utama Trip */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
                        <h3 className={cardTitle}>{t("admin.trip.form.main_image")}</h3>
                        <label className="block cursor-pointer">
                            <input type="file" accept="image/*" onChange={handleTripImage} className="hidden" />
                            <div className="border-2 border-dashed border-neutral-300 rounded-xl h-44 flex flex-col items-center justify-center text-neutral-400 hover:border-primary-700 hover:text-primary-700 transition overflow-hidden bg-neutral-50">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <><FiUploadCloud size={28} className="mb-2" /><span className="text-sm font-medium">{t("admin.trip.form.upload")}</span></>
                                )}
                            </div>
                        </label>
                        {err("image")}
                    </div>
                </div>
            </div>

            {/* Aksi */}
            <div className="mt-6">
                <Button disabled={processing} className="font-semibold">
                    {processing ? t("admin.trip.form.saving") : submitLabel}
                </Button>
                <p className="text-xs text-amber-600 font-medium mt-2">{t("admin.trip.form.draft_note")}</p>
            </div>

            {/* Modal tambah fasilitas */}
            {showFacilityModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/40 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                            <h3 className="text-lg font-bold text-neutral-700">{t("admin.trip.form.add_facility_modal_title")}</h3>
                            <button type="button" onClick={() => setShowFacilityModal(false)} className="text-neutral-400 hover:text-neutral-700">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <label className={labelClass}>{t("admin.trip.form.facility_name")}</label>
                            <Input type="text" size="sm" value={newFacility} autoFocus
                                onChange={(e) => setNewFacility(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFacility(); } }}
                                placeholder={t("admin.trip.form.facility_name_ph")} />
                            <div className="bg-blue-50 text-blue-800 text-xs rounded-lg p-3 mt-4">
                                {t("admin.trip.form.facility_hint")}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-neutral-50">
                            <button type="button" onClick={() => setShowFacilityModal(false)}
                                className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-100 transition">{t("common.cancel")}</button>
                            <button type="button" onClick={addFacility}
                                className="px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-blue-700 transition inline-flex items-center gap-1.5">
                                <FiPlus /> {t("admin.trip.form.add")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

export { emptyActivity };
