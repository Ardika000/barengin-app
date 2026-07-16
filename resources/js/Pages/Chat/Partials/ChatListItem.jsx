import React from "react";
import { Link } from "@inertiajs/react";
import Avatar from "./Avatar";
import { GROUP_TYPE_STYLES } from "./groupType";
import { useTranslation } from "@/lib/useTranslation";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

export default function ChatListItem({
    active,
    avatar,
    title,
    subtitle,
    time,
    unread,
    badgeLabel,
    groupType,
    href,
    onClick,
}) {
    const { t } = useTranslation();
    const typeStyle = GROUP_TYPE_STYLES[groupType];
    const content = (
        <div className="flex items-center gap-3">
            <Avatar src={avatar} alt={title} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-neutral-700">
                            {title}
                        </div>
                        <div className="truncate text-sm text-neutral-500">
                            {subtitle}
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="text-xs text-neutral-500">{time}</span>
                        {unread ? (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-700 px-1 text-[11px] font-semibold text-white">
                                {unread}
                            </span>
                        ) : (
                            <div className="h-5" />
                        )}
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {typeStyle ? (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
                                typeStyle.chip,
                            )}
                        >
                            <typeStyle.icon className="h-3 w-3" />
                            {t(typeStyle.key, typeStyle.fallback)}
                        </span>
                    ) : null}

                    {badgeLabel ? (
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700">
                            {badgeLabel}
                        </span>
                    ) : null}
                </div>
            </div>
        </div>
    );

    const className = cn(
        "block w-full rounded-2xl px-4 py-3 text-left transition",
        active ? "bg-primary-50" : "hover:bg-neutral-100",
    );

    if (href) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={className}>
            {content}
        </button>
    );
}