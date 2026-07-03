import React, { useState, useMemo, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Pagination from "@/Components/Pagination";
import ConfirmModal from "@/Components/ConfirmModal";
import { useTranslation } from "@/lib/useTranslation";

import { FiSearch, FiTrash2, FiEdit2 } from "react-icons/fi";
import { FaCircleCheck } from "react-icons/fa6";

// Helper: Inisial Nama
const getInitials = (name) => {
    if (!name) return "U";
    const words = name.split(" ");
    if (words.length > 1) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Helper: Background Acak
const getRandomBg = (id) => {
    const colors = [
        "bg-blue-100 text-blue-600",
        "bg-green-100 text-green-600",
        "bg-red-100 text-red-600",
        "bg-purple-100 text-purple-600",
        "bg-orange-100 text-orange-600",
        "bg-pink-100 text-pink-600",
    ];
    const safeId = parseInt(id) || 0;
    return colors[safeId % colors.length];
};

export default function ManagementUser({ users = [] }) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // ==========================================
    // STATE UNTUK MODAL POPUP DELETE
    // ==========================================
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        userId: null,
        userName: "",
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterRole]);

    // Format Data
    const formattedUsers = useMemo(() => {
        if (!users || users.length === 0) return [];

        return users.map((user) => {
            const userRoles = [];
            if (user.is_admin) userRoles.push("admin");
            if (user.is_guider) userRoles.push("guider");
            if (userRoles.length === 0) userRoles.push("user");

            return {
                id: user.id,
                name: user.full_name,
                email: user.email,
                verified: user.is_verified === 1 || user.is_verified === true,
                initials: getInitials(user.full_name),
                bg: getRandomBg(user.id),
                roles: userRoles,
            };
        });
    }, [users]);

    // Filter & Search
    const filteredUsers = useMemo(() => {
        return formattedUsers.filter((user) => {
            const matchSearch =
                (user.name &&
                    user.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())) ||
                (user.email &&
                    user.email
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()));
            const matchRole = filterRole
                ? user.roles.includes(filterRole)
                : true;
            return matchSearch && matchRole;
        });
    }, [searchQuery, filterRole, formattedUsers]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // ==========================================
    // LOGIKA HAPUS (MEMBUKA MODAL LALU EKSEKUSI)
    // ==========================================
    
    // 1. Fungsi saat tombol tong sampah diklik (buka popup)
    const openDeleteModal = (userId, userName) => {
        setDeleteModal({
            isOpen: true,
            userId: userId,
            userName: userName,
        });
    };

    // 2. Fungsi saat tombol "Ya, Hapus" di dalam popup diklik
    const confirmDelete = () => {
        router.delete(`/admin/management-user/${deleteModal.userId}`, {
            preserveScroll: true,
            onSuccess: () => {
                // Tutup popup setelah berhasil dihapus
                setDeleteModal({ isOpen: false, userId: null, userName: "" });
            },
        });
    };

    // 3. Fungsi saat tombol "Batal" atau luar kotak diklik
    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, userId: null, userName: "" });
    };

    const roleLabel = (role) =>
        role === "guider"
            ? t("admin.users.role_guider")
            : role === "admin"
                ? t("admin.users.role_admin")
                : t("admin.users.role_user");

    const renderRoleBadge = (role, idx) => {
        let colorClasses = "";
        if (role === "guider") colorClasses = "bg-orange-100 text-orange-700";
        else if (role === "admin") colorClasses = "bg-blue-100 text-primary-700";
        else colorClasses = "bg-gray-100 text-gray-600";

        return (
            <span
                key={idx}
                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${colorClasses}`}
            >
                {roleLabel(role)}
            </span>
        );
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{t("admin.nav.users")}</h1>
                <p className="text-neutral-500 text-sm">{t("admin.users.subtitle")}</p>
            </div>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col relative">
            <Head title="Manajemen Pengguna" />

            <ConfirmModal
                open={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title={t("admin.users.delete_title")}
                description={<>{t("admin.users.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.userName}</span>{t("admin.users.delete_desc_suffix")}</>}
            />

            <div className="p-4 sm:p-6 border-b border-neutral-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder={t("admin.users.search_ph")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-400 focus:border-primary-700 outline-none text-sm transition-all"
                        />
                    </div>

                    <div className="relative w-full md:w-44 shrink-0">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-neutral-400 bg-white text-sm focus:border-primary-700 outline-none cursor-pointer appearance-none transition-all"
                        >
                            <option value="">{t("admin.users.filter_all")}</option>
                            <option value="guider">{t("admin.users.role_guider")}</option>
                            <option value="admin">{t("admin.users.role_admin")}</option>
                            <option value="user">{t("admin.users.role_user")}</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* TAMPILAN DESKTOP */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-neutral-100 border-y border-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                <th className="py-3 px-5">{t("admin.users.col_name")}</th>
                                <th className="py-3 px-5">{t("admin.users.col_email")}</th>
                                <th className="py-3 px-5">{t("admin.users.col_role")}</th>
                                <th className="py-3 px-5 text-center">{t("admin.users.col_action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-neutral-50/50 transition duration-150">
                                        <td className="py-3 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${user.bg}`}>
                                                    {user.initials}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-neutral-700 text-sm">
                                                        {user.name}
                                                    </span>
                                                    {user.verified && (
                                                        <FaCircleCheck className="text-primary-700 text-sm flex-shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5 text-neutral-600 text-sm">
                                            {user.email}
                                        </td>
                                        <td className="py-3 px-5">
                                            <div className="flex flex-wrap gap-2">
                                                {user.roles.map((role, idx) =>
                                                    renderRoleBadge(role, idx)
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* TOMBOL DELETE (Panggil Popup) */}
                                                <button
                                                    onClick={() => openDeleteModal(user.id, user.name)}
                                                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                                    title={t("admin.users.action_delete")}
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>

                                                {/* TOMBOL EDIT */}
                                                <Link
                                                    href={`/admin/management-user/${user.id}/edit-role`}
                                                    className="p-2 bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 rounded-lg transition-colors inline-flex items-center justify-center"
                                                    title={t("admin.users.action_edit")}
                                                >
                                                    <FiEdit2 size={16} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-neutral-500">
                                        {t("admin.users.no_results")}
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
                                            <span className="font-bold text-neutral-700 text-base truncate">
                                                {user.name}
                                            </span>
                                            {user.verified && (
                                                <FaCircleCheck className="text-primary-700 text-sm flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-neutral-500 text-xs truncate mt-0.5">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-wrap gap-1.5 flex-1 pr-4">
                                        {user.roles.map((role, idx) =>
                                            renderRoleBadge(role, idx)
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Link
                                            href={`/admin/management-user/${user.id}/edit-role`}
                                            className="p-2 bg-orange-50 text-orange-500 hover:bg-orange-100 hover:text-orange-600 rounded-lg transition-colors inline-flex"
                                        >
                                            <FiEdit2 size={16} />
                                        </Link>
                                        <button
                                            onClick={() => openDeleteModal(user.id, user.name)}
                                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-neutral-500 text-sm">
                            {t("admin.users.no_results")}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-neutral-100 p-4 border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-neutral-500 font-medium text-center md:text-left">
                    {t("common.showing")} {paginatedUsers.length} {t("common.of")} {filteredUsers.length} {t("common.data")}
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    className="mt-0"
                />
            </div>
        </div>
        </>
    );
}

ManagementUser.layout = (page) => (
    <AdminLayout title="Dasbor - Admin">
        {page}
    </AdminLayout>
);