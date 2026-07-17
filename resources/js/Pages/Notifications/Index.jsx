import { Head, router } from "@inertiajs/react";
import {
    FaCarSide,
    FaReceipt,
    FaRegBell,
    FaStore,
    FaUsers,
    FaWallet,
} from "react-icons/fa";
import { FiCheckCircle, FiInbox } from "react-icons/fi";
import { MdOutlineDoneAll } from "react-icons/md";

import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import EmptyState from "@/Components/EmptyState";
import Pagination from "@/Components/Pagination";
import { useTranslation } from "@/lib/useTranslation";
import {
    formatNotification,
    notificationIconKey,
} from "@/lib/notificationText";

// Ikon per kategori — dipisah dari komponen agar tidak dibuat ulang tiap render.
const ICONS = {
    pergi_bareng: FaCarSide,
    group: FaUsers,
    order: FaReceipt,
    payment: FiCheckCircle,
    split_bill: FaWallet,
    jastip_request: FiInbox,
    selling: FaStore,
    default: FaRegBell,
};

function NotificationRow({ notification }) {
    const { t } = useTranslation();
    const { title, body } = formatNotification(t, notification);
    const Icon = ICONS[notificationIconKey(notification.type)] ?? ICONS.default;

    const unread = !notification.is_read;

    // Membuka notifikasi = menandainya terbaca lalu meneruskan ke sumbernya.
    // Yang sudah terbaca cukup diteruskan tanpa request tambahan.
    const open = () => {
        const go = () => {
            if (notification.url) router.visit(notification.url);
        };

        if (!unread) {
            go();
            return;
        }

        router.post(
            `/notifications/${notification.id}/read`,
            {},
            { preserveScroll: true, preserveState: true, onFinish: go },
        );
    };

    return (
        <button
            type="button"
            onClick={open}
            className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
                unread
                    ? "border-primary-100 bg-primary-50/50 hover:bg-primary-50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
            }`}
        >
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    unread
                        ? "bg-primary-100 text-primary-700"
                        : "bg-neutral-100 text-neutral-500"
                }`}
            >
                <Icon size={18} />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                    <p
                        className={`min-w-0 flex-1 text-sm ${
                            unread
                                ? "font-bold text-neutral-900"
                                : "font-semibold text-neutral-700"
                        }`}
                    >
                        {title}
                    </p>
                    {unread ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
                    ) : null}
                </div>

                <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">
                    {body}
                </p>
                <p className="mt-1.5 text-xs text-neutral-400">
                    {notification.time_label}
                </p>
            </div>
        </button>
    );
}

export default function Notifications({
    notifications,
    filter = "all",
    unread_count = 0,
}) {
    const { t } = useTranslation();

    const goToFilter = (next) => {
        router.get(
            "/notifications",
            next === "unread" ? { filter: "unread" } : {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const goToPage = (page) => {
        const params = { page };
        if (filter === "unread") params.filter = "unread";
        router.get("/notifications", params, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const markAllRead = () =>
        router.post(
            "/notifications/read-all",
            {},
            { preserveScroll: true },
        );

    const isEmpty = (notifications?.data?.length ?? 0) === 0;

    return (
        <Container className="min-h-screen py-8">
            <Head title={t("notif.title")} />

            <div className="mx-auto max-w-3xl">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">
                            {t("notif.title")}
                        </h1>
                        <p className="mt-1 text-sm text-neutral-500">
                            {t("notif.subtitle")}
                        </p>
                    </div>

                    {unread_count > 0 ? (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
                        >
                            <MdOutlineDoneAll size={16} />
                            {t("notif.mark_all_read")}
                        </button>
                    ) : null}
                </div>

                <div className="mb-5 flex gap-2">
                    {[
                        { key: "all", label: t("notif.filter_all") },
                        { key: "unread", label: t("notif.filter_unread") },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => goToFilter(tab.key)}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                filter === tab.key
                                    ? "bg-primary-700 text-white"
                                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            }`}
                        >
                            {tab.label}
                            {tab.key === "unread" && unread_count > 0
                                ? ` (${unread_count})`
                                : ""}
                        </button>
                    ))}
                </div>

                {isEmpty ? (
                    <div className="rounded-3xl border border-neutral-200 bg-white">
                        <EmptyState
                            icon={<FaRegBell size={28} />}
                            title={
                                filter === "unread"
                                    ? t("notif.empty_unread_title")
                                    : t("notif.empty_title")
                            }
                            description={
                                filter === "unread"
                                    ? t("notif.empty_unread_desc")
                                    : t("notif.empty_desc")
                            }
                        />
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {notifications.data.map((n) => (
                                <NotificationRow key={n.id} notification={n} />
                            ))}
                        </div>

                        {notifications.last_page > 1 && (
                            <Pagination
                                className="mt-8"
                                currentPage={notifications.current_page}
                                totalPages={notifications.last_page}
                                onPageChange={goToPage}
                            />
                        )}
                    </>
                )}
            </div>
        </Container>
    );
}

Notifications.layout = (page) => <MainLayout children={page} />;
