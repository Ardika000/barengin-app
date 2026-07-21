import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Input from "@/Components/Input";
import Textarea from "@/Components/Textarea";
import Checkbox from "@/Components/Checkbox";
import Toggle from "@/Components/Toggle";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import { toast } from "@/lib/toast";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronLeft, FiAlertTriangle } from "react-icons/fi";
import { FaKey } from "react-icons/fa6";

const labelClass = "block text-sm font-semibold text-neutral-700 mb-1.5";

export default function EditUser({ user }) {
    const { t } = useTranslation();
    const safeUser = user ?? {};

    const { data, setData, put, processing } = useForm({
        is_guider: safeUser.is_guider,
        is_admin: safeUser.is_admin,
        verified: safeUser.is_verified === 1 || safeUser.is_verified === true,
    });

    const [modalType, setModalType] = useState(null); // 'verify' | 'unverify' | null

    const handleToggleClick = () => {
        if (data.verified) {
            setModalType("unverify");
        } else {
            setModalType("verify");
        }
    };

    const confirmVerificationChange = () => {
        if (modalType === "verify") {
            setData("verified", true);
        } else if (modalType === "unverify") {
            setData("verified", false);
        }
        setModalType(null);
    };

    const closeModal = () => setModalType(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(`/admin/management-user/${safeUser.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t("admin.edit_user.toast_success")),
            onError: () => toast.error(t("admin.edit_user.toast_error")),
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden min-h-[500px] relative pb-10">
            <Head title="Edit Pengguna" />

            <ConfirmModal
                open={modalType === "verify"}
                onClose={closeModal}
                onConfirm={confirmVerificationChange}
                icon={<FaKey size={20} />}
                iconClass="bg-[#E1F0FF] text-primary-700"
                title={t("admin.edit_user.verify_modal_title")}
                description={t("admin.edit_user.verify_modal_desc")}
                confirmLabel={t("admin.edit_user.confirm_verify")}
                cancelLabel={t("common.cancel")}
                confirmType="primary"
            />
            <ConfirmModal
                open={modalType === "unverify"}
                onClose={closeModal}
                onConfirm={confirmVerificationChange}
                icon={<FiAlertTriangle size={22} />}
                iconClass="bg-red-100 text-red-600"
                title={t("admin.edit_user.unverify_modal_title")}
                description={t("admin.edit_user.unverify_modal_desc")}
                confirmLabel={t("admin.edit_user.confirm_unverify")}
                cancelLabel={t("common.cancel")}
                confirmType="danger"
            />

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

            <form onSubmit={handleSubmit} className="p-6 max-w-3xl">
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
                        <button
                            type="button"
                            disabled
                            title={t("admin.edit_user.remove_photo_disabled")}
                            className="text-sm font-semibold text-neutral-300 cursor-not-allowed"
                        >
                            {t("admin.edit_user.remove_photo")}
                        </button>
                    </div>
                </div>

                <div className="space-y-5 mb-8">
                    <div>
                        <label className={labelClass}>{t("admin.edit_user.full_name")}</label>
                        <Input type="text" value={safeUser.full_name ?? ""} disabled />
                    </div>

                    <div>
                        <label className={labelClass}>{t("admin.edit_user.username")}</label>
                        <Input type="text" value={safeUser.username ?? ""} disabled />
                    </div>

                    <div>
                        <label className={labelClass}>{t("admin.edit_user.email")}</label>
                        <Input type="email" value={safeUser.email ?? ""} disabled />
                    </div>

                    <div>
                        <label className={labelClass}>{t("admin.edit_user.bio")}</label>
                        <Textarea value={safeUser.bio ?? ""} disabled rows={3} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>{t("admin.edit_user.phone")}</label>
                            <Input type="text" value={safeUser.phone ?? ""} disabled />
                        </div>
                        <div>
                            <label className={labelClass}>{t("admin.edit_user.birth_date")}</label>
                            <Input type="text" value={safeUser.birth_date ?? ""} disabled />
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <label className={`${labelClass} mb-3`}>{t("admin.edit_user.roles_label")}</label>
                    <div className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">

                        <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${data.is_guider ? "border-primary-700 bg-blue-50/30" : "border-neutral-200 hover:bg-neutral-50"}`}>
                            <div>
                                <div className="font-bold text-neutral-700 text-sm mb-0.5">{t("admin.edit_user.guider_title")}</div>
                                <div className="text-xs text-neutral-500">{t("admin.edit_user.guider_desc")}</div>
                            </div>
                            <Checkbox
                                checked={data.is_guider}
                                onChange={(checked) => setData("is_guider", checked)}
                            />
                        </label>

                        <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${data.is_admin ? "border-primary-700 bg-blue-50/30" : "border-neutral-200 hover:bg-neutral-50"}`}>
                            <div>
                                <div className="font-bold text-neutral-700 text-sm mb-0.5">{t("admin.edit_user.admin_title")}</div>
                                <div className="text-xs text-neutral-500">{t("admin.edit_user.admin_desc")}</div>
                            </div>
                            <Checkbox
                                checked={data.is_admin}
                                onChange={(checked) => setData("is_admin", checked)}
                            />
                        </label>

                    </div>
                </div>

                <div className="mb-10">
                    <label className={`${labelClass} mb-3`}>{t("admin.edit_user.verify_label")}</label>
                    <Toggle
                        checked={data.verified}
                        onChange={handleToggleClick}
                        label={data.verified ? t("admin.edit_user.verify_click_on") : t("admin.edit_user.verify_click_off")}
                        labelClassName="!text-primary-700 font-medium"
                    />
                </div>

                <Button type="primary" rounded={false} disabled={processing} className="rounded-xl font-semibold shadow-sm">
                    {t("admin.edit_user.submit")}
                </Button>
            </form>
        </div>
    );
}

EditUser.layout = (page) => (
    <AdminLayout title="Dasbor - Admin">
        {page}
    </AdminLayout>
);
