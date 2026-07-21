import React, { useState, useEffect, useRef } from "react";
import { Head, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Pagination from "@/Components/Pagination";
import ConfirmModal from "@/Components/ConfirmModal";
import EmptyState from "@/Components/EmptyState";
import { useTranslation } from "@/lib/useTranslation";
import { FiSearch, FiChevronDown, FiTrash2, FiMessageSquare } from "react-icons/fi";

export default function Message({ messages = {}, filters = {} }) {
    const { t } = useTranslation();
    // Pastikan filters berupa objek (Laravel bisa mengirim array kosong []),
    // jika tidak, `filters.filter` bisa menunjuk ke Array.prototype.filter.
    const f = filters && !Array.isArray(filters) ? filters : {};

    const [searchTerm, setSearchTerm] = useState(typeof f.search === "string" ? f.search : "");
    const [filter, setFilter] = useState(typeof f.filter === "string" ? f.filter : "all");
    const messageData = messages.data || [];

    const visit = (params) => {
        router.get("/admin/message", { search: searchTerm || undefined, filter: filter !== "all" ? filter : undefined, ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // ==========================================
    // STATE UNTUK MODAL POPUP DELETE
    // ==========================================
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        msgId: null,
        msgName: "",
    });

    // 1. Fungsi Buka Popup
    const openDeleteModal = (id, name) => {
        setDeleteModal({
            isOpen: true,
            msgId: id,
            msgName: name,
        });
    };

    // 2. Fungsi Eksekusi Hapus
    const confirmDelete = () => {
        router.delete(`/admin/message/${deleteModal.msgId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteModal({ isOpen: false, msgId: null, msgName: "" });
            },
        });
    };

    // 3. Fungsi Tutup Popup
    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, msgId: null, msgName: "" });
    };

    // Fungsi Ganti Halaman
    const handlePageChange = (page) => visit({ page });

    // Pencarian live (debounce) - konsisten dengan halaman dashboard lain.
    // Lewati eksekusi pertama saat mount agar tidak memicu reload tanpa perlu.
    const didMount = useRef(false);
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }
        const timeout = setTimeout(() => visit({ page: 1 }), 350);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    // Fungsi Filter (periode)
    const handleFilter = (e) => {
        const value = e.target.value;
        setFilter(value);
        router.get("/admin/message", { search: searchTerm || undefined, filter: value !== "all" ? value : undefined, page: 1 }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AdminLayout title="Dasbor - Admin">
            <Head title="Manajemen Pesan" />

            <ConfirmModal
                open={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title={t("admin.messages.delete_title")}
                description={<>{t("admin.messages.delete_desc_prefix")} <span className="font-semibold text-neutral-700">{deleteModal.msgName}</span>{t("admin.messages.delete_desc_suffix")}</>}
            />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{t("admin.messages.title")}</h1>
                <p className="text-neutral-500 text-sm">{t("admin.messages.subtitle")}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8 flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder={t("admin.messages.search_ph")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-400 rounded-xl focus:outline-none focus:border-primary-700 text-sm transition-all"
                        />
                    </div>
                    <div className="relative w-full md:w-44 shrink-0">
                        <select
                            value={filter}
                            onChange={handleFilter}
                            className="appearance-none w-full pl-4 pr-10 py-2.5 rounded-xl border border-neutral-400 bg-white text-sm focus:border-primary-700 outline-none cursor-pointer transition-all"
                        >
                            <option value="all">{t("admin.messages.filter_all")}</option>
                            <option value="today">{t("admin.messages.filter_today")}</option>
                            <option value="week">{t("admin.messages.filter_week")}</option>
                            <option value="month">{t("admin.messages.filter_month")}</option>
                        </select>
                        <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                    </div>
                </div>

                {/* Message List & Empty State */}
                <div className="flex flex-col flex-1">
                    {messageData.length > 0 ? (
                        messageData.map((msg, index) => (
                            <div 
                                key={msg.id} 
                                className={`flex items-start justify-between gap-4 py-5 ${
                                    index !== messageData.length - 1 ? "border-b border-neutral-100" : ""
                                }`}
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <h3 className="text-primary-700 font-semibold text-[15px] truncate">
                                        {msg.name}
                                    </h3>
                                    <span className="text-neutral-500 text-xs italic mb-2 truncate">
                                        {msg.email}
                                    </span>
                                    <p className="text-neutral-700 text-sm leading-relaxed">
                                        {msg.body}
                                    </p>
                                </div>

                                <div className="flex-shrink-0 mt-1">
                                    <button
                                        onClick={() => openDeleteModal(msg.id, msg.name)}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                                        title={t("admin.messages.action_delete")}
                                    >
                                        <FiTrash2 className="text-lg" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            icon={<FiMessageSquare size={32} />}
                            title={t("admin.messages.empty_title")}
                            description={t("admin.messages.empty_desc")}
                            className="flex-1"
                        />
                    )}
                </div>

                {messages.last_page > 1 && (
                    <Pagination 
                        currentPage={messages.current_page}
                        totalPages={messages.last_page}
                        onPageChange={handlePageChange}
                        className="mt-10"
                    />
                )}
            </div>
        </AdminLayout>
    );
}