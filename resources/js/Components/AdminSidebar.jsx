import React from "react";
import { Link, usePage } from "@inertiajs/react";
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
} from "react-icons/fi";
import { FaSuitcase, FaCar } from "react-icons/fa6";

export default function AdminSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
    const { url } = usePage();

    // Data Menu Navigasi
    const navMenus = [
        {
            group: "PEMANDU TRIP",
            short: "TRP",
            items: [
                { name: "Manajemen Trip", icon: <FaSuitcase />, href: "/admin/trip" },
                { name: "Analitik Trip", icon: <FiPieChart />, href: "/admin/trip/analytics" },
            ],
        },
        {
            group: "JASTIPER",
            short: "JST",
            items: [
                { name: "Manajemen Jastip", icon: <FiShoppingCart />, href: "/admin/jastip" },
                { name: "Analitik Jastip", icon: <FiBarChart2 />, href: "/admin/jastip/analytics" },
            ],
        },
        {
            group: "PERGI BARENG",
            short: "PBR",
            items: [
                { name: "Manajemen Pergi Bareng", icon: <FaCar />, href: "/admin/pergi-bareng" },
                { name: "Analitik Pergi Bareng", icon: <FiTrendingUp />, href: "/admin/pergi-bareng/analytics" },
            ],
        },
        {
            group: "ADMIN",
            short: "ADM",
            items: [
                { name: "Manajemen User", icon: <FiUsers />, href: "/management-user" }, 
                { name: "Pesan", icon: <FiMessageSquare />, href: "/admin/messages" },
            ],
        },
    ];

    const isActive = (href) => url.startsWith(href);

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
                    ${isCollapsed ? "w-20" : "w-64"} 
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
                    <div className="flex items-center justify-center overflow-hidden">
                        <img
                            src="/assets/barengin_logows.png"
                            alt="Barengin Logo"
                            // Saat collapsed, logonya mengecil dikit (w-16) biar muat
                            className={`transition-all duration-300 ${isCollapsed ? "w-16" : "w-28"}`}
                        />
                    </div>

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
                        className={`lg:hidden text-neutral-500 hover:text-[#0077D3] ${isCollapsed ? "hidden" : "block"}`}
                    >
                        <FiX size={24} />
                    </button>
                </div>
                {/* --- AKHIR BAGIAN YANG DIUPDATE --- */}

                {/* List Menu */}
                <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                    {navMenus.map((menu, index) => (
                        <div key={index} className="mb-6">
                            <div className={`px-6 mb-3 text-xs font-bold text-neutral-400 tracking-wider transition-all ${isCollapsed ? "text-center text-[10px]" : ""}`}>
                                {isCollapsed ? menu.short : menu.group}
                            </div>

                            <ul className="space-y-1">
                                {menu.items.map((item, idx) => {
                                    const active = isActive(item.href);
                                    return (
                                        <li key={idx} className="px-3">
                                            <Link
                                                href={item.href}
                                                title={isCollapsed ? item.name : ""}
                                                className={`flex items-center rounded-xl transition-all duration-200 group
                                                    ${isCollapsed ? "justify-center py-3" : "px-3 py-3 gap-3"}
                                                    ${active ? "text-[#0077D3]" : "text-neutral-600 hover:bg-neutral-50"}
                                                `}
                                            >
                                                <div className={`flex items-center justify-center transition-all 
                                                    ${isCollapsed && active ? "bg-[#0077D3] text-white w-10 h-10 rounded-lg shadow-sm" : "text-lg"}
                                                    ${!isCollapsed && active ? "text-[#0077D3]" : "text-neutral-500 group-hover:text-[#0077D3]"}
                                                `}>
                                                    {item.icon}
                                                </div>

                                                {!isCollapsed && (
                                                    <span className={`font-medium text-sm whitespace-nowrap ${active ? "text-[#0077D3] font-semibold" : ""}`}>
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