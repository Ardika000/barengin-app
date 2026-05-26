import React from "react";
import AdminLayout from "@/Layouts/AdminLayout";

export default function Dashboard() {

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 h-96">
            <h2 className="text-xl font-bold text-neutral-800">Konten Dasbor Utama</h2>
            <p className="text-neutral-500 mt-2">Ini adalah area di mana rekanmu tinggal mengisi konten tabel, grafik, dsb.</p>
        </div>
    );
}

// Pasang AdminLayout-nya di sini!
Dashboard.layout = (page) => <AdminLayout title="Admin Layout" subtitle="Selamat datang, Admin!">{page}</AdminLayout>;