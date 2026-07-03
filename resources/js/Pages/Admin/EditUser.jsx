import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Input from "@/Components/Input";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft, FiAlertTriangle } from "react-icons/fi";
import { FaKey } from "react-icons/fa6"; // Menggunakan FaKey untuk icon verify

export default function EditUser({ user }) {
    const { t } = useTranslation();
    // Guard ringan agar tidak error bila prop user belum tersedia (tanpa data palsu).
    const safeUser = user ?? {};

    // Inertia useForm untuk menghandle data yang BISA diubah (Roles & Verification)
    const { data, setData, put, processing } = useForm({
        is_guider: safeUser.is_guider,
        is_admin: safeUser.is_admin,
        verified: safeUser.is_verified === 1 || safeUser.is_verified === true,
    });

    // State untuk Modal Verifikasi
    const [modalType, setModalType] = useState(null); // 'verify' | 'unverify' | null

    // ==========================================
    // LOGIKA TOGGLE VERIFICATION
    // ==========================================
    const handleToggleClick = () => {
        // Jika saat ini terverifikasi (true), maka munculkan popup unverify
        if (data.verified) {
            setModalType("unverify");
        } else {
            // Jika saat ini belum terverifikasi (false), munculkan popup verify
            setModalType("verify");
        }
    };

    const confirmVerificationChange = () => {
        if (modalType === "verify") {
            setData("verified", true);
        } else if (modalType === "unverify") {
            setData("verified", false);
        }
        setModalType(null); // Tutup modal setelah konfirmasi
    };

    const closeModal = () => setModalType(null);

    // ==========================================
    // LOGIKA SUBMIT FORM
    // ==========================================
    const handleSubmit = (e) => {
        e.preventDefault();
        // Kirim perubahan role & verifikasi ke backend
        put(`/admin/management-user/${safeUser.id}`);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden min-h-[500px] relative pb-10">
            <Head title="Edit Pengguna" />

            {/* ==========================================
                MODAL POPUP: VERIFY & UNVERIFY
            ========================================== */}
            {modalType && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/40 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
                        <div className="p-6">
                            {/* Header Modal */}
                            <div className="flex items-start gap-4 mb-4">
                                {modalType === "verify" ? (
                                    <div className="w-12 h-12 bg-[#E1F0FF] text-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FaKey size={20} />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FiAlertTriangle size={24} />
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-lg font-bold text-neutral-700 mb-1">
                                        {modalType === "verify" ? t("admin.edit_user.verify_modal_title") : t("admin.edit_user.unverify_modal_title")}
                                    </h3>
                                    <p className="text-neutral-500 text-sm leading-relaxed">
                                        {modalType === "verify"
                                            ? t("admin.edit_user.verify_modal_desc")
                                            : t("admin.edit_user.unverify_modal_desc")}
                                    </p>
                                </div>
                            </div>

                            {/* Tombol Modal */}
                            <div className="flex items-center justify-end gap-3 mt-6 bg-neutral-50 -mx-6 -mb-6 p-4 border-t border-neutral-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 font-semibold hover:bg-neutral-50 transition-colors"
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmVerificationChange}
                                    className={`px-5 py-2.5 rounded-xl font-semibold text-white shadow-sm transition-colors ${
                                        modalType === "verify"
                                            ? "bg-primary-700 hover:bg-blue-700"
                                            : "bg-red-600 hover:bg-red-700"
                                    }`}
                                >
                                    {modalType === "verify" ? t("admin.edit_user.confirm_verify") : t("admin.edit_user.confirm_unverify")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
                HEADER HALAMAN
            ========================================== */}
            <div className="p-6 border-b border-neutral-100 flex items-center gap-4">
                <Link
                    href="/admin/management-user"
                    className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-600"
                >
                    <FiChevronLeft size={24} />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-neutral-700">{t("admin.edit_user.title")}</h2>
                    <p className="text-neutral-500 text-sm">{t("admin.edit_user.subtitle")}</p>
                </div>
            </div>

            {/* ==========================================
                FORM AREA
            ========================================== */}
            <form onSubmit={handleSubmit} className="p-6 max-w-3xl">
                {/* --- Profile Picture --- */}
                <div className="flex items-center gap-6 mb-8">
                    <img
                        src={safeUser.public_profile_image || "/assets/default-profile.png"}
                        alt="Profile"
                        className="w-20 h-20 rounded-2xl object-cover border border-neutral-200"
                        onError={(e) => { e.target.src = "/assets/default-profile.png"; }}
                    />
                    <div>
                        <h4 className="font-semibold text-neutral-700 mb-1">{t("admin.edit_user.photo_label")}</h4>
                        <p className="text-xs text-neutral-500 mb-2">{t("admin.edit_user.photo_hint")}</p>
                        <button type="button" className="text-primary-700 text-sm font-semibold hover:underline">
                            {t("admin.edit_user.remove_photo")}
                        </button>
                    </div>
                </div>

                {/* --- READ ONLY FIELDS (Data Diri) --- */}
                <div className="space-y-5 mb-8">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-neutral-700">{t("admin.edit_user.full_name")}</label>
                        <Input type="text" value={safeUser.full_name ?? ""} disabled />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-neutral-700">{t("admin.edit_user.username")}</label>
                        <Input type="text" value={safeUser.username ?? ""} disabled />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-neutral-700">{t("admin.edit_user.email")}</label>
                        <Input type="email" value={safeUser.email ?? ""} disabled />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-neutral-700">{t("admin.edit_user.bio")}</label>
                        <textarea
                            value={safeUser.bio ?? ""}
                            disabled
                            rows="3"
                            className="w-full px-4 py-3 rounded-xl border border-neutral-400 bg-white text-neutral-700 placeholder:text-neutral-500 resize-none disabled:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-70 focus:border-primary-700 focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-neutral-700">{t("admin.edit_user.phone")}</label>
                            <Input type="text" value={safeUser.phone ?? ""} disabled />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-neutral-700">{t("admin.edit_user.birth_date")}</label>
                            <Input type="text" value={safeUser.birth_date ?? ""} disabled />
                        </div>
                    </div>
                </div>

                {/* --- EDITABLE FIELDS (Roles) --- */}
                <div className="mb-8">
                    <label className="text-sm font-semibold text-neutral-700 block mb-3">{t("admin.edit_user.roles_label")}</label>
                    <div className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">

                        {/* Guider Checkbox Card */}
                        <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${data.is_guider ? "border-primary-700 bg-blue-50/30" : "border-neutral-200 hover:bg-neutral-50"}`}>
                            <div>
                                <div className="font-bold text-neutral-700 text-sm mb-0.5">{t("admin.edit_user.guider_title")}</div>
                                <div className="text-xs text-neutral-500">{t("admin.edit_user.guider_desc")}</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={data.is_guider}
                                onChange={(e) => setData("is_guider", e.target.checked)}
                                className="w-5 h-5 rounded border-neutral-300 text-primary-700 focus:ring-primary-700 cursor-pointer"
                            />
                        </label>

                        {/* Admin Checkbox Card */}
                        <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${data.is_admin ? "border-primary-700 bg-blue-50/30" : "border-neutral-200 hover:bg-neutral-50"}`}>
                            <div>
                                <div className="font-bold text-neutral-700 text-sm mb-0.5">{t("admin.edit_user.admin_title")}</div>
                                <div className="text-xs text-neutral-500">{t("admin.edit_user.admin_desc")}</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={data.is_admin}
                                onChange={(e) => setData("is_admin", e.target.checked)}
                                className="w-5 h-5 rounded border-neutral-300 text-primary-700 focus:ring-primary-700 cursor-pointer"
                            />
                        </label>

                    </div>
                </div>

                {/* --- USER VERIFICATION TOGGLE --- */}
                <div className="mb-10">
                    <label className="text-sm font-semibold text-neutral-700 block mb-3">{t("admin.edit_user.verify_label")}</label>
                    <div className="flex items-center gap-3">
                        {/* Custom Tailwind Switch */}
                        <button
                            type="button"
                            onClick={handleToggleClick}
                            className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors duration-300 ease-in-out focus:outline-none ${
                                data.verified ? "bg-primary-700" : "bg-neutral-300"
                            }`}
                        >
                            <div
                                className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
                                    data.verified ? "translate-x-6" : "translate-x-0"
                                }`}
                            />
                        </button>
                        <span className="text-sm font-medium text-primary-700 cursor-pointer" onClick={handleToggleClick}>
                            {data.verified ? t("admin.edit_user.verify_click_on") : t("admin.edit_user.verify_click_off")}
                        </span>
                    </div>
                </div>

                {/* --- SUBMIT BUTTON --- */}
                <button
                    type="submit"
                    disabled={processing}
                    className="px-8 py-3 bg-primary-700 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {t("admin.edit_user.submit")}
                </button>
            </form>
        </div>
    );
}

EditUser.layout = (page) => (
    <AdminLayout title="Dasbor - Admin">
        {page}
    </AdminLayout>
);