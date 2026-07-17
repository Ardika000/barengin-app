import { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { FiCheck, FiGlobe } from "react-icons/fi";
import { FaRegBell } from "react-icons/fa";

import Button from "@/Components/Button";
import Toggle from "@/Components/Toggle";
import { useTranslation } from "@/lib/useTranslation";

// Urutan tampil kategori notifikasi. Kuncinya harus cocok dengan
// UserNotification::CATEGORIES di backend.
const NOTIF_CATEGORIES = [
    "pergi_bareng",
    "group",
    "order",
    "payment",
    "split_bill",
    "jastip_request",
    "selling",
];

function Section({ icon: Icon, title, hint, children }) {
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <h2 className="font-semibold text-neutral-900">{title}</h2>
                    <p className="mt-0.5 text-sm text-neutral-500">{hint}</p>
                </div>
            </div>

            <div className="mt-5">{children}</div>
        </section>
    );
}

export default function SettingsPanel({ notificationPrefs = {} }) {
    const { t } = useTranslation();
    const { props } = usePage();

    const languages = props?.languages ?? [];
    const locale = props?.locale ?? "id";

    const [prefs, setPrefs] = useState(() => {
        const initial = {};
        for (const key of NOTIF_CATEGORIES) {
            initial[key] = notificationPrefs[key] ?? true;
        }
        return initial;
    });
    const [saving, setSaving] = useState(false);

    const changeLanguage = (code) => {
        if (code === locale) return;
        router.post(`/locale/${code}`, {}, { preserveScroll: true });
    };

    const savePrefs = () => {
        if (saving) return;
        setSaving(true);
        router.post(
            "/notifications/preferences",
            { prefs },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div className="space-y-5">
            <Section
                icon={FiGlobe}
                title={t("settings.language_label")}
                hint={t("settings.language_hint")}
            >
                <div className="space-y-2">
                    {languages.map((lang) => {
                        const active = lang.code === locale;

                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => changeLanguage(lang.code)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                                    active
                                        ? "border-primary-200 bg-primary-50 font-semibold text-primary-700"
                                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <span className="w-7 shrink-0 text-xs font-bold uppercase text-neutral-400">
                                        {lang.code}
                                    </span>
                                    <span>{lang.native_name || lang.name}</span>
                                </span>
                                {active && <FiCheck className="h-4 w-4 shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </Section>

            <Section
                icon={FaRegBell}
                title={t("settings.notif_label")}
                hint={t("settings.notif_hint")}
            >
                <div className="divide-y divide-neutral-100">
                    {NOTIF_CATEGORIES.map((key) => (
                        <div
                            key={key}
                            className="flex items-start justify-between gap-4 py-3 first:pt-0"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-neutral-800">
                                    {t(`settings.notif.${key}`)}
                                </p>
                                <p className="mt-0.5 text-xs text-neutral-500">
                                    {t(`settings.notif.${key}_hint`)}
                                </p>
                            </div>

                            <div className="shrink-0 pt-0.5">
                                <Toggle
                                    id={`notif-${key}`}
                                    name={`notif-${key}`}
                                    checked={prefs[key]}
                                    onChange={(next) =>
                                        setPrefs((p) => ({ ...p, [key]: next }))
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    type="primary"
                    variant="solid"
                    size="sm"
                    onClick={savePrefs}
                    className={`mt-5 w-full sm:w-auto ${
                        saving ? "opacity-60 cursor-wait pointer-events-none" : ""
                    }`}
                >
                    {saving ? t("common.processing") : t("settings.save")}
                </Button>
            </Section>
        </div>
    );
}
