import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import EmptyState from "@/Components/EmptyState";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft, FiUsers, FiUserX } from "react-icons/fi";

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

export default function Participants({ trip, participants = [] }) {
    const { t } = useTranslation();
    const [kickingId, setKickingId] = useState(null);

    const kick = (p) => {
        const msg = t("admin.trip.kick_confirm")
            .replace(":name", p.name)
            .replace(":amount", new Intl.NumberFormat("id-ID").format(Math.round(p.total_paid || 0)));
        if (!window.confirm(msg)) return;

        setKickingId(p.user_id);
        router.delete(`/admin/trip/${trip.id}/participants/${p.user_id}`, {
            preserveScroll: true,
            onFinish: () => setKickingId(null),
        });
    };

    return (
        <>
            <Head title={`${t("admin.trip.participants_title")} - ${trip.name}`} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/admin/trip"
                    className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
                >
                    <FiChevronLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-700">{t("admin.trip.participants_title")}</h1>
                    <p className="text-neutral-500 text-sm">{t("admin.trip.participants_subtitle")}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                <div className="p-5 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-neutral-700">{trip.name}</h2>
                        <p className="text-sm text-neutral-500">{trip.location}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold text-primary-700">
                            {trip.joined}/{trip.capacity} {t("admin.pergi.requests.seats_filled_suffix")}
                        </p>
                        <p className="text-xs text-neutral-400">
                            {t("admin.pergi.requests.remaining_prefix")} {trip.remaining} {t("admin.trip.seats_suffix")}
                        </p>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    {participants.length === 0 ? (
                        <EmptyState
                            icon={<FiUsers size={30} />}
                            title={t("admin.trip.participants_empty_title")}
                            description={t("admin.trip.participants_empty_desc")}
                        />
                    ) : (
                        <div className="space-y-3">
                            {participants.map((p) => (
                                <div
                                    key={p.user_id}
                                    className="flex items-center justify-between gap-4 p-4 border border-neutral-100 rounded-xl hover:bg-neutral-50/60 transition"
                                >
                                    {p.username ? (
                                        <Link href={`/forum/users/${p.username}`} className="flex items-center gap-3 min-w-0">
                                            <img src={p.avatar} alt={p.name} className="w-11 h-11 rounded-full object-cover border border-neutral-200" onError={(e) => (e.target.src = "/assets/default-profile.png")} />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-neutral-700 text-sm truncate">{p.name}</p>
                                                <p className="text-xs text-neutral-500">
                                                    {p.seats} {t("admin.trip.seats_suffix")} • {t("admin.trip.paid_label")} {rupiah(p.total_paid)}
                                                </p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 min-w-0">
                                            <img src={p.avatar} alt={p.name} className="w-11 h-11 rounded-full object-cover border border-neutral-200" onError={(e) => (e.target.src = "/assets/default-profile.png")} />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-neutral-700 text-sm truncate">{p.name}</p>
                                                <p className="text-xs text-neutral-500">
                                                    {p.seats} {t("admin.trip.seats_suffix")} • {t("admin.trip.paid_label")} {rupiah(p.total_paid)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => kick(p)}
                                        disabled={kickingId === p.user_id}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                                        title={t("admin.trip.kick")}
                                    >
                                        <FiUserX size={16} /> {t("admin.trip.kick")}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Participants.layout = (page) => (
    <AdminLayout title="Dasbor - Home">
        {page}
    </AdminLayout>
);
