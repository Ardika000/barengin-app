import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import EmptyState from "@/Components/EmptyState";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft, FiCheck, FiX, FiInbox, FiUserX, FiUsers } from "react-icons/fi";

export default function Requests({ trip, requests = [], participants = [] }) {
    const { t } = useTranslation();
    const [busyId, setBusyId] = useState(null);
    const [kickingId, setKickingId] = useState(null);

    const approve = (id) => {
        setBusyId(id);
        router.post(
            `/admin/pergi-bareng/${trip.id}/requests/${id}/approve`,
            {},
            { preserveScroll: true, onFinish: () => setBusyId(null) },
        );
    };

    const reject = (id) => {
        setBusyId(id);
        router.delete(`/admin/pergi-bareng/${trip.id}/requests/${id}`, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    const kick = (p) => {
        if (
            !window.confirm(
                t("admin.pergi.kick_confirm").replace(":name", p.name),
            )
        ) {
            return;
        }
        setKickingId(p.user_id);
        router.delete(
            `/admin/pergi-bareng/${trip.id}/participants/${p.user_id}`,
            {
                preserveScroll: true,
                onFinish: () => setKickingId(null),
            },
        );
    };

    return (
        <>
            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/admin/pergi-bareng"
                    className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
                >
                    <FiChevronLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-neutral-700">{t("admin.pergi.requests_title")}</h1>
                    <p className="text-neutral-500 text-sm">{t("admin.pergi.requests_subtitle")}</p>
                </div>
            </div>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <Head title={`Permintaan - ${trip.name}`} />

            <div className="p-5 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="text-xs text-neutral-400 font-medium">{trip.code}</p>
                    <h2 className="text-lg font-bold text-neutral-700">{trip.name}</h2>
                    <p className="text-sm text-neutral-500">{trip.destination}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-primary-700">{trip.joined}/{trip.capacity} {t("admin.pergi.requests.seats_filled_suffix")}</p>
                    <p className="text-xs text-neutral-400">{t("admin.pergi.requests.remaining_prefix")} {trip.remaining} {t("admin.pergi.requests.seats_word")}</p>
                </div>
            </div>

            <div className="p-4 sm:p-6">
                {requests.length === 0 ? (
                    <EmptyState
                        icon={<FiInbox size={30} />}
                        title={t("admin.pergi.requests.empty_title")}
                        description={t("admin.pergi.requests.empty_desc")}
                    />
                ) : (
                    <div className="space-y-3">
                        {requests.map((req) => {
                            const overQuota = req.quantity > trip.remaining;
                            return (
                                <div
                                    key={req.id}
                                    className="flex items-center justify-between gap-4 p-4 border border-neutral-100 rounded-xl hover:bg-neutral-50/60 transition"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img
                                            src={req.user.avatar}
                                            alt={req.user.name}
                                            className="w-11 h-11 rounded-full object-cover border border-neutral-200"
                                            onError={(e) => (e.target.src = "/assets/default-profile.png")}
                                        />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-neutral-700 text-sm truncate">{req.user.name}</p>
                                            <p className="text-xs text-neutral-500">
                                                {t("admin.pergi.requests.requesting_prefix")} <span className="font-semibold text-primary-700">{req.quantity} {t("admin.pergi.requests.seats_word")}</span>
                                                {req.requested_at ? ` • ${req.requested_at}` : ""}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {overQuota && (
                                            <span className="text-xs text-red-500 font-medium hidden sm:inline">{t("admin.pergi.requests.over_quota")}</span>
                                        )}
                                        <button
                                            onClick={() => approve(req.id)}
                                            disabled={busyId === req.id || overQuota}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={overQuota ? t("admin.pergi.requests.quota_insufficient_title") : t("admin.pergi.requests.approve")}
                                        >
                                            <FiCheck size={16} /> {t("admin.pergi.requests.approve")}
                                        </button>
                                        <button
                                            onClick={() => reject(req.id)}
                                            disabled={busyId === req.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                                            title={t("admin.pergi.requests.reject")}
                                        >
                                            <FiX size={16} /> {t("admin.pergi.requests.reject")}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Daftar peserta yang sudah bergabung — bisa dikeluarkan */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden mt-6">
            <div className="p-5 border-b border-neutral-100 flex items-center gap-2">
                <span className="p-1.5 bg-neutral-100 rounded-md"><FiUsers className="text-neutral-600" size={16} /></span>
                <h2 className="text-lg font-bold text-neutral-700">{t("admin.pergi.participants_title")}</h2>
            </div>

            <div className="p-4 sm:p-6">
                {participants.length === 0 ? (
                    <EmptyState
                        icon={<FiUsers size={30} />}
                        title={t("admin.pergi.participants_empty")}
                        description=""
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
                                            <p className="text-xs text-neutral-500">{p.quantity} {t("admin.pergi.seats_suffix")}</p>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img src={p.avatar} alt={p.name} className="w-11 h-11 rounded-full object-cover border border-neutral-200" onError={(e) => (e.target.src = "/assets/default-profile.png")} />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-neutral-700 text-sm truncate">{p.name}</p>
                                            <p className="text-xs text-neutral-500">{p.quantity} {t("admin.pergi.seats_suffix")}</p>
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => kick(p)}
                                    disabled={kickingId === p.user_id}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                                    title={t("admin.pergi.kick")}
                                >
                                    <FiUserX size={16} /> {t("admin.pergi.kick")}
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

Requests.layout = (page) => (
    <AdminLayout title="Dasbor - Home">
        {page}
    </AdminLayout>
);
