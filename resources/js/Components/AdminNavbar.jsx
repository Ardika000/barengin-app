import React, { useState, useRef, useEffect } from "react";
import { usePage, Link } from "@inertiajs/react";
import { FiMenu, FiLogOut, FiSettings } from "react-icons/fi";
import { FaPaperPlane } from "react-icons/fa";
import { MdHome } from "react-icons/md";
import { HiOutlineDocumentText } from "react-icons/hi";
import Button from "@/Components/Button.jsx";
import NotificationBell from "@/Components/NotificationBell.jsx";
import { useTranslation } from "@/lib/useTranslation";
import { useUnreadChats } from "@/lib/useUnreadChats";

export default function AdminNavbar({ title, subtitle, setIsMobileOpen }) {
    const { t } = useTranslation();
    // Ambil data user dari Inertia
    const { props } = usePage();
    const user = props.auth?.user;
    const greeting = subtitle ?? `${t("admin.navbar.welcome")}, ${user?.full_name || t("admin.navbar.welcome_fallback")}!`;

    // Lencana chat belum dibaca - sumber & perilakunya sama dengan navbar depan.
    const { count: unreadChats, label: unreadLabel } = useUnreadChats();

    // State untuk toggle dropdown profil
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fungsi untuk menutup dropdown kalau diklik di luar kotak
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="h-[72px] bg-white border-b border-neutral-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
            {/* Bagian Kiri Navbar - min-w-0 + truncate supaya sapaan yang panjang
                terpotong rapi, bukan membungkus jadi dua baris (header tingginya
                tetap 72px) atau mendesak tombol-tombol di kanan. */}
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                {/* Tombol Hamburger Mobile */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="lg:hidden shrink-0 text-neutral-600 hover:text-primary-700 focus:outline-none transition-colors"
                >
                    <FiMenu size={24} />
                </button>

                {/* Title & Subtitle */}
                <div className="flex min-w-0 flex-col">
                    <h1 className="truncate text-base sm:text-lg font-bold text-neutral-700 leading-tight">
                        {title}
                    </h1>
                    <p className="truncate text-xs sm:text-sm text-neutral-500">
                        {greeting}
                    </p>
                </div>
            </div>

            {/* Bagian Kanan Navbar (Notifikasi, Chat, User Profile). Lencana
                streak sengaja tidak di sini: ia bikin baris ini sesak padahal
                bukan sesuatu yang perlu dipantau tiap saat - tempatnya di
                Riwayat Profil dan Peringkat. Di bawah sm, Chat pun pindah ke
                menu profil; lonceng tetap di luar karena lencana belum-dibaca
                perlu langsung terlihat. */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {/* Pemilih bahasa tidak di sini - hidup di tab Pengaturan (Riwayat
                    Profil), jadi lonceng notifikasi menggantikannya seperti di
                    navbar halaman depan. */}
                <NotificationBell />

                {/* Lencana belum-dibaca sama persis dengan navbar depan - dulu
                    hanya ada di sana, jadi angkanya seolah hilang begitu masuk
                    dasbor. */}
                <div className="relative hidden sm:block">
                    <Button
                        isButtonLink
                        href="/chat"
                        type="primary"
                        variant="solid"
                        size="sm"
                        className="gap-2"
                    >
                        <FaPaperPlane className="w-4 h-4" />
                        <span>{t("nav.chat")}</span>
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

                {/* Wrapper khusus profil: ref hanya membungkus tombol + menu profil,
                    supaya klik di luar (mis. lonceng notifikasi) menutup dropdown
                    ini dan tidak saling menumpuk. */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen((v) => !v)}
                        className="flex items-center gap-2 focus:outline-none"
                    >
                        <img
                            src={user?.public_profile_image ?? "/assets/default-profile.png"}
                            alt={user?.name ?? "Admin Profile"}
                            className="w-10 h-10 rounded-full object-cover border border-neutral-200 shadow-sm cursor-pointer"
                        />
                    </button>

                    {/* --- DROPDOWN MENU PROFILE --- */}
                    {isProfileOpen && (
                        <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 z-50 overflow-hidden animate-fade-in-up">
                            {/* Chat hanya muncul di layar kecil - di sm+ tombolnya
                                sudah berdiri sendiri di header. */}
                            <Link
                                href="/chat"
                                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-base font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-neutral-200 sm:hidden"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <span className="flex items-center gap-3">
                                    <FaPaperPlane className="w-5 h-5 text-current shrink-0" />
                                    <span>{t("nav.chat")}</span>
                                </span>
                                {unreadChats > 0 && (
                                    <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
                                        {unreadLabel}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href="/"
                                className="w-full flex items-center gap-3 px-5 py-4 text-base font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-neutral-200"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <MdHome className="w-5 h-5 text-current shrink-0" />
                                <span>{t("nav.home")}</span>
                            </Link>

                            <Link
                                href="/profile-history"
                                className="w-full flex items-center gap-3 px-5 py-4 text-base font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-neutral-200"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <HiOutlineDocumentText className="w-5 h-5 text-current shrink-0" />
                                <span>{t("nav.profile_history")}</span>
                            </Link>

                            {/* Pengaturan hidup sebagai tab di Riwayat Profil */}
                            <Link
                                href="/profile-history?tab=settings"
                                className="w-full flex items-center gap-3 px-5 py-4 text-base font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-neutral-200"
                                onClick={() => setIsProfileOpen(false)}
                            >
                                <FiSettings className="w-5 h-5 text-current shrink-0" />
                                <span>{t("settings.title")}</span>
                            </Link>

                            {/* Logout menggunakan POST method sesuai bawaan Laravel Breeze/Jetstream */}
                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="w-full flex items-center gap-3 px-5 py-4 text-base font-medium text-neutral-600 hover:bg-primary-50 hover:text-primary-700 transition-colors cursor-pointer"
                            >
                                <FiLogOut className="w-5 h-5 text-current shrink-0" />
                                <span>{t("nav.logout")}</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}