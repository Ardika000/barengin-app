import React from "react";
import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useTranslation } from "@/lib/useTranslation";
import { FaSuitcase } from "react-icons/fa6";
import { FiUsers, FiCheckCircle, FiDollarSign } from "react-icons/fi";

function StatCard({ icon, label, value }) {
    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            <div className="flex items-center gap-2 text-neutral-500 text-sm mb-2">
                <span className="text-primary-700">{icon}</span> {label}
            </div>
            <p className="text-2xl font-bold text-neutral-700">{value}</p>
        </div>
    );
}

export default function Analytics({ stats }) {
    const { t } = useTranslation();
    const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{t("admin.trip.analytics_title")}</h1>
                <p className="text-neutral-500 text-sm">{t("admin.trip.analytics_subtitle")}</p>
            </div>
            <div className="space-y-6">
                <Head title="Analitik Trip" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<FaSuitcase />} label={t("admin.trip.stat_total_trips")} value={stats.total_trips} />
                    <StatCard icon={<FiCheckCircle />} label={t("admin.trip.stat_published")} value={stats.published} />
                    <StatCard icon={<FiUsers />} label={t("admin.trip.stat_participants")} value={stats.participants} />
                    <StatCard icon={<FiDollarSign />} label={t("admin.trip.stat_revenue")} value={rupiah(stats.revenue)} />
                </div>
                <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 text-center text-neutral-400 text-sm">
                    {t("admin.trip.chart_placeholder")}
                </div>
            </div>
        </>
    );
}

Analytics.layout = (page) => (
    <AdminLayout title="Dasbor - Home">
        {page}
    </AdminLayout>
);
