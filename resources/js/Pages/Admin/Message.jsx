import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout"; 
import Pagination from "@/Components/Pagination";
import { FiSearch, FiChevronDown, FiTrash2, FiAlertCircle, FiMessageSquare } from "react-icons/fi";

export default function Message({ auth, messages = {}, filters = {} }) {
    
    const [searchTerm, setSearchTerm] = useState(filters.search || "");
    const messageData = messages.data || [];

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
        router.delete(`/Admin/message/${deleteModal.msgId}`, {
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
    const handlePageChange = (page) => {
        router.get(`/Admin/message`, { search: searchTerm, page: page }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Fungsi Pencarian (Search)
    const handleSearch = (e) => {
        if (e.key === "Enter") {
            router.get(`/Admin/message`, { search: searchTerm }, {
                preserveState: true,
            });
        }
    };

    return (
        <AdminLayout 
            title="Dasbor - Admin" 
            subtitle={`Selamat datang, ${auth?.user?.full_name || 'Admin'}!`}
        >
            <Head title="Manajemen Pesan" />

            {/* ==========================================
                KODE POPUP / MODAL DELETE
            ========================================== */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiAlertCircle size={32} />
                            </div>
                            
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">Hapus Pesan?</h3>
                            
                            <p className="text-neutral-500 text-sm mb-6 leading-relaxed">
                                Apakah kamu yakin ingin menghapus pesan dari <br/>
                                <span className="font-bold text-neutral-900">{deleteModal.msgName}</span>?
                            </p>
                            
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={closeDeleteModal}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-sm transition-colors"
                                >
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8 min-h-[500px] flex flex-col">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-neutral-800 mb-1">Pesan</h1>
                    <p className="text-neutral-500 text-sm">
                        Baca dan dengarkan setiap masukan maupun kritik dari user untuk Barengin
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg" />
                        <input
                            type="text"
                            placeholder="Cari message... (Tekan Enter)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0077D3] focus:border-transparent text-sm transition-all"
                        />
                    </div>
                    <button className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors w-full md:w-auto shrink-0">
                        <span>Filter By</span>
                        <FiChevronDown className="text-neutral-400" />
                    </button>
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
                                    <h3 className="text-[#0077D3] font-semibold text-[15px] truncate">
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
                                        title="Hapus Pesan"
                                    >
                                        <FiTrash2 className="text-lg" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        /* TAMPILAN EMPTY STATE */
                        <div className="flex flex-col items-center justify-center flex-1 py-12 text-neutral-400">
                            <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                                <FiMessageSquare size={32} className="text-neutral-300" />
                            </div>
                            <h3 className="text-neutral-600 font-semibold mb-1">Belum ada pesan</h3>
                            <p className="text-sm text-center max-w-sm">
                                Saat ini belum ada masukan atau kritik dari user. Pesan yang dikirim melalui halaman utama akan muncul di sini.
                            </p>
                        </div>
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