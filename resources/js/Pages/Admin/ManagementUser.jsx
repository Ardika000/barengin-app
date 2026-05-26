import React, { useState, useMemo, useEffect } from "react";
import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Pagination from "@/Components/Pagination";

import { FiSearch, FiTrash2, FiEdit2 } from "react-icons/fi";
import { FaCircleCheck } from "react-icons/fa6";

// Fungsi untuk bikin Inisial Nama (Misal: "Budi Penumpang" jadi "BP")
const getInitials = (name) => {
    if (!name) return "U";
    const words = name.split(" ");
    if (words.length > 1) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Fungsi untuk bikin warna acak buat background inisial
const getRandomBg = (id) => {
    const colors = [
        "bg-blue-100 text-blue-600",
        "bg-green-100 text-green-600",
        "bg-red-100 text-red-600",
        "bg-purple-100 text-purple-600",
        "bg-orange-100 text-orange-600",
        "bg-pink-100 text-pink-600",
    ];
    // Pastikan id adalah angka, fallback ke 0 kalau undefiend
    const safeId = parseInt(id) || 0; 
    return colors[safeId % colors.length]; 
};

export default function ManagementUser({ users = [] }) { 
    // Menerima data dari Controller (web.php)

    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterRole]);

    // ==========================================
    // PENYESUAIAN STRUKTUR DATA DATABASE
    // ==========================================
    const formattedUsers = useMemo(() => {
        if (!users || users.length === 0) return [];

        return users.map(user => {
            // Menerjemahkan kolom boolean (is_admin, dll) menjadi array string untuk badge
            const userRoles = [];
            if (user.is_admin) userRoles.push("Admin");
            if (user.is_guider) userRoles.push("Guider");
            if (user.is_jastiper) userRoles.push("Jastiper");
            
            // Kalau false semua, kita kasih label default "User Biasa"
            if (userRoles.length === 0) userRoles.push("User Biasa");

            return {
                id: user.id,
                name: user.full_name, // Menggunakan full_name dari seeder
                email: user.email,
                // Mengecek status verifikasi dari kolom email_verified_at (berdasarkan file Factory)
                verified: user.email_verified_at !== null && user.email_verified_at !== undefined, 
                initials: getInitials(user.full_name),
                bg: getRandomBg(user.id),
                roles: userRoles
            };
        });
    }, [users]);

    // Logika Filter & Pencarian
    const filteredUsers = useMemo(() => {
        return formattedUsers.filter((user) => {
            const matchSearch =
                (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchRole = filterRole ? user.roles.includes(filterRole) : true;
            return matchSearch && matchRole;
        });
    }, [searchQuery, filterRole, formattedUsers]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const renderRoleBadge = (role, idx) => {
        let colorClasses = "";
        if (role === "Jastiper") colorClasses = "bg-green-100 text-green-700";
        else if (role === "Guider") colorClasses = "bg-orange-100 text-orange-700";
        else if (role === "Admin") colorClasses = "bg-blue-100 text-[#0077D3]";
        else colorClasses = "bg-gray-100 text-gray-600"; // Untuk "User Biasa"

        return (
            <span key={idx} className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${colorClasses}`}>
                {role}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col h-full min-h-[500px]">
            <Head title="Manajemen User" />

            <div className="p-4 sm:p-6 border-b border-neutral-100">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-1">Manajemen User</h2>
                    <p className="text-neutral-500 text-xs sm:text-sm">
                        Tempat dimana admin mengatur semua user dalam Barengin.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Cari nama atau email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-[#0077D3] focus:border-[#0077D3] outline-none text-sm transition-all"
                        />
                    </div>

                    <div className="relative w-full md:w-48">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:ring-2 focus:ring-[#0077D3] outline-none cursor-pointer appearance-none transition-all"
                        >
                            <option value="">Semua</option>
                            <option value="Jastiper">Jastiper</option>
                            <option value="Guider">Guider</option>
                            <option value="Admin">Admin</option>
                            <option value="User Biasa">User Biasa</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* TAMPILAN DESKTOP */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#F4F7FB] border-y border-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">NAME</th>
                                <th className="py-4 px-6">EMAIL</th>
                                <th className="py-4 px-6">ROLES</th>
                                <th className="py-4 px-6 text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-neutral-50/50 transition duration-150">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${user.bg}`}>
                                                    {user.initials}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-neutral-900 text-sm">
                                                        {user.name}
                                                    </span>
                                                    {user.verified && (
                                                        <FaCircleCheck className="text-[#0077D3] text-sm" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-neutral-600 text-sm">
                                            {user.email}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-2">
                                                {user.roles.map((role, idx) => renderRoleBadge(role, idx))}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors" title="Hapus User">
                                                    <FiTrash2 size={16} />
                                                </button>
                                                <button className="p-2 bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 rounded-lg transition-colors" title="Edit User">
                                                    <FiEdit2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-neutral-500">
                                        Data user tidak ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* TAMPILAN MOBILE */}
                <div className="md:hidden flex flex-col divide-y divide-neutral-100">
                    {paginatedUsers.length > 0 ? (
                        paginatedUsers.map((user) => (
                            <div key={user.id} className="p-4 bg-white hover:bg-neutral-50 transition-colors">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${user.bg}`}>
                                        {user.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-neutral-900 text-base truncate">
                                                {user.name}
                                            </span>
                                            {user.verified && (
                                                <FaCircleCheck className="text-[#0077D3] text-sm flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-neutral-500 text-xs truncate mt-0.5">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-wrap gap-1.5 flex-1 pr-4">
                                        {user.roles.map((role, idx) => renderRoleBadge(role, idx))}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button className="p-2 bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 rounded-lg transition-colors">
                                            <FiEdit2 size={16} />
                                        </button>
                                        <button className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors">
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-neutral-500 text-sm">
                            Data user tidak ditemukan.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-[#F4F7FB] p-4 border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-neutral-500 font-medium text-center md:text-left">
                    Showing {paginatedUsers.length} of {filteredUsers.length} entries
                </div>

                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    className="mt-0" 
                />
            </div>
        </div>
    );
}

ManagementUser.layout = (page) => <AdminLayout title="Dasbor - Admin" subtitle="Selamat datang, Admin!">{page}</AdminLayout>;