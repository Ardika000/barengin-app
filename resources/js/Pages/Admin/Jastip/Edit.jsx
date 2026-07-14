import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import JastipForm, { emptyVariant } from "./Partials/JastipForm";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft } from "react-icons/fi";

export default function Edit({ item, categories = [] }) {
    const { t } = useTranslation();
    const [existingImages, setExistingImages] = useState(item.existing_images || []);

    const form = useForm({
        name: item.name || "",
        jastip_category_id: item.jastip_category_id || "",
        description: item.description || "",
        pickup_province: item.pickup_province || "",
        pickup_city: item.pickup_city || "",
        pickup_address: item.pickup_address || "",
        purchase_province: item.purchase_province || "",
        purchase_city: item.purchase_city || "",
        purchase_address: item.purchase_address || "",
        base_price: item.base_price ?? "",
        jastip_fee: item.jastip_fee ?? "",
        has_variants: Boolean(item.has_variants),
        allow_requests: Boolean(item.allow_requests),
        max_slot: item.max_slot ?? "",
        min_buy: item.min_buy ?? "1",
        variants: item.variants?.length
            ? item.variants.map((v) => ({
                value: v.value || "",
                price: v.price ?? "",
                stock: v.stock ?? "",
                min_buy: v.min_buy ?? "1",
                image: null,
                image_url: v.image_url || null,
                image_name: v.image_name || null,
            }))
            : [emptyVariant()],
        start_date: item.start_date || "",
        end_date: item.end_date || "",
        pickup_start_date: item.pickup_start_date || "",
        pickup_end_date: item.pickup_end_date || "",
        images: [],
        removed_images: [],
        publish: item.status === "published" ? 1 : 0,
    });

    const removeExisting = (id) => {
        setExistingImages((prev) => prev.filter((img) => img.id !== id));
        form.setData("removed_images", [...form.data.removed_images, id]);
    };

    // #14: hanya menyimpan sebagai draft; publish dari halaman manajemen.
    const saveDraft = () => {
        form.transform((d) => ({
            ...d,
            publish: 0,
            has_variants: d.has_variants ? 1 : 0,
            allow_requests: d.allow_requests ? 1 : 0,
            variants: d.has_variants ? d.variants : [],
        }));
        form.post(`/admin/jastip/${item.id}`, { forceFormData: true });
    };

    return (
        <>
            <Head title="Edit Jastip" />
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/admin/jastip" className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-50">
                        <FiChevronLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-700">{t("jastip.edit_title")}</h1>
                        <p className="text-sm text-neutral-500">{t("jastip.edit_subtitle")}</p>
                    </div>
                </div>
            </div>

            <JastipForm
                data={form.data}
                setData={form.setData}
                errors={form.errors}
                processing={form.processing}
                categories={categories}
                existingImages={existingImages}
                onRemoveExisting={removeExisting}
                onSaveDraft={saveDraft}
                imageRequired={false}
            />
        </>
    );
}

Edit.layout = (page) => (
    <AdminLayout title="Manajemen Jastip">
        {page}
    </AdminLayout>
);
