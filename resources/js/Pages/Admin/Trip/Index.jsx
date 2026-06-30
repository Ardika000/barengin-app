import React, { useState, useMemo } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiUploadCloud, FiExternalLink, FiAlertCircle } from "react-icons/fi";

const STATUS_STYLES = {
    draft: "bg-blue-100 text-blue-700",
    created: "bg-sky-100 text-sky-700",
    ongoing: "bg-orange-100 text-orange-700",
    done: "bg-green-100 text-green-700",
};

const STATUS_ORDER = { draft: 0, created: 1, ongoing: 2, done: 3 };

export default function Index({ trips = [] }) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("latest");
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });
    const [publishModal, setPublishModal] = useState({ open: false, id: null, name: "" });

    const rows = useMemo(() => {
        const q = search.toLowerCase();
        let list = trips.filter((t) => t.name?.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q));

        if (sortBy === "seats") list = [...list].sort((a, b) => b.joined - a.joined);
        else if (sortBy === "status") list = [...list].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
        // "latest" -> sudah diurutkan dari server (created_at desc)

        return list;
    }, [trips, search, sortBy]);

    const confirmDelete = () => {
        router.delete(`/admin/trip/${deleteModal.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ open: false, id: null, name: "" }),
        });
    };
    const confirmPublish = () => {
        router.post(`/admin/trip/${publishModal.id}/publish`, {}, {
            preserveScroll: true,
            onSuccess: () => setPublishModal({ open: false, id: null, name: "" }),
        });
    };

    const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <Head title="Manajemen Trip" />

            <ConfirmModal
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
                onConfirm={confirmDelete}
                icon={<FiAlertCircle size={26} />}
                iconClass="bg-red-100 text-red-500"
                title="Hapus Draft Trip?"
                description={<>Yakin ingin menghapus <span className="font-semibold text-neutral-700">{deleteModal.name}</span>?</>}
                confirmLabel="Ya, Hapus"
                confirmClass="bg-red-600 hover:bg-red-700"
            />
            <ConfirmModal
                open={publishModal.open}
                onClose={() => setPublishModal({ open: false, id: null, name: "" })}
                onConfirm={confirmPublish}
                icon={<FiUploadCloud size={26} />}
                iconClass="bg-blue-100 text-primary-700"
                title="Publish Trip?"
                description={<>Setelah dipublish, <span className="font-semibold text-neutral-700">{publishModal.name}</span> akan tampil di Trip Bareng dan tidak bisa diedit/dihapus lagi.</>}
                confirmLabel="Ya, Publish"
                confirmClass="bg-primary-700 hover:bg-blue-700"
            />

            {/* Toolbar */}
            <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type="text" placeholder="Cari trip..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-400 focus:border-primary-700 outline-none text-sm transition-all" />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            className="appearance-none w-44 pl-4 pr-10 py-2.5 rounded-xl border border-neutral-400 bg-white text-sm focus:border-primary-700 outline-none cursor-pointer transition-all">
                            <option value="latest">Terbaru</option>
                            <option value="seats">Kursi Terisi</option>
                            <option value="status">Status</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <Button isButtonLink href="/admin/trip/create" size="sm" className="gap-2 whitespace-nowrap">
                        Buat Perjalanan <FiPlus />
                    </Button>
                </div>
            </div>

            {/* Tabel (struktur konsisten dengan halaman dashboard lain) */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                        <tr className="bg-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                            <th className="py-3 px-5">Trip</th>
                            <th className="py-3 px-5">Lokasi</th>
                            <th className="py-3 px-5">Tanggal</th>
                            <th className="py-3 px-5">Harga</th>
                            <th className="py-3 px-5">Jml. Kursi</th>
                            <th className="py-3 px-5">Status</th>
                            <th className="py-3 px-5 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {rows.length > 0 ? (
                            rows.map((t) => (
                                <tr key={t.id} className="hover:bg-neutral-50/50 transition">
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center gap-3">
                                            <img src={t.image} alt={t.name} className="w-11 h-11 rounded-lg object-cover border border-neutral-200"
                                                onError={(e) => (e.target.src = "/assets/trip-bareng/list-trip/gunung_bromo/trip_bareng-gunung_bromo-1.jpg")} />
                                            <span className="font-semibold text-neutral-700 text-sm max-w-[180px] truncate">{t.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-5 text-sm text-neutral-600 max-w-[160px]"><span className="line-clamp-2">{t.location}</span></td>
                                    <td className="py-3.5 px-5 text-sm text-neutral-700 whitespace-nowrap">{t.date_label}</td>
                                    <td className="py-3.5 px-5 text-sm font-semibold text-neutral-700 whitespace-nowrap">{rupiah(t.price)}</td>
                                    <td className="py-3.5 px-5 text-sm font-semibold text-primary-700 whitespace-nowrap">{t.joined}/{t.capacity}</td>
                                    <td className="py-3.5 px-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[t.status] || "bg-neutral-100 text-neutral-600"}`}>
                                            {t.status_label}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-5">
                                        <div className="flex items-center justify-center gap-2">
                                            {t.is_draft ? (
                                                <>
                                                    <Link href={`/admin/trip/${t.id}/edit`} title="Edit draft"
                                                        className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors">
                                                        <FiEdit2 size={16} />
                                                    </Link>
                                                    <button onClick={() => setPublishModal({ open: true, id: t.id, name: t.name })} title="Publish"
                                                        className="p-2 bg-blue-50 text-primary-700 hover:bg-blue-100 rounded-lg transition-colors">
                                                        <FiUploadCloud size={16} />
                                                    </button>
                                                    <button onClick={() => setDeleteModal({ open: true, id: t.id, name: t.name })} title="Hapus"
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </>
                                            ) : t.status !== "done" ? (
                                                <Link href={`/trip-bareng/${t.id}`} title="Lihat di Trip Bareng"
                                                    className="p-2 bg-blue-50 text-primary-700 hover:bg-blue-100 rounded-lg transition-colors">
                                                    <FiExternalLink size={16} />
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-neutral-400">—</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="py-12 text-center text-neutral-500 text-sm">
                                    Belum ada trip. Klik "Buat Perjalanan" untuk membuat draft pertama.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

Index.layout = (page) => (
    <AdminLayout title="Dasbor - Home" subtitle="Selamat datang, Pemandu!">
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-700">Aktivitas Pembuatan Perjalanan</h1>
            <p className="text-neutral-500 text-sm">Kelola trip, publikasikan, dan pantau statusnya.</p>
        </div>
        {page}
    </AdminLayout>
);
