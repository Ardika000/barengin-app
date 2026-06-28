import React from "react";
import Avatar from "./Avatar";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

export default function Bubble({
    mine,
    text,
    time,
    readText,
    avatar,
    attachmentUrl,
    attachmentType,
    attachmentName,
    isGroup,
    senderName,
}) {
    const isImage =
        attachmentType &&
        ["image/jpeg", "image/png", "image/webp"].includes(attachmentType);

    const isPdf = attachmentType === "application/pdf";

    const showSenderName = isGroup && !mine && senderName;

    return (
        <div className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
            <div className="flex max-w-[560px] items-end gap-3 break-words">
                {!mine ? (
                    <Avatar src={avatar} alt="avatar" className="h-9 w-9" />
                ) : null}

                <div
                    className={cn(
                        "rounded-xl border border-primary-700 bg-white px-4 py-3",
                        mine ? "rounded-br-sm" : "rounded-bl-sm",
                    )}
                >
                    {showSenderName ? (
                        <div className="mb-1 text-xs font-semibold text-primary-700 break-words">
                            {senderName}
                        </div>
                    ) : null}

                    {text ? (
                        <div className="whitespace-pre-line text-sm text-neutral-700 break-words break-all">
                            {text}
                        </div>
                    ) : null}

                    {attachmentUrl ? (
                        <div className={cn("mt-3", text ? "" : "mt-0")}>
                            {isImage ? (
                                <img
                                    src={attachmentUrl}
                                    alt={attachmentName ?? "attachment"}
                                    className="max-h-64 rounded-lg border border-neutral-200 object-cover"
                                />
                            ) : null}

                            {isPdf ? (
                                <a
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-primary-700 hover:bg-primary-50"
                                >
                                    📄 {attachmentName ?? "Dokumen PDF"}
                                </a>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="mt-2 flex items-center justify-end gap-2 text-[11px] text-neutral-500">
                        <span>{time}</span>
                        {mine && readText ? (
                            <span className="text-primary-700">{readText}</span>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}