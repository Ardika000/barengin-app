import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { useTranslation } from "@/lib/useTranslation";
import {
    FiX,
    FiChevronLeft,
    FiChevronRight,
    FiPieChart,
    FiBarChart2,
    FiTrendingUp,
    FiHome,
    FiUsers,
    FiMessageSquare,
    FiShoppingCart,
    FiGlobe,
    FiMap,
    FiInbox,
} from "react-icons/fi";
import { FaSuitcase, FaCar } from "react-icons/fa6";

export default function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const { t } = useTranslation();

    // Data Menu Navigasi. `requires` = flag user yang dibutuhkan (null = semua user).
    const navMenus = [
        {
            group: t("admin.nav.group.trip_guide"),
            short: "TRP",
            requires: "is_guider",
            items: [
                { name: t("admin.nav.trip_mgmt"), icon: <FaSuitcase />, href: "/admin/trip" },
                { name: t("admin.nav.trip_analytics"), icon: <FiPieChart />, href: "/admin/trip/analytics" },
            ],
        },
        {
            group: t("admin.nav.group.jastiper"),
            short: "JST",
            requires: null,
            items: [
                { name: t("admin.nav.jastip_mgmt"), icon: <FiShoppingCart />, href: "/admin/jastip" },
                { name: t("admin.nav.jastip_trips"), icon: <FiMap />, href: "/admin/jastip/trips" },
                { name: t("admin.nav.jastip_requests"), icon: <FiInbox />, href: "/admin/jastip/requests" },
                { name: t("admin.nav.jastip_analytics"), icon: <FiBarChart2 />, href: "/admin/jastip/analytics" },
            ],
        },
        {
            group: t("admin.nav.group.pergi_bareng"),
            short: "PBR",
            requires: null,
            items: [
                { name: t("admin.nav.pergi_mgmt"), icon: <FaCar />, href: "/admin/pergi-bareng" },
                { name: t("admin.nav.pergi_analytics"), icon: <FiTrendingUp />, href: "/admin/pergi-bareng/analytics" },
            ],
        },
        {
            group: t("admin.nav.group.admin"),
            short: "ADM",
            requires: "is_admin",
            items: [
                { name: t("admin.nav.home"), icon: <FiHome />, href: "/admin" },
                { name: t("admin.nav.users"), icon: <FiUsers />, href: "/admin/management-user" },
                { name: t("admin.nav.languages"), icon: <FiGlobe />, href: "/admin/languages" },
                { name: t("admin.nav.messages"), icon: <FiMessageSquare />, href: "/admin/message" },
            ],
        },
    ];

    // Render menu hanya untuk role yang sesuai
    const visibleMenus = navMenus.filter((menu) => !menu.requires || Boolean(user?.[menu.requires]));

    // Tentukan satu href aktif: cocokkan url lalu pilih yang paling spesifik (terpanjang),
    // sehingga "/admin/pergi-bareng" tidak ikut menyala saat di "/admin/pergi-bareng/analytics".
    // Buang query string (mis. ?search=...) supaya menu tetap menyala saat mencari/filter.
    const path = url.split("?")[0];
    const matchHref = (href) =>
        href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/");

    const activeHref = visibleMenus
        .flatMap((menu) => menu.items.map((item) => item.href))
        .filter(matchHref)
        .sort((a, b) => b.length - a.length)[0];

    const isActive = (href) => href === activeHref;

    return (
        <>
            {/* OVERLAY UNTUK MOBILE */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-neutral-200 flex flex-col transition-all duration-300 ease-in-out
                    ${isCollapsed ? "w-20" : "w-72"}
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                {/* --- BAGIAN YANG DIUPDATE --- */}
                {/* Header Sidebar (Logo & Toggle) */}
                <div 
                    className={`flex border-b border-neutral-100 transition-all duration-300 
                        ${isCollapsed ? "flex-col justify-center items-center py-5 gap-4 h-auto" : "flex-row items-center justify-between h-[72px] px-4"}
                    `}
                >
                    <Link href="/" className="flex items-center justify-center overflow-hidden" title="Kembali ke Beranda">
                        <img
                            src="/assets/barengin_logows.png"
                            alt="Barengin Logo"
                            // Saat collapsed, logonya mengecil dikit (w-16) biar muat
                            className={`transition-all duration-300 ${isCollapsed ? "w-16" : "w-28"}`}
                        />
                    </Link>

                    {/* Toggle Desktop */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
                    >
                        {isCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
                    </button>
                    
                    {/* Close Mobile */}
                    <button 
                        onClick={() => setIsMobileOpen(false)}
                        className={`lg:hidden text-neutral-500 hover:text-primary-700 ${isCollapsed ? "hidden" : "block"}`}
                    >
                        <FiX size={24} />
                    </button>
                </div>
                {/* --- AKHIR BAGIAN YANG DIUPDATE --- */}

                {/* List Menu */}
                <div className="flex-1 overflow-y-auto py-6 no-scrollbar">
                    {visibleMenus.map((menu, index) => (
                        <div key={index} className="mb-6">
                            <div className={`px-6 mb-3 text-xs font-bold text-neutral-400 tracking-wider transition-all ${isCollapsed ? "text-center text-[10px]" : ""}`}>
                                {isCollapsed ? menu.short : menu.group}
                            </div>

                            <ul className="space-y-2">
                                {menu.items.map((item, idx) => {
                                    const active = isActive(item.href);
                                    return (
                                        <li key={idx} className="px-3">
                                            <Link
                                                href={item.href}
                                                title={isCollapsed ? item.name : ""}
                                                className={`flex items-center rounded-xl transition-all duration-200 group
                                                    ${isCollapsed ? "justify-center py-3.5" : "px-4 py-3.5 gap-3"}
                                                    ${active && !isCollapsed ? "bg-primary-700 text-white shadow-sm shadow-primary-200" : ""}
                                                    ${!active ? "text-neutral-600 hover:bg-primary-50 hover:text-primary-700" : ""}
                                                `}
                                            >
                                                <div className={`flex items-center justify-center transition-all
                                                    ${isCollapsed && active ? "bg-primary-700 text-white w-10 h-10 rounded-lg shadow-sm" : "text-lg"}
                                                    ${!isCollapsed && active ? "text-white" : ""}
                                                    ${!active ? "text-neutral-500 group-hover:text-primary-700" : ""}
                                                `}>
                                                    {item.icon}
                                                </div>

                                                {!isCollapsed && (
                                                    <span className={`font-medium text-sm whitespace-nowrap ${active ? "text-white" : ""}`}>
                                                        {item.name}
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </aside>
        </>
    );
}