import { useState } from "react";
import { Link } from "@inertiajs/react";
import Button from "@/Components/Button.jsx";
import NavDropdown from "@/Components/NavDropdown.jsx";
import NavLink from "@/Components/NavLink.jsx";
import NavLinkMobile from "@/Components/NavLinkMobile.jsx";
import NavDropdownMobile from "@/Components/NavDropdownMobile.jsx";
import { FaRoute, FaCarSide } from "react-icons/fa";
import Container from "@/Components/Container.jsx";

export default function NavbarGuest() {
    const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const dropdownItems = [
        { label: "Trip Bareng", href: "/trip-bareng", icon: FaRoute },
        { label: "Pergi Bareng", href: "/pergi-bareng", icon: FaCarSide },
    ];

    const closeAll = () => {
        setIsDesktopDropdownOpen(false);
        setIsMobileDropdownOpen(false);
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="bg-white border-b border-neutral-200 shadow-sm relative z-50">
            <Container className="flex justify-between items-center">
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

                <nav className="hidden md:flex space-x-6 items-center text-neutral-700">
                    <NavLink href="/">Beranda</NavLink>
                    <NavDropdown
                        label="Jalan Bareng"
                        items={dropdownItems}
                        isOpen={isDesktopDropdownOpen}
                        onToggle={() => setIsDesktopDropdownOpen((v) => !v)}
                        onNavigate={() => setIsDesktopDropdownOpen(false)}
                        onClose={() => setIsDesktopDropdownOpen(false)}
                        menuWidthClass="w-60"
                        withDividers
                    />
                    {/* <NavLink href="/jastip">Jastip</NavLink> */}
                    <NavLink href="/forum">Forum</NavLink>
                    <NavLink href="/leaderboard">Leaderboard</NavLink>
                </nav>

                <div className="hidden md:flex items-center space-x-4">
                    <NavLink href="/login">Masuk</NavLink>
                    <Button
                        isButtonLink
                        href="/register"
                        type="primary"
                        variant="solid"
                        size="sm"
                    >
                        Daftar
                    </Button>
                </div>

                <div className="md:hidden flex items-center">
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
            </Container>

            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-neutral-100 absolute w-full left-0 shadow-lg">
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        <NavLinkMobile href="/" onClick={closeAll}>
                            Beranda
                        </NavLinkMobile>

                        <NavDropdownMobile
                            label="Jalan Bareng"
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
                            Jastip
                        </NavLinkMobile>
                        <NavLinkMobile href="/forum" onClick={closeAll}>
                            Forum
                        </NavLinkMobile>
                        <NavLinkMobile href="/leaderboard" onClick={closeAll}>
                            Leaderboard
                        </NavLinkMobile>
                    </div>

                    <div className="pt-4 pb-6 border-t border-neutral-200 px-4 space-y-3">
                        <Button
                            isButtonLink
                            href="/login"
                            type="primary"
                            variant="outline"
                            className="w-full"
                            onClick={closeAll}
                        >
                            Masuk
                        </Button>
                        <Button
                            isButtonLink
                            href="/register"
                            type="primary"
                            variant="solid"
                            className="w-full"
                            onClick={closeAll}
                        >
                            Daftar
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
}
