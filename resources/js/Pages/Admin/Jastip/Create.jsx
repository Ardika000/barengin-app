import React from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import JastipForm, { emptyVariant } from "./Partials/JastipForm";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft } from "react-icons/fi";

export default function Create({ categories = [] }) {
    const { t } = useTranslation();

    const form = useForm({
        name: "",
        jastip_category_id: "",
        description: "",
        pickup_province: "",
        pickup_city: "",
        pickup_address: "",
        purchase_province: "",
        purchase_city: "",
        purchase_address: "",
        base_price: "",
        jastip_fee: "",
        has_variants: false,
        max_slot: "",
        min_buy: "1",
        // Kosong saat awal; varian "Original" dibuat otomatis saat checkbox dicentang (#9)
        variants: [],
        start_date: "",
        end_date: "",
        pickup_start_date: "",
        pickup_end_date: "",
        images: [],
        removed_images: [],
        publish: 0,
    });

    // #14: form hanya menyimpan draft; publish dilakukan dari halaman manajemen.
    const saveDraft = () => {
        form.transform((d) => ({
            ...d,
            publish: 0,
            has_variants: d.has_variants ? 1 : 0,
            // Kirim varian hanya bila diaktifkan (hindari validasi baris kosong)
            variants: d.has_variants ? d.variants : [],
        }));
        form.post("/admin/jastip", { forceFormData: true });
    };

    return (
        <>
            <Head title="Tambah Jastip" />
            <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center gap-3">
                    <Link href="/admin/jastip" className="rounded-lg border border-neutral-200 p-2 text-neutral-500 transition hover:bg-neutral-50">
                        <FiChevronLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-700">{t("jastip.create_title")}</h1>
                        <p className="text-sm text-neutral-500">{t("jastip.create_subtitle")}</p>
                    </div>
                </div>
            </div>

            <JastipForm
                data={form.data}
                setData={form.setData}
                errors={form.errors}
                processing={form.processing}
                categories={categories}
                autoLocate
                onSaveDraft={saveDraft}
            />
        </>
    );
}

Create.layout = (page) => (
    <AdminLayout title="Manajemen Jastip">
        {page}
    </AdminLayout>
);
