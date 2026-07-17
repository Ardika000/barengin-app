import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, usePage } from "@inertiajs/react";
import Button from "@/Components/Button.jsx";
import NavDropdown from "@/Components/NavDropdown.jsx";
import NavLink from "@/Components/NavLink.jsx";
import NavLinkMobile from "@/Components/NavLinkMobile.jsx";
import NavDropdownMobile from "@/Components/NavDropdownMobile.jsx";
import StreakBadge from "@/Components/StreakBadge.jsx";
import NotificationBell from "@/Components/NotificationBell.jsx";
import { useTranslation } from "@/lib/useTranslation";

import { FaRoute, FaCarSide, FaPaperPlane } from "react-icons/fa";
import { MdDashboard, MdHistory } from "react-icons/md";
import { FiLogOut, FiSettings } from "react-icons/fi";
import Container from "@/Components/Container.jsx";

export default function NavbarAuth() {
    const { props } = usePage();
    const user = props?.auth?.user;
    const { t } = useTranslation();

    // Jumlah percakapan dengan pesan belum dibaca. Nilai awal datang dari shared
    // prop Inertia (hanya ikut berubah saat pindah halaman), lalu dijaga tetap
    // hidup lewat Echo + polling di bawah.
    const [unreadChats, setUnreadChats] = useState(
        Number(props?.chat_unread_count ?? 0),
    );
    const unreadLabel = unreadChats > 99 ? "99+" : String(unreadChats);

    // Selaraskan lagi setiap kunjungan Inertia (mis. setelah membuka /chat,
    // lencana harus langsung turun tanpa menunggu poll berikutnya).
    useEffect(() => {
        setUnreadChats(Number(props?.chat_unread_count ?? 0));
    }, [props?.chat_unread_count]);

    // Hitung ulang dari sumber yang sama dengan halaman Chat, agar lencana dan
    // daftar chat tidak pernah berbeda angka.
    const refreshUnread = useCallback(async () => {
        try {
            const { data } = await axios.get("/chat/poll");
            if (Array.isArray(data?.conversations)) {
                setUnreadChats(
                    data.conversations.filter((c) => (c.unread ?? 0) > 0).length,
                );
            }
        } catch {
            /* diamkan — lencana cukup pakai nilai terakhir */
        }
    }, []);

    // Realtime: pesan masuk ke channel pribadi user langsung memicu hitung ulang.
    useEffect(() => {
        if (!window.Echo || !user?.id) return;

        const channelName = `user.${user.id}`;
        const channel = window.Echo.private(channelName);

        channel.listen(".message.sent", (payload) => {
            // Pesan sendiri (dikirim dari perangkat lain) bukan notifikasi.
            if (Number(payload?.sender_id) === Number(user.id)) return;
            refreshUnread();
        });

        return () => {
            channel.stopListening(".message.sent");
            window.Echo.leave(`private-${channelName}`);
        };
    }, [user?.id, refreshUnread]);

    // Fallback polling — menjaga lencana tetap akurat pada hosting tanpa
    // WebSocket, sekaligus menurunkan angka saat chat dibaca di tab lain.
    useEffect(() => {
        if (!user?.id) return;

        const tick = () => {
            if (document.hidden) return;
            refreshUnread();
        };
        const interval = setInterval(tick, 12000);

        return () => clearInterval(interval);
    }, [user?.id, refreshUnread]);

    const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [isMobileUserDropdownOpen, setIsMobileUserDropdownOpen] =
        useState(false);

    const dropdownItems = [
        { label: t("nav.trip_bareng"), href: "/trip-bareng", icon: FaRoute },
        { label: t("nav.pergi_bareng"), href: "/pergi-bareng", icon: FaCarSide },
    ];

    const avatarUrl = user?.public_profile_image ||
        user?.avatar_url ||
        user?.profile_photo_url ||
        user?.avatar ||
        "/assets/default-profile.png";

    // Tujuan dashboard sesuai role pengguna.
    // - admin  -> Beranda Admin (/admin, khusus is_admin)
    // - guider -> Manajemen Trip (/admin/trip, khusus is_guider)
    // - lainnya -> Manajemen Pergi Bareng (terbuka untuk semua user yang login)
    const dashboardHref = user?.is_admin ? "/admin" : user?.is_guider ? "/admin/trip" : "/admin/pergi-bareng";

    const closeAll = () => {
        setIsDesktopDropdownOpen(false);
        setIsProfileOpen(false);
        setIsMobileMenuOpen(false);
        setIsMobileDropdownOpen(false);
        setIsMobileUserDropdownOpen(false);
    };

    useEffect(() => {
        if (!isMobileMenuOpen) {
            setIsMobileDropdownOpen(false);
            setIsMobileUserDropdownOpen(false);
        }
    }, [isMobileMenuOpen]);

    return (
        <header className="bg-white border-b border-neutral-200 shadow-sm relative z-50">
            <Container className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2"
                        onClick={closeAll}
                    >
                        <img
                            src="/assets/barengin_logows.png"
                            className="h-15 w-auto"
                            alt="Barengin"
                        />
                    </Link>
                </div>

                <nav className="hidden lg:flex shrink-0 space-x-4 xl:space-x-6 items-center text-neutral-700 whitespace-nowrap">
                    <NavLink href="/">{t("nav.home")}</NavLink>

                    <NavDropdown
                        label={t("nav.jalan_bareng")}
                        items={dropdownItems}
                        isOpen={isDesktopDropdownOpen}
                        onToggle={() => setIsDesktopDropdownOpen((v) => !v)}
                        onNavigate={() => setIsDesktopDropdownOpen(false)}
                        onClose={() => setIsDesktopDropdownOpen(false)}
                        menuWidthClass="w-55"
                        withDividers
                    />

                    <NavLink href="/jastip">{t("nav.jastip")}</NavLink>
                    <NavLink href="/forum">{t("nav.forum")}</NavLink>
                    <NavLink href="/leaderboard">{t("nav.leaderboard")}</NavLink>
                </nav>

                <div className="flex-1 flex items-center justify-end">
                <div className="hidden lg:flex items-center gap-2 xl:gap-3">
                    {/* Pemilih bahasa tidak lagi di sini — pindah ke tab
                        Pengaturan di Profile History agar navbar longgar dan
                        lonceng notifikasi kebagian tempat. */}
                    <NotificationBell onNavigate={closeAll} />

                    <Link
                        href="/profile-history"
                        onClick={closeAll}
                        aria-label="Streak Nyala"
                    >
                        <StreakBadge count={user?.streak_count ?? 0} />
                    </Link>

                    <div className="relative">
                        <Button
                            isButtonLink
                            href="/chat"
                            type="primary"
                            variant="solid"
                            size="sm"
                            className="gap-2"
                        >
                            <FaPaperPlane className="w-4 h-4" />
                            {t("nav.chat")}
                        </Button>

                        {unreadChats > 0 && (
                            <span
                                aria-label={`${unreadChats} ${t("chat.unread_badge")}`}
                                className="pointer-events-none absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white ring-1 ring-white"
                            >
                                {unreadLabel}
                            </span>
                        )}
                    </div>

                    <NavDropdown
                        items={[
                            {
                                label: t("nav.dashboard"),
                                href: dashboardHref,
                                icon: MdDashboard,
                            },
                            {
                                label: t("nav.profile_history"),
                                href: "/profile-history",
                                icon: MdHistory,
                            },
                            // Pengaturan memang berupa tab di Profile History, tapi
                            // tab paling kanan pada bar yang bergulir horizontal itu
                            // praktis tak ditemukan. Dropdown profil adalah tempat
                            // orang benar-benar mencari "Pengaturan".
                            {
                                label: t("settings.title"),
                                href: "/profile-history?tab=settings",
                                icon: FiSettings,
                            },
                            {
                                label: t("nav.logout"),
                                href: "/logout",
                                icon: FiLogOut,
                                as: "button",
                                method: "post",
                            },
                        ]}
                        isOpen={isProfileOpen}
                        onToggle={() => setIsProfileOpen((v) => !v)}
                        onNavigate={() => setIsProfileOpen(false)}
                        onClose={() => setIsProfileOpen(false)}
                        align="right"
                        menuWidthClass="w-55"
                        withDividers
                        trigger={
                            <img
                                src={user?.public_profile_image}
                                alt={user?.name || "Profile"}
                                className="w-10 h-10 shrink-0 rounded-full object-cover border border-neutral-200 shadow-sm cursor-pointer"
                            />
                        }
                        showChevron={false}
                    />
                </div>

                <div className="lg:hidden flex items-center gap-2">
                    <NotificationBell onNavigate={closeAll} />

                    <Link
                        href="/profile-history"
                        onClick={closeAll}
                        aria-label="Streak Nyala"
                    >
                        <StreakBadge count={user?.streak_count ?? 0} />
                    </Link>

                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen((v) => !v)}
                        className="text-neutral-600 hover:text-primary-700 focus:outline-none transition-colors cursor-pointer"
                        aria-expanded={isMobileMenuOpen}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <svg
                                className="w-7 h-7"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-7 h-7"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 6h16M4 12h16m-7 6h7"
                                />
                            </svg>
                        )}
                    </button>
                </div>
                </div>
            </Container>

            {isMobileMenuOpen && (
                <div className="lg:hidden bg-white border-t border-neutral-100 absolute w-full left-0 shadow-lg">
                    {/* User accordion */}
                    <div className="px-4 pt-3 pb-2 border-b border-neutral-200">
                        <NavDropdownMobile
                            label={
                                <span className="flex items-center gap-3 min-w-0">
                                    <img
                                        src={avatarUrl}
                                        alt={user?.name || "User"}
                                        className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
                                    />
                                    <span className="truncate">
                                        {user?.name || "Pengguna"}
                                    </span>
                                </span>
                            }
                            isOpen={isMobileUserDropdownOpen}
                            onToggle={() =>
                                setIsMobileUserDropdownOpen((v) => !v)
                            }
                            buttonClassName="text-neutral-600"
                        >
                            <Link
                                href={dashboardHref}
                                onClick={closeAll}
                                className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center"
                            >
                                <MdDashboard className="w-5 h-5 mr-2 text-current" />
                                {t("nav.dashboard")}
                            </Link>

                            <Link
                                href="/profile-history"
                                onClick={closeAll}
                                className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center"
                            >
                                <MdHistory className="w-5 h-5 mr-2 text-current" />
                                {t("nav.profile_history")}
                            </Link>

                            <Link
                                href="/profile-history?tab=settings"
                                onClick={closeAll}
                                className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center"
                            >
                                <FiSettings className="w-5 h-5 mr-2 text-current" />
                                {t("settings.title")}
                            </Link>

                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                onClick={closeAll}
                                className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center cursor-pointer"
                            >
                                <FiLogOut className="w-5 h-5 mr-2 text-current" />
                                {t("nav.logout")}
                            </Link>
                        </NavDropdownMobile>
                    </div>

                    <div className="px-4 pt-2 pb-4 space-y-1">
                        <NavLinkMobile href="/" onClick={closeAll}>
                            {t("nav.home")}
                        </NavLinkMobile>

                        <NavDropdownMobile
                            label={t("nav.jalan_bareng")}
                            isOpen={isMobileDropdownOpen}
                            onToggle={() => setIsMobileDropdownOpen((v) => !v)}
                            buttonClassName="text-neutral-600"
                        >
                            {dropdownItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeAll}
                                    className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center"
                                >
                                    {item.icon ? (
                                        <item.icon className="w-4 h-4 mr-2 text-current" />
                                    ) : null}
                                    {item.label}
                                </Link>
                            ))}
                        </NavDropdownMobile>

                        <NavLinkMobile href="/jastip" onClick={closeAll}>
                            {t("nav.jastip")}
                        </NavLinkMobile>
                        <NavLinkMobile href="/forum" onClick={closeAll}>
                            {t("nav.forum")}
                        </NavLinkMobile>
                        <NavLinkMobile href="/leaderboard" onClick={closeAll}>
                            {t("nav.leaderboard")}
                        </NavLinkMobile>
                    </div>

                    <div className="pt-4 pb-6 border-t border-neutral-200 px-4 space-y-3">
                        <Button
                            isButtonLink
                            href="/chat"
                            type="primary"
                            variant="solid"
                            className="w-full gap-2"
                            onClick={closeAll}
                        >
                            <FaPaperPlane className="w-4 h-4" />
                            {t("nav.chat")}
                            {unreadChats > 0 && (
                                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white">
                                    {unreadLabel}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
}
