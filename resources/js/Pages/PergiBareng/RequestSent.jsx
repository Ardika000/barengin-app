import React from "react";
import { Head } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import { useTranslation } from "@/lib/useTranslation";
import { FaRegClock, FaCalendarAlt } from "react-icons/fa";
import { DEFAULT_IMAGE } from "@/lib/images";

export default function RequestSent({ trip }) {
    const { t } = useTranslation();
    return (
        <MainLayout>
            <Head title="Permintaan Terkirim" />

            <Container className="py-16 flex flex-col items-center justify-center min-h-[70vh]">

                {/* Ikon Jam (menunggu persetujuan) */}
                <div className="w-20 h-20 bg-warning-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-warning-200">
                    <FaRegClock className="text-3xl" />
                </div>

                <h1 className="text-3xl font-bold text-neutral-700 mb-2">{t("pb.request.title")}</h1>
                <p className="text-neutral-600 mb-8 text-center max-w-md">
                    {t("pb.request.subtitle")}
                </p>

                {/* Card Summary */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-6 w-full max-w-md shadow-sm mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-neutral-500">Pergi Bareng ID</p>
                            <p className="font-bold text-neutral-700">{trip.trip_id}</p>
                        </div>
                        <span className="bg-warning-100 text-warning-700 text-xs font-semibold px-2 py-1 rounded">
                            {t("pb.request.pending_badge")}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        <img
                            src={trip.img_name ? `/storage/${trip.img_name}` : DEFAULT_IMAGE}
                            className="w-14 h-14 rounded-lg object-cover"
                            alt={trip.title}
                            onError={(e) => (e.target.src = DEFAULT_IMAGE)}
                        />
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-neutral-700">{trip.title}</h4>
                            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                                <FaCalendarAlt /> {trip.date}
                            </p>
                        </div>
                        <div className="font-bold text-neutral-700">{trip.requested_quantity}x</div>
                    </div>
                </div>

                {/* Tombol Aksi */}
                <div className="w-full max-w-md">
                    <Button
                        isButtonLink
                        href={`/pergi-bareng/${trip.id}`}
                        type="primary"
                        className="w-full justify-center"
                    >
                        {t("pb.request.back_detail")}
                    </Button>
                </div>

            </Container>
        </MainLayout>
    );
}
