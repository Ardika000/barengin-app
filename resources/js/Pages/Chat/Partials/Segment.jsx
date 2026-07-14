import React from "react";
import { useTranslation } from "@/lib/useTranslation";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

export default function Segment({ value, onChange }) {
    const { t } = useTranslation();
    return (
        <div className="flex w-full rounded-full border border-neutral-300 bg-white p-1">
            {[
                { value: "personal", label: t("chat.tab_personal") },
                { value: "groups", label: t("chat.tab_groups") },
            ].map((it) => {
                const active = it.value === value;
                return (
                    <button
                        key={it.value}
                        type="button"
                        onClick={() => onChange(it.value)}
                        className={cn(
                            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition",
                            active
                                ? "bg-primary-700 text-white"
                                : "text-primary-700 hover:bg-primary-50",
                        )}
                    >
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
}