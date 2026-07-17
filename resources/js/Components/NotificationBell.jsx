import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, usePage } from "@inertiajs/react";
import { FaRegBell } from "react-icons/fa";
import { useTranslation } from "@/lib/useTranslation";

/**
 * Lonceng notifikasi + lencana jumlah yang belum dibaca.
 *
 * Sepola dengan lencana Chat di NavbarAuth: nilai awal dari shared prop Inertia
 * (ikut berubah tiap pindah halaman), lalu dijaga tetap hidup lewat polling
 * ringan agar lencana tetap akurat pada hosting tanpa WebSocket.
 */
export default function NotificationBell({ className = "", onNavigate }) {
    const { props } = usePage();
    const { t } = useTranslation();
    const user = props?.auth?.user;

    const [unread, setUnread] = useState(Number(props?.notif_unread_count ?? 0));
    const label = unread > 99 ? "99+" : String(unread);

    // Selaraskan lagi setiap kunjungan Inertia — mis. setelah menandai semua
    // terbaca, lencana harus langsung hilang tanpa menunggu poll berikutnya.
    useEffect(() => {
        setUnread(Number(props?.notif_unread_count ?? 0));
    }, [props?.notif_unread_count]);

    const refresh = useCallback(async () => {
        try {
            const { data } = await axios.get("/notifications/poll");
            if (typeof data?.unread === "number") setUnread(data.unread);
        } catch {
            /* diamkan — lencana cukup pakai nilai terakhir */
        }
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        const tick = () => {
            if (document.hidden) return;
            refresh();
        };
        const interval = setInterval(tick, 30000);

        return () => clearInterval(interval);
    }, [user?.id, refresh]);

    return (
        <Link
            href="/notifications"
            onClick={onNavigate}
            aria-label={t("notif.title")}
            title={t("notif.title")}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-primary-700 ${className}`}
        >
            <FaRegBell className="h-5 w-5" />

            {unread > 0 && (
                <span
                    aria-label={`${unread} ${t("notif.badge_unread")}`}
                    className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white ring-1 ring-white"
                >
                    {label}
                </span>
            )}
        </Link>
    );
}
