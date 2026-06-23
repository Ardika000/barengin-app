import { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import Button from "@/Components/Button.jsx";
import NavDropdown from "@/Components/NavDropdown.jsx";
import NavLink from "@/Components/NavLink.jsx";
import NavLinkMobile from "@/Components/NavLinkMobile.jsx";
import NavDropdownMobile from "@/Components/NavDropdownMobile.jsx";

import { FaRoute, FaCarSide, FaPaperPlane } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { HiOutlineDocumentText } from "react-icons/hi";
import { FiLogOut } from "react-icons/fi";
import Container from "@/Components/Container.jsx";

export default function NavbarAuth() {
    const { props } = usePage();
    const user = props?.auth?.user;

    const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [isMobileUserDropdownOpen, setIsMobileUserDropdownOpen] =
        useState(false);

    const dropdownItems = [
        { label: "Trip Bareng", href: "/trip-bareng", icon: FaRoute },
        { label: "Pergi Bareng", href: "/pergi-bareng", icon: FaCarSide },
    ];

    const avatarUrl = user?.public_profile_image ||
        user?.avatar_url ||
        user?.profile_photo_url ||
        user?.avatar ||
        "/assets/default-profile.png";

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
                        menuWidthClass="w-55"
                        withDividers
                    />

                    {/* <NavLink href="/jastip">Jastip</NavLink> */}
                    <NavLink href="/forum">Forum</NavLink>
                    <NavLink href="/leaderboard">Leaderboard</NavLink>
                </nav>

                <div className="hidden md:flex items-center space-x-3">
                    <Button
                        isButtonLink
                        href="/chat"
                        type="primary"
                        variant="solid"
                        size="sm"
                        className="gap-2"
                    >
                        <FaPaperPlane className="w-4 h-4" />
                        Chat
                    </Button>

                    <NavDropdown
                        items={[
                            {
                                label: "Dashboard",
                                href: "/dashboard",
                                icon: MdDashboard,
                            },
                            {
                                label: "Profile History",
                                href: "/profile-history",
                                icon: HiOutlineDocumentText,
                            },
                            {
                                label: "Logout",
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
                                        {user?.name || "User"}
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
                                href="/dashboard"
                                onClick={closeAll}
                                className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center"
                            >
                                <MdDashboard className="w-5 h-5 mr-2 text-current" />
                                Dashboard
                            </Link>

                            <Link
                                href="/profile-history"
                                onClick={closeAll}
                                className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center"
                            >
                                <HiOutlineDocumentText className="w-5 h-5 mr-2 text-current" />
                                Profile History
                            </Link>

                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                onClick={closeAll}
                                className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors flex items-center cursor-pointer"
                            >
                                <FiLogOut className="w-5 h-5 mr-2 text-current" />
                                Logout
                            </Link>
                        </NavDropdownMobile>
                    </div>

                    <div className="px-4 pt-2 pb-4 space-y-1">
                        <NavLinkMobile href="/" onClick={closeAll}>
                            Beranda
                        </NavLinkMobile>

                        <NavDropdownMobile
                            label="Jalan Bareng"
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
                            href="/chat"
                            type="primary"
                            variant="solid"
                            className="w-full gap-2"
                            onClick={closeAll}
                        >
                            <FaPaperPlane className="w-4 h-4" />
                            Chat
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
}
