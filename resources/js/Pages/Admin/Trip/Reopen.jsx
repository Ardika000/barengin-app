import React from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft } from "react-icons/fi";
import TripForm, { emptyActivity } from "./Partials/TripForm";

// "Buka ulang" trip yang sudah selesai: memakai form create/edit penuh sehingga
// jastiper bisa mengubah data (deskripsi, kuota, harga, aktivitas, gambar) - KECUALI
// nama & lokasi perjalanan yang dikunci. Tanggal sengaja dikosongkan agar diisi baru.
export default function Reopen({ trip, facilities = [] }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        name: trip.name || "",
        location: trip.location || "",
        description: trip.description || "",
        people_amount: trip.people_amount ?? "",
        start_date: "",
        end_date: "",
        price: trip.price ?? "",
        image: null,
        image_preview: trip.image || null,
        facilities: trip.facilities || [],
        activities: (trip.activities && trip.activities.length > 0)
            ? trip.activities.map((a) => ({
                name: a.name || "",
                date: "",
                start_time: a.start_time || "",
                end_time: a.end_time || "",
                description: a.description || "",
                images: [],
                existing_images: a.existing_images || [],
            }))
            : [emptyActivity()],
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/admin/trip/${trip.id}/retrip`, { forceFormData: true });
    };

    return (
        <>
            <Head title={t("admin.trip.reopen_title")} />
            <div className="mb-6 flex items-center gap-3">
                <Link href="/admin/trip" className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition">
                    <FiChevronLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-700">{t("admin.trip.reopen_title")}</h1>
                    <p className="text-neutral-500 text-sm">{t("admin.trip.reopen_subtitle")}</p>
                </div>
            </div>
            <TripForm
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                onSubmit={submit}
                submitLabel={t("admin.trip.reopen_confirm")}
                facilities={facilities}
                imageRequired={false}
                lockedFields={["name", "location"]}
            />
        </>
    );
}

Reopen.layout = (page) => (
    <AdminLayout title="Dasbor - Home">
        {page}
    </AdminLayout>
);
