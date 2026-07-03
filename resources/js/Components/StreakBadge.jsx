import { FaFire } from "react-icons/fa";
import { useTranslation } from "@/lib/useTranslation";

// Badge streak "Nyala" — dipakai di navbar. Menyala (oranye) saat streak aktif,
// abu-abu saat belum ada streak.
export default function StreakBadge({ count = 0, className = "" }) {
    const { t } = useTranslation();
    const active = count > 0;

    return (
        <span
            title={
                active
                    ? t("streak.tooltip_active").replace("{n}", count)
                    : t("streak.tooltip_inactive")
            }
            aria-label={t("streak.aria").replace("{n}", count)}
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-bold leading-none select-none transition-colors",
                active
                    ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100 hover:bg-orange-100"
                    : "bg-neutral-100 text-neutral-400 ring-1 ring-neutral-200 hover:bg-neutral-200/70",
                className,
            ].join(" ")}
        >
            <FaFire className={active ? "text-orange-500" : "text-neutral-400"} />
            {count}
        </span>
    );
}
