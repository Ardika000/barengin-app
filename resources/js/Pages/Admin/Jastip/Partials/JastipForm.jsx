import React, { useEffect, useState } from "react";
import Button from "@/Components/Button";
import Input from "@/Components/Input";
import Checkbox from "@/Components/Checkbox";
import SearchSelect from "@/Components/SearchSelect";
import PlaceAutocomplete from "@/Components/PlaceAutocomplete";
import { useTranslation } from "@/lib/useTranslation";
import { toast } from "@/lib/toast";
import { INDONESIA_PROVINCES } from "@/lib/indonesiaProvinces";
import { regenciesOf } from "@/lib/indonesiaRegencies";
import { COUNTRIES, countryCodeOf } from "@/lib/countries";
import { FiPlus, FiX, FiTrash2, FiImage, FiMapPin, FiShoppingBag } from "react-icons/fi";

// Batas ukuran gambar 5MB (sesuai validasi backend).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// #13: penanda kolom wajib
const Req = () => <span className="text-red-500"> *</span>;

// Opsi lokasi pembelian: provinsi Indonesia (untuk beli domestik) + negara (luar negeri).
const PURCHASE_ORIGIN_OPTIONS = [...INDONESIA_PROVINCES, ...COUNTRIES];

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
    imageRequired = true,
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

    // ── Cascade lokasi: kota harus milik provinsi terpilih ──
    const pickupCities = regenciesOf(data.pickup_province);
    // Lokasi pembelian: bila memilih provinsi Indonesia, kota diambil dari dataset;
    // bila memilih negara luar, kota jadi input bebas (tak ada dataset kota luar negeri).
    const purchaseIsProvince = INDONESIA_PROVINCES.includes(data.purchase_province);
    const purchaseCities = purchaseIsProvince ? regenciesOf(data.purchase_province) : [];

    // Ganti provinsi ambil → kosongkan kota jika tak lagi cocok dengan provinsinya.
    const setPickupProvince = (prov) =>
        setData((d) => {
            const cities = regenciesOf(prov);
            const keepCity = d.pickup_city && cities.includes(d.pickup_city);
            return { ...d, pickup_province: prov, pickup_city: keepCity ? d.pickup_city : "" };
        });

    // Ganti negara/provinsi pembelian → kosongkan kota jika tak lagi cocok.
    const setPurchaseOrigin = (val) =>
        setData((d) => {
            const cities = INDONESIA_PROVINCES.includes(val) ? regenciesOf(val) : [];
            const keepCity = d.purchase_city && cities.includes(d.purchase_city);
            return { ...d, purchase_province: val, purchase_city: keepCity ? d.purchase_city : "" };
        });

    // ── Varian ──
    const updateVariant = (i, field, value) =>
        setData("variants", data.variants.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));
    const addVariant = () => setData("variants", [...data.variants, emptyVariant()]);
    const removeVariant = (i) => setData("variants", data.variants.filter((_, idx) => idx !== i));
    const setVariantImage = (i, file) => {
        if (!file) return;
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error(t("jastip.form.image_too_large"));
            return;
        }
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
        // #: tolak gambar > 5MB dan beri notifikasi error.
        const ok = files.filter((f) => f.size <= MAX_IMAGE_BYTES);
        if (ok.length < files.length) {
            toast.error(t("jastip.form.image_too_large"));
        }
        if (!ok.length) return;
        setData("images", [...(data.images || []), ...ok]);
        setPreviews((prev) => [...prev, ...ok.map((f) => ({ url: URL.createObjectURL(f), file: f }))]);
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
                                <label className={labelClass}>{t("jastip.form.province")}<Req /></label>
                                <SearchSelect
                                    value={data.pickup_province || ""}
                                    onChange={setPickupProvince}
                                    options={INDONESIA_PROVINCES}
                                    placeholder={t("jastip.form.province_ph")}
                                />
                                {err("pickup_province")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.city")}</label>
                                <SearchSelect
                                    value={data.pickup_city || ""}
                                    onChange={(v) => setData("pickup_city", v)}
                                    options={pickupCities}
                                    disabled={!data.pickup_province}
                                    disabledText={t("jastip.form.pick_province_first")}
                                    allowCustom={Boolean(data.pickup_province) && pickupCities.length === 0}
                                    placeholder={t("jastip.form.city_select_ph")}
                                />
                                {err("pickup_city")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.pickup_address")}<Req /></label>
                                <PlaceAutocomplete
                                    value={data.pickup_address || ""}
                                    onChange={(v) => setData("pickup_address", v)}
                                    placeholder={t("jastip.form.pickup_address_ph")}
                                    fullAddress
                                    countryCodes="id"
                                    contextSuffix={[data.pickup_city, data.pickup_province].filter(Boolean).join(", ")}
                                />
                                {err("pickup_address")}
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
                                <label className={labelClass}>{t("jastip.form.purchase_region")}<Req /></label>
                                <SearchSelect
                                    value={data.purchase_province || ""}
                                    onChange={setPurchaseOrigin}
                                    options={PURCHASE_ORIGIN_OPTIONS}
                                    placeholder={t("jastip.form.origin_select_ph")}
                                />
                                {err("purchase_province")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.city")}</label>
                                {purchaseIsProvince ? (
                                    // Provinsi Indonesia → daftar kota/kabupaten dari dataset.
                                    <SearchSelect
                                        value={data.purchase_city || ""}
                                        onChange={(v) => setData("purchase_city", v)}
                                        options={purchaseCities}
                                        allowCustom={purchaseCities.length === 0}
                                        placeholder={t("jastip.form.city_select_ph")}
                                    />
                                ) : data.purchase_province ? (
                                    // Negara luar → cari kota via Nominatim, dibatasi hanya negara itu.
                                    <PlaceAutocomplete
                                        value={data.purchase_city || ""}
                                        onChange={(v) => setData("purchase_city", v)}
                                        placeholder={t("jastip.form.purchase_city_ph")}
                                        countryCodes={countryCodeOf(data.purchase_province) || ""}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value=""
                                        disabled
                                        placeholder={t("jastip.form.purchase_city_ph")}
                                        className={inputClass + " cursor-not-allowed bg-neutral-50 text-neutral-400"}
                                    />
                                )}
                                {err("purchase_city")}
                            </div>
                            <div>
                                <label className={labelClass}>{t("jastip.form.purchase_address")}</label>
                                {data.purchase_province ? (
                                    <PlaceAutocomplete
                                        value={data.purchase_address || ""}
                                        onChange={(v) => setData("purchase_address", v)}
                                        placeholder={t("jastip.form.purchase_address_ph")}
                                        countryCodes={purchaseIsProvince ? "id" : (countryCodeOf(data.purchase_province) || "")}
                                        contextSuffix={[data.purchase_city, data.purchase_province].filter(Boolean).join(", ")}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value=""
                                        disabled
                                        placeholder={t("jastip.form.purchase_address_ph")}
                                        className={inputClass + " cursor-not-allowed bg-neutral-50 text-neutral-400"}
                                    />
                                )}
                                {err("purchase_address")}
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
                        <label className={labelClass}>{t("jastip.form.start_date")}<Req /></label>
                        <Input type="date" size="sm" value={data.start_date} onChange={(e) => setData("start_date", e.target.value)} />
                        {err("start_date")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.form.end_date")}<Req /></label>
                        <Input type="date" size="sm" min={data.start_date || undefined} value={data.end_date} onChange={(e) => setData("end_date", e.target.value)} />
                        {err("end_date")}
                    </div>
                </div>

                {/* #7: jendela pengambilan barang oleh pembeli */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className={labelClass}>{t("jastip.form.pickup_start_date")}<Req /></label>
                        <Input type="date" size="sm" min={data.end_date || undefined} value={data.pickup_start_date} onChange={(e) => setData("pickup_start_date", e.target.value)} />
                        {err("pickup_start_date")}
                    </div>
                    <div>
                        <label className={labelClass}>{t("jastip.form.pickup_end_date")}<Req /></label>
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

                {/* Terima request titipan di luar katalog untuk item ini */}
                <div className="mt-4 rounded-xl border border-dashed border-primary-200 bg-primary-50/50 p-4">
                    <Checkbox
                        id="allow_requests"
                        checked={Boolean(data.allow_requests)}
                        onChange={(checked) => setData("allow_requests", checked)}
                        label={t("jastip.form.allow_requests")}
                        labelClassName="font-semibold"
                    />
                    <p className="mt-1 pl-6 text-xs text-neutral-400">{t("jastip.form.allow_requests_hint")}</p>
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
                <h3 className={cardTitle}>{t("jastip.form.images")}{imageRequired && <Req />}</h3>
                <p className="-mt-2 mb-4 text-xs text-neutral-400">{t("jastip.form.image_size_note")}</p>
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
