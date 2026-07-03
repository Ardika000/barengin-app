import React from "react";
import { Head, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import { useTranslation } from "@/lib/useTranslation";
import { FiGlobe } from "react-icons/fi";

export default function Languages({ manageLanguages = [] }) {
    const { t } = useTranslation();
    const languages = manageLanguages;
    const toggle = (lang) => {
        if (lang.is_default) return;
        router.post(`/admin/languages/${lang.id}/toggle`, {}, { preserveScroll: true });
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-neutral-700">{t("admin.nav.languages")}</h1>
                <p className="text-neutral-500 text-sm">{t("admin.languages.subtitle")}</p>
            </div>
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <Head title="Manajemen Bahasa" />

            <div className="p-4 sm:p-6 border-b border-neutral-100">
                <p className="text-sm text-neutral-500">
                    {t("admin.languages.desc")}
                </p>
            </div>

            <div className="divide-y divide-neutral-100">
                {languages.map((lang) => (
                    <div
                        key={lang.id ?? lang.code}
                        className="flex items-center justify-between gap-4 p-4 sm:px-6"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                                <FiGlobe size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-neutral-700">
                                        {lang.name}
                                    </span>
                                    <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neutral-500">
                                        {lang.code}
                                    </span>
                                    {lang.is_default && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                                            {t("admin.languages.default_badge")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500">
                                    {lang.native_name || lang.name}
                                    {" · "}
                                    {lang.is_active ? t("admin.languages.active") : t("admin.languages.inactive")}
                                </p>
                            </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                            type="button"
                            onClick={() => toggle(lang)}
                            disabled={lang.is_default}
                            title={
                                lang.is_default
                                    ? t("admin.languages.toggle_disabled_title")
                                    : lang.is_active
                                        ? t("admin.languages.toggle_disable_title")
                                        : t("admin.languages.toggle_enable_title")
                            }
                            className={`relative h-6 w-12 shrink-0 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                                lang.is_active ? "bg-primary-700" : "bg-neutral-300"
                            } ${lang.is_default ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                            <span
                                className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                                    lang.is_active ? "translate-x-6" : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>
                ))}

                {languages.length === 0 && (
                    <div className="py-12 text-center text-neutral-500 text-sm">
                        {t("admin.languages.empty")}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}

Languages.layout = (page) => (
    <AdminLayout title="Dasbor - Admin">
        {page}
    </AdminLayout>
);
