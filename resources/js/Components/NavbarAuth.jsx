import { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import Button from "@/Components/Button.jsx";
import NavDropdown from "@/Components/NavDropdown.jsx";
import NavLink from "@/Components/NavLink.jsx";
import NavLinkMobile from "@/Components/NavLinkMobile.jsx";
import NavDropdownMobile from "@/Components/NavDropdownMobile.jsx";
import StreakBadge from "@/Components/StreakBadge.jsx";
import LanguageSwitcher from "@/Components/LanguageSwitcher.jsx";
import { useTranslation } from "@/lib/useTranslation";

import { FaRoute, FaCarSide, FaPaperPlane } from "react-icons/fa";
import { MdDashboard, MdHistory } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import Container from "@/Components/Container.jsx";

export default function NavbarAuth() {
    const { props } = usePage();
    const user = props?.auth?.user;
    const { t } = useTranslation();

    const [unreadCount, setUnreadCount] = useState(
        Number(props?.chat_unread_count ?? 0),
    );
    const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);

    useEffect(() => {
        setUnreadCount(Number(props?.chat_unread_count ?? 0));
    }, [props?.chat_unread_count]);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;

        const fetchCount = async () => {
            if (document.hidden) return;
            try {
                const { data } = await window.axios.get("/chat/unread-count");
                if (!cancelled) setUnreadCount(Number(data?.count ?? 0));
            } catch {
                /* diamkan; coba lagi tick berikutnya */
            }
        };

        const interval = setInterval(fetchCount, 15000);
        const onFocus = () => fetchCount();
        const onUnreadChanged = () => fetchCount();
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onFocus);
        window.addEventListener("chat:unread-changed", onUnreadChanged);

        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onFocus);
            window.removeEventListener("chat:unread-changed", onUnreadChanged);
        };
    }, [user?.id]);

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

                <nav className="hidden md:flex shrink-0 space-x-5 lg:space-x-6 items-center text-neutral-700 whitespace-nowrap">
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
                <div className="hidden md:flex items-center gap-2 lg:gap-3">
                    <LanguageSwitcher />

                    <Link
                        href="/profile-history"
                        onClick={closeAll}
                        aria-label="Streak Nyala"
                    >
                        <StreakBadge count={user?.streak_count ?? 0} />
                    </Link>

                    <div className="relative group">
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

                        {unreadCount > 0 && (
                            <>
                                <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger-700 px-1.5 text-[11px] font-semibold leading-none text-white shadow">
                                    {unreadLabel}
                                </span>
                                <span
                                    role="tooltip"
                                    className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block"
                                >
                                    {t("nav.chat_unread").replace(":count", unreadCount)}
                                </span>
                            </>
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
                                className="w-10 h-10 rounded-full object-cover border border-neutral-200 shadow-sm cursor-pointer"
                            />
                        }
                        showChevron={false}
                    />
                </div>

                <div className="md:hidden flex items-center gap-3">
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
                <div className="md:hidden bg-white border-t border-neutral-100 absolute w-full left-0 shadow-lg">
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
                        <LanguageSwitcher variant="block" />

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
                            {unreadCount > 0 && (
                                <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold leading-none text-primary-700">
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
