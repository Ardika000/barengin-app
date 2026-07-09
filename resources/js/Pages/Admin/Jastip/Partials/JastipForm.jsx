import React, { useEffect, useState } from "react";
import Button from "@/Components/Button";
import Input from "@/Components/Input";
import Checkbox from "@/Components/Checkbox";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import { useTranslation } from "@/lib/useTranslation";
import { INDONESIA_PROVINCES } from "@/lib/indonesiaProvinces";
import { FiPlus, FiX, FiTrash2, FiImage, FiMapPin, FiShoppingBag } from "react-icons/fi";

// #13: penanda kolom wajib
const Req = () => <span className="text-red-500"> *</span>;

const inputClass =
    "w-full rounded-xl border border-neutral-400 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-700";
const labelClass = "mb-1.5 block text-sm font-medium text-neutral-700";
const cardTitle = "mb-4 text-lg font-semibold text-primary-700";
const card = "rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm";

// Varian datar: satu tingkat, masing-masing punya stok/harga/min/gambar sendiri.
export const emptyVariant = () => ({
    value: "", price: "", stock: "", min_buy: "1",
    image: null, image_url: null, image_name: null,
});

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function JastipForm({
    data,
    setData,
    errors,
    processing,
    categories = [],
    existingImages = [],
    onRemoveExisting,
    onSaveDraft,
    autoLocate = false,
}) {
    const { t } = useTranslation();
    const [previews, setPreviews] = useState([]);

    // #10: pada form baru, deteksi lokasi jastiper & isi otomatis "Lokasi Ambil" (kota).
    useEffect(() => {
        if (!autoLocate) return;
        if (data.pickup_city || data.pickup_province) return;
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const res = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=id`
                    );
                    const geo = await res.json();
                    const city = geo.city || geo.locality || "";
                    if (city) setData((d) => (d.pickup_city ? d : { ...d, pickup_city: city }));
                } catch {
                    /* abaikan kegagalan geolokasi */
                }
            },
            () => {},
            { enableHighAccuracy: false, timeout: 10000 }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const err = (key) => errors?.[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>;
    const totalPrice = Number(data.base_price || 0) + Number(data.jastip_fee || 0);

    // ── Varian ──
    const updateVariant = (i, field, value) =>
        setData("variants", data.variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));
    const addVariant = () => setData("variants", [...data.variants, emptyVariant()]);
    const removeVariant = (i) => setData("variants", data.variants.filter((_, idx) => idx !== i));
    const setVariantImage = (i, file) => {
        if (!file) return;
        setData("variants", data.variants.map((v, idx) =>
            idx === i ? { ...v, image: file, image_url: URL.createObjectURL(file) } : v));
    };
    const clearVariantImage = (i) =>
        setData("variants", data.variants.map((v, idx) =>
            idx === i ? { ...v, image: null, image_url: null, image_name: null } : v));

    // Aktifkan/nonaktifkan varian (#9)
    const toggleHasVariants = (checked) => {
        setData((d) => {
            if (checked) {
                const seeded = d.variants && d.variants.length
                    ? d.variants
                    : [{ ...emptyVariant(), value: "Original", stock: d.max_slot || "", min_buy: d.min_buy || "1" }];
                return { ...d, has_variants: true, variants: seeded };
            }
            // Kembali ke mode tanpa varian: ambil stok/min dari varian pertama
            const first = d.variants?.[0];
            return {
                ...d,
                has_variants: false,
                max_slot: first?.stock ?? d.max_slot ?? "",
                min_buy: first?.min_buy ?? d.min_buy ?? "1",
            };
        });
    };

    // ── Gambar produk ──
    const addImages = (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        setData("images", [...(data.images || []), ...files]);
        setPreviews((prev) => [...prev, ...files.map((f) => ({ url: URL.createObjectURL(f), file: f }))]);
    };
    const removeNewImage = (idx) => {
        setData("images", data.images.filter((_, i) => i !== idx));
        setPreviews((prev) => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            {/* Informasi Umum */}
            <div className={card}>
                <h3 className={cardTitle}>{t("jastip.form.general")}</h3>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelClass}>{t("jastip.form.name")}<Req /></label>
                        <Input type="text" size="sm" value={data.name} onChange={(e) => setData("name", e.target.value)} placeholder={t("jastip.form.name_ph")} />
                        {err("name")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.form.category")}<Req /></label>
                        <select value={data.jastip_category_id || ""} onChange={(e) => setData("jastip_category_id", e.target.value)} className={inputClass + " bg-white cursor-pointer"}>
                            <option value="">{t("jastip.form.category_ph")}</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {err("jastip_category_id")}
                    </div>
                </div>
                <div>
                    <label className={labelClass}>{t("jastip.form.description")}</label>
                    <textarea rows={4} value={data.description} onChange={(e) => setData("description", e.target.value)} placeholder={t("jastip.form.description_ph")} className={inputClass + " resize-none"} />
                    {err("description")}
                </div>
            </div>

            {/* Lokasi Jastip */}
            <div className={card}>
                <h3 className={cardTitle}>{t("jastip.form.location")}</h3>
                <p className="-mt-2 mb-5 text-xs text-neutral-400">{t("jastip.form.location_note")}</p>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-200 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"><FiMapPin size={15} /></span>
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-700">{t("jastip.form.pickup_title")}</h4>
                                <p className="text-xs text-neutral-400">{t("jastip.form.pickup_desc")}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass}>{t("jastip.form.province")}</label>
                                <select value={data.pickup_province || ""} onChange={(e) => setData("pickup_province", e.target.value)} className={inputClass + " bg-white cursor-pointer"}>
                                    <option value="">{t("jastip.form.province_ph")}</option>
                                    {INDONESIA_PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                                </select>
                                {err("pickup_province")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.city")}</label>
                                <PlaceAutocomplete value={data.pickup_city || ""} onChange={(v) => setData("pickup_city", v)} placeholder={t("jastip.form.city_ph")} prioritizeIndonesia />
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.pickup_address")}</label>
                                <textarea rows={2} value={data.pickup_address || ""} onChange={(e) => setData("pickup_address", e.target.value)} placeholder={t("jastip.form.pickup_address_ph")} className={inputClass + " resize-none"} />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600"><FiShoppingBag size={15} /></span>
                            <div>
                                <h4 className="text-sm font-semibold text-neutral-700">{t("jastip.form.purchase_title")}</h4>
                                <p className="text-xs text-neutral-400">{t("jastip.form.purchase_desc")}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass}>{t("jastip.form.purchase_region")}</label>
                                <PlaceAutocomplete value={data.purchase_province || ""} onChange={(v) => setData("purchase_province", v)} placeholder={t("jastip.form.purchase_region_ph")} />
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.city")}</label>
                                <PlaceAutocomplete value={data.purchase_city || ""} onChange={(v) => setData("purchase_city", v)} placeholder={t("jastip.form.purchase_city_ph")} />
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.purchase_address")}</label>
                                <textarea rows={2} value={data.purchase_address || ""} onChange={(e) => setData("purchase_address", e.target.value)} placeholder={t("jastip.form.purchase_address_ph")} className={inputClass + " resize-none"} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Harga */}
            <div className={card}>
                <h3 className={cardTitle}>{t("jastip.form.price")}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelClass}>{t("jastip.form.base_price")}<Req /></label>
                        <Input type="number" size="sm" min="0" leftAddon="Rp" value={data.base_price} onChange={(e) => setData("base_price", e.target.value)} placeholder="0" />
                        {err("base_price")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.form.jastip_fee")}</label>
                        <Input type="number" size="sm" min="0" leftAddon="Rp" value={data.jastip_fee} onChange={(e) => setData("jastip_fee", e.target.value)} placeholder="0" />
                        {err("jastip_fee")}
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50/60 px-4 py-3">
                    <span className="text-sm font-medium text-neutral-600">{t("jastip.form.total_price")}</span>
                    <span className="text-lg font-bold text-primary-700">{rupiah(totalPrice)}</span>
                </div>
                <p className="mt-2 text-xs text-neutral-400">{t("jastip.form.price_note")}</p>
            </div>

            {/* Inventaris & Estimasi waktu */}
            <div className={card}>
                <h3 className={cardTitle}>{t("jastip.form.inventory")}</h3>

                {/* Stok & Min. Pembelian — hanya bila TANPA varian */}
                {!data.has_variants && (
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>{t("jastip.form.total_stock")}<Req /></label>
                            <Input type="number" size="sm" min="1" value={data.max_slot} onChange={(e) => setData("max_slot", e.target.value)} placeholder="0" />
                            {err("max_slot")}
                        </div>
                        <div>
                            <label className={labelClass}>{t("jastip.form.min_buy")}<Req /></label>
                            <Input type="number" size="sm" min="1" value={data.min_buy} onChange={(e) => setData("min_buy", e.target.value)} placeholder="1" />
                            {err("min_buy")}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelClass}>{t("jastip.form.start_date")}</label>
                        <Input type="date" size="sm" value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} />
                        {err("start_date")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.form.end_date")}</label>
                        <Input type="date" size="sm" min={data.start_date || undefined} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} />
                        {err("end_date")}
                    </div>
                </div>

                {/* #7: jendela pengambilan barang oleh pembeli */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelClass}>{t("jastip.form.pickup_start_date")}</label>
                        <Input type="date" size="sm" value={data.pickup_start_date} onChange={(e) => setData("pickup_start_date", e.target.value)} />
                        {err("pickup_start_date")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.form.pickup_end_date")}</label>
                        <Input type="date" size="sm" min={data.pickup_start_date || undefined} value={data.pickup_end_date} onChange={(e) => setData("pickup_end_date", e.target.value)} />
                        {err("pickup_end_date")}
                    </div>
                </div>
                <p className="mt-2 text-xs text-neutral-400">{t("jastip.form.pickup_window_note")}</p>

                {/* Toggle varian */}
                <div className="mt-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
                    <Checkbox
                        id="has_variants"
                        checked={Boolean(data.has_variants)}
                        onChange={(checked) => toggleHasVariants(checked)}
                        label={t("jastip.form.has_variants")}
                        labelClassName="font-semibold"
                    />
                    <p className="mt-1 pl-6 text-xs text-neutral-400">{t("jastip.form.has_variants_hint")}</p>
                </div>
            </div>

            {/* Tambah Varian — hanya bila punya varian, DI BAWAH Inventaris (#9) */}
            {data.has_variants && (
                <div className={card}>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-primary-700">{t("jastip.form.variants")}</h3>
                            <p className="text-xs text-neutral-400">{t("jastip.form.variants_hint")}</p>
                        </div>
                        <Button type="button" size="xs" onClick={addVariant} className="gap-1.5">
                            {t("jastip.form.add_variant")} <FiPlus />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {data.variants.map((v, vi) => (
                            <div key={vi} className="rounded-2xl border border-neutral-200 p-4">
                                <div className="flex gap-4">
                                    {/* Gambar varian (opsional) */}
                                    <div className="shrink-0">
                                        <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-700">
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { setVariantImage(vi, e.target.files?.[0]); e.target.value = ""; }} />
                                            {v.image_url ? (
                                                <img src={v.image_url} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <FiImage size={20} />
                                                    <span className="mt-1 text-[10px]">{t("jastip.form.variant_image")}</span>
                                                </div>
                                            )}
                                        </label>
                                        {v.image_url && (
                                            <button type="button" onClick={() => clearVariantImage(vi)} className="mt-1 w-full text-center text-[11px] font-medium text-red-500 hover:underline">
                                                {t("jastip.form.remove_image")}
                                            </button>
                                        )}
                                    </div>

                                    {/* Field varian */}
                                    <div className="flex-1 space-y-3">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className={labelClass}>{t("jastip.form.variant_name")}<Req /></label>
                                                <Input type="text" size="sm" value={v.value} onChange={(e) => updateVariant(vi, "value", e.target.value)} placeholder={t("jastip.form.variant_name_ph")} />
                                                {err(`variants.${vi}.value`)}
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t("jastip.form.variant_stock")}<Req /></label>
                                                <Input type="number" size="sm" min="0" value={v.stock} onChange={(e) => updateVariant(vi, "stock", e.target.value)} placeholder="0" />
                                                {err(`variants.${vi}.stock`)}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className={labelClass}>{t("jastip.form.additional_price")}</label>
                                                <Input type="number" size="sm" min="0" leftAddon="Rp" value={v.price} onChange={(e) => updateVariant(vi, "price", e.target.value)} placeholder="0" />
                                            </div>
                                            <div>
                                                <label className={labelClass}>{t("jastip.form.variant_min_buy")}</label>
                                                <Input type="number" size="sm" min="1" value={v.min_buy} onChange={(e) => updateVariant(vi, "min_buy", e.target.value)} placeholder="1" />
                                            </div>
                                        </div>
                                    </div>

                                    {data.variants.length > 1 && (
                                        <button type="button" onClick={() => removeVariant(vi)} className="h-fit rounded-lg bg-red-50 p-2.5 text-red-500 transition hover:bg-red-100">
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Gambar Produk */}
            <div className={card}>
                <h3 className={cardTitle}>{t("jastip.form.images")}</h3>
                <div className="flex flex-wrap gap-3">
                    <label className="flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition hover:border-primary-700 hover:text-primary-700">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
                        <FiImage size={24} className="mb-1" />
                        <span className="text-xs font-medium">{t("jastip.form.upload")}</span>
                    </label>

                    {existingImages.map((img) => (
                        <div key={`ex-${img.id}`} className="relative h-32 w-32 overflow-hidden rounded-xl border border-neutral-200">
                            <img src={img.url} alt="" className="h-full w-full object-cover" />
                            <button type="button" onClick={() => onRemoveExisting?.(img.id)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80">
                                <FiX size={13} />
                            </button>
                        </div>
                    ))}

                    {previews.map((p, idx) => (
                        <div key={`new-${idx}`} className="relative h-32 w-32 overflow-hidden rounded-xl border border-neutral-200">
                            <img src={p.url} alt="" className="h-full w-full object-cover" />
                            <button type="button" onClick={() => removeNewImage(idx)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80">
                                <FiX size={13} />
                            </button>
                        </div>
                    ))}
                </div>
                {err("images")}
            </div>

            {/* Aksi — #14: hanya simpan draft. Publish dilakukan dari kartu di halaman manajemen. */}
            <div className="flex flex-col gap-2 pb-2">
                <div className="flex items-center justify-end">
                    <Button
                        type="primary"
                        rounded={false}
                        disabled={processing}
                        onClick={onSaveDraft}
                        className="rounded-xl px-8 font-semibold"
                    >
                        {processing ? t("common.processing") : t("jastip.form.save_draft")}
                    </Button>
                </div>
                <p className="text-right text-xs text-neutral-400">{t("jastip.form.publish_note")}</p>
            </div>
        </div>
    );
}
