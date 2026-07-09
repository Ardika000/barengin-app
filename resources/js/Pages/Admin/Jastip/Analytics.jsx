import React from "react";
import { Head, Link } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import SalesChart from "@/Components/SalesChart";
import AccountPerformanceCard from "@/Components/AccountPerformanceCard";
import { useTranslation } from "@/lib/useTranslation";
import { FiShoppingCart, FiTrendingUp, FiUsers, FiStar } from "react-icons/fi";

function StatCard({ icon, label, value, suffix }) {
    return (
        <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                <span className="text-primary-700">{icon}</span> {label}
            </div>
            <p className="text-2xl font-bold text-neutral-700">
                {value}
                {suffix && <span className="ml-1 text-sm font-medium text-neutral-400">{suffix}</span>}
            </p>
        </div>
    );
}

const FALLBACK_IMG = "/assets/default-image.png";

export default function Analytics({ stats, monthly = [], bestSeller, rating }) {
    const { t } = useTranslation();
    const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

    return (
        <>
            <Head title="Analitik Jastip" />
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{t("jastip.analytics_title")}</h1>
                <p className="text-sm text-neutral-500">{t("jastip.analytics_subtitle")}</p>
            </div>

            <div className="space-y-6">
                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={<FiShoppingCart />} label={t("jastip.stat_products_sold")} value={Number(stats.products_sold).toLocaleString("id-ID")} />
                    <StatCard icon={<FiTrendingUp />} label={t("jastip.stat_revenue")} value={rupiah(stats.revenue)} />
                    <StatCard icon={<FiUsers />} label={t("jastip.stat_customers")} value={Number(stats.customers).toLocaleString("id-ID")} />
                    <StatCard icon={<FiStar />} label={t("jastip.stat_rating")} value={Number(stats.rating).toFixed(2)} suffix="/ 5.0" />
                </div>

                {/* Chart + best seller */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-bold text-primary-700">{t("jastip.monthly_sales")}</h3>
                            <span className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">{t("jastip.last_6_months")}</span>
                        </div>
                        <SalesChart data={monthly} />
                        <p className="mt-3 text-center text-xs text-neutral-400">{t("jastip.chart_caption")}</p>
                    </div>

                    {/* Paling Laku Terjual */}
                    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-4 font-bold text-primary-700">{t("jastip.best_seller")}</h3>
                        {bestSeller ? (
                            <div>
                                <div className="relative mb-3 h-44 overflow-hidden rounded-xl bg-neutral-100">
                                    <img
                                        src={bestSeller.image || FALLBACK_IMG}
                                        alt={bestSeller.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.target.src = FALLBACK_IMG; }}
                                    />
                                    {bestSeller.status === "sold_out" && (
                                        <span className="absolute right-2.5 top-2.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm">
                                            {t("jastip.status.sold_out")}
                                        </span>
                                    )}
                                </div>
                                <h4 className="truncate font-bold text-neutral-800">{bestSeller.name}</h4>
                                <p className="mb-3 truncate text-xs text-neutral-500">{bestSeller.category}</p>

                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="text-neutral-500">{t("jastip.progress")}</span>
                                    <span className="font-semibold text-primary-700">{bestSeller.sold}/{bestSeller.max_slot} {t("jastip.sold")}</span>
                                </div>
                                <div className="mb-4 h-2 overflow-hidden rounded-full bg-neutral-100">
                                    <div className="h-full rounded-full bg-primary-700" style={{ width: `${bestSeller.max_slot > 0 ? Math.min(100, (bestSeller.sold / bestSeller.max_slot) * 100) : 0}%` }} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-neutral-900">{rupiah(bestSeller.total_price)}</span>
                                    <Link href={`/admin/jastip/${bestSeller.id}/edit`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">
                                        {t("jastip.detail")} <span aria-hidden>↗</span>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-12 text-center">
                                <FiShoppingCart size={28} className="mb-2 text-neutral-300" />
                                <p className="text-sm font-semibold text-neutral-600">{t("jastip.no_products")}</p>
                                <p className="mt-1 max-w-[200px] text-xs text-neutral-400">{t("jastip.no_products_desc")}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Performa akun jastiper (ring rating + distribusi + ulasan) */}
                <AccountPerformanceCard rating={rating} />
            </div>
        </>
    );
}

Analytics.layout = (page) => (
    <AdminLayout title="Manajemen Jastip">
        {page}
    </AdminLayout>
);
