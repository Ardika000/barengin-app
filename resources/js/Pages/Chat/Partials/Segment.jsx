import React from "react";
import { useTranslation } from "@/lib/useTranslation";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

export default function Segment({ value, onChange, personalUnread = 0, groupUnread = 0 }) {
    const { t } = useTranslation();
    return (
        <div className="flex w-full rounded-full border border-neutral-300 bg-white p-1">
            {[
                { value: "personal", label: t("chat.tab_personal"), count: personalUnread },
                { value: "groups", label: t("chat.tab_groups"), count: groupUnread },
            ].map((it) => {
                const active = it.value === value;
                return (
                    <button
                        key={it.value}
                        type="button"
                        onClick={() => onChange(it.value)}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                            active
                                ? "bg-primary-700 text-white"
                                : "text-primary-700 hover:bg-primary-50",
                        )}
                    >
                        {it.label}
                        {/* Lencana jumlah chat yang punya pesan belum dibaca di tab
                            ini — supaya terlihat tab mana yang ada chat masuk tanpa
                            harus berpindah tab. */}
                        {it.count > 0 ? (
                            <span
                                className={cn(
                                    "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold leading-none",
                                    active
                                        ? "bg-white text-primary-700"
                                        : "bg-primary-600 text-white",
                                )}
                            >
                                {it.count > 99 ? "99+" : it.count}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}