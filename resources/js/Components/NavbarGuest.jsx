import { useState } from "react";
import { Link } from "@inertiajs/react";
import Button from "@/Components/Button.jsx";
import NavDropdown from "@/Components/NavDropdown.jsx";
import NavLink from "@/Components/NavLink.jsx";
import NavLinkMobile from "@/Components/NavLinkMobile.jsx";
import NavDropdownMobile from "@/Components/NavDropdownMobile.jsx";
import LanguageSwitcher from "@/Components/LanguageSwitcher.jsx";
import { useTranslation } from "@/lib/useTranslation";
import { FaRoute, FaCarSide } from "react-icons/fa";
import Container from "@/Components/Container.jsx";

export default function NavbarGuest() {
    const { t } = useTranslation();
    const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const dropdownItems = [
        { label: t("nav.trip_bareng"), href: "/trip-bareng", icon: FaRoute },
        { label: t("nav.pergi_bareng"), href: "/pergi-bareng", icon: FaCarSide },
    ];

    const closeAll = () => {
        setIsDesktopDropdownOpen(false);
        setIsMobileDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

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
                        menuWidthClass="w-60"
                        withDividers
                    />
                    <NavLink href="/jastip">{t("nav.jastip")}</NavLink>
                    <NavLink href="/forum">{t("nav.forum")}</NavLink>
                    <NavLink href="/leaderboard">{t("nav.leaderboard")}</NavLink>
                </nav>

                <div className="flex-1 flex items-center justify-end">
                <div className="hidden lg:flex items-center gap-3 xl:gap-4">
                    <LanguageSwitcher />
                    <NavLink href="/login">{t("nav.login")}</NavLink>
                    <Button
                        isButtonLink
                        href="/register"
                        type="primary"
                        variant="solid"
                        size="sm"
                    >
                        {t("nav.register")}
                    </Button>
                </div>

                <div className="lg:hidden flex items-center">
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
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        <NavLinkMobile href="/" onClick={closeAll}>
                            {t("nav.home")}
                        </NavLinkMobile>

                        <NavDropdownMobile
                            label={t("nav.jalan_bareng")}
                            isOpen={isMobileDropdownOpen}
                            onToggle={() => setIsMobileDropdownOpen((v) => !v)}
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
                            href="/login"
                            type="primary"
                            variant="outline"
                            className="w-full"
                            onClick={closeAll}
                        >
                            {t("nav.login")}
                        </Button>
                        <Button
                            isButtonLink
                            href="/register"
                            type="primary"
                            variant="solid"
                            className="w-full"
                            onClick={closeAll}
                        >
                            {t("nav.register")}
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
}
