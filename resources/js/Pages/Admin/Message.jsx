import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout"; // Sesuaikan path jika berbeda
import Button from "@/Components/Button"; // Menggunakan komponen Button yang kamu berikan
import {
    FiSearch,
    FiChevronDown,
    FiTrash2,
    FiChevronLeft,
    FiChevronRight,
} from "react-icons/fi";

export default function Message({ auth }) {
    // Dummy data berdasarkan gambar referensi
    const [messages, setMessages] = useState([
        {
            id: 1,
            name: "Chandra Link",
            email: "Chandralink@Gmail.Com",
            body: "Hope This Message Finds You Well. I Am Reaching Out To Inquire About The Latest Security Protocols Implemented In The V2.4 Update That Was Pushed To Our Production Environment",
        },
        {
            id: 2,
            name: "Lister Fam",
            email: "Famfamlist@Gmail.Com",
            body: "Ur Internal Compliance Team Requires A Detailed Summary Of The Encryption Standards Currently Active.",
        },
        {
            id: 3,
            name: "Chandra Link",
            email: "Chandralink@Gmail.Com",
            body: "Hope This Message Finds You Well. I Am Reaching Out To Inquire About The Latest Security Protocols Implemented In The V2.4 Update That Was Pushed To Our Production Environment",
        },
        {
            id: 4,
            name: "Lister Fam",
            email: "Famfamlist@Gmail.Com",
            body: "Ur Internal Compliance Team Requires A Detailed Summary Of The Encryption Standards Currently Active.",
        },
        {
            id: 5,
            name: "Chandra Link",
            email: "Chandralink@Gmail.Com",
            body: "Hope This Message Finds You Well. I Am Reaching Out To Inquire About The Latest Security Protocols Implemented In The V2.4 Update That Was Pushed To Our Production Environment",
        },
    ]);

    // Fungsi simulasi hapus pesan
    const handleDelete = (id) => {
        // Logika Inertia.js nantinya: router.delete(`/Admin/messages/${id}`)
        setMessages(messages.filter((msg) => msg.id !== id));
    };

    return (
        <AdminLayout
            title="Dasbor - Admin"
            subtitle={`Selamat datang, ${auth?.user?.full_name || "Admin"}!`}
        >
            <Head title="Manajemen Pesan" />

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8">
                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-neutral-800 mb-1">
                        Pesan
                    </h1>
                    <p className="text-neutral-500 text-sm">
                        Baca dan dengarkan setiap masukan maupun kritik dari
                        user untuk Barengin
                    </p>
                </div>

                {/* Toolbar: Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-lg" />
                        <input
                            type="text"
                            placeholder="Cari message..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        />
                    </div>
                    <button className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 transition-colors w-full md:w-auto shrink-0">
                        <span>Filter By</span>
                        <FiChevronDown className="text-neutral-400" />
                    </button>
                </div>

                {/* Message List */}
                <div className="flex flex-col">
                    {messages.length > 0 ? (
                        messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className={`flex items-start justify-between gap-4 py-5 ${
                                    index !== messages.length - 1
                                        ? "border-b border-neutral-100"
                                        : ""
                                }`}
                            >
                                {/* Konten Pesan - Menggunakan min-w-0 agar teks panjang bisa ter-truncate atau wrap dengan baik tanpa mendorong tombol hapus keluar layar */}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <h3 className="text-primary-600 font-semibold text-[15px] truncate">
                                        {msg.name}
                                    </h3>
                                    <span className="text-neutral-500 text-xs italic mb-2 truncate">
                                        {msg.email}
                                    </span>
                                    <p className="text-neutral-700 text-sm leading-relaxed">
                                        {msg.body}
                                    </p>
                                </div>

                                {/* Action Delete - Menggunakan flex-shrink-0 sesuai aturan Tailwindmu */}
                                <div className="flex-shrink-0 mt-1">
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                        title="Hapus Pesan"
                                    >
                                        <FiTrash2 className="text-lg" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-neutral-500">
                            Belum ada pesan saat ini.
                        </div>
                    )}
                </div>

                {/* Pagination (Static UI menyesuaikan gambar) */}
                <div className="flex items-center justify-center gap-2 mt-10">
                    <button className="flex items-center gap-1 px-3 py-2 text-sm text-neutral-400 cursor-not-allowed">
                        <FiChevronLeft className="text-lg" /> Prev
                    </button>

                    {/* Active Page */}
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600 font-medium border border-primary-300">
                        1
                    </button>

                    {/* Inactive Pages */}
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 hover:bg-neutral-100">
                        2
                    </button>

                    <span className="w-10 h-10 flex items-center justify-center text-neutral-400">
                        ...
                    </span>

                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 hover:bg-neutral-100">
                        9
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 hover:bg-neutral-100">
                        10
                    </button>

                    <button className="flex items-center gap-1 px-3 py-2 text-sm text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                        Next <FiChevronRight className="text-lg" />
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
