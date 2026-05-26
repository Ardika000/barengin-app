import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import AdminSidebar from "@/Components/AdminSidebar"; // Sesuaikan path import-mu
import AdminNavbar from "@/Components/AdminNavbar";   // Sesuaikan path import-mu

export default function AdminLayout({ children, title = "Dasbor - Home", subtitle = "Selamat datang, Pemandu!" }) {
    // State untuk Desktop Sidebar (Lebar vs Menyusut)
    const [isCollapsed, setIsCollapsed] = useState(false);
    // State untuk Mobile Sidebar (Sembunyi vs Muncul)
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F4F7FB] flex font-sans">
            {/* Mengatur Meta Title secara dinamis */}
            <Head title={title} />

            {/* Panggil komponen Sidebar dan lempar props (state) ke dalamnya */}
            <AdminSidebar 
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
            />

            {/* Bungkus Konten Utama dan Navbar */}
            <div
                className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
                    ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}
                `}
            >
                {/* Panggil komponen Navbar dan lempar judul serta state mobile */}
                <AdminNavbar 
                    title={title} 
                    subtitle={subtitle} 
                    setIsMobileOpen={setIsMobileOpen} 
                />

                {/* Konten Halaman (Children) */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}