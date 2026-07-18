import React from "react";
import Avatar from "./Avatar";
import { FiCornerUpLeft } from "react-icons/fi";
import ReferenceCard from "./ReferenceCard";
import SplitBillCard from "./SplitBillCard";
import TrackJourneyCard from "./TrackJourneyCard";
import { useTranslation } from "@/lib/useTranslation";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

function replyPreviewText(reply, t) {
    if (reply?.text) return reply.text;
    if (reply?.attachment_type?.startsWith("image/")) return t("chat.photo");
    if (reply?.attachment_type === "application/pdf") return t("chat.pdf");
    if (reply?.has_attachment) return t("chat.attachment");
    return "";
}

const isImageType = (t) =>
    t && ["image/jpeg", "image/png", "image/webp"].includes(t);

// Grid gambar: 1 → penuh, 2 → 2 kolom, 3+ → 3 kolom.
function imageGridCols(n) {
    if (n <= 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-2";
    return "grid-cols-3";
}

export default function Bubble({
    id,
    highlighted,
    mine,
    text,
    time,
    readText,
    avatar,
    attachments = [],
    onImageClick,
    isGroup,
    senderName,
    reply,
    reference,
    splitBillState,
    midtransClientKey,
    onReply,
    onReplyQuoteClick,
}) {
    const { t } = useTranslation();
    const showSenderName = isGroup && !mine && senderName;

    const list = Array.isArray(attachments) ? attachments : [];
    const images = list.filter((a) => isImageType(a.type));
    const files = list.filter((a) => !isImageType(a.type));
    const imageUrls = images.map((a) => a.url);

    const ReplyButton = () =>
        onReply ? (
            <button
                type="button"
                onClick={onReply}
                className="mb-2 shrink-0 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-primary-700"
                aria-label={t("chat.reply_message")}
                title={t("chat.reply")}
            >
                <FiCornerUpLeft className="h-4 w-4" />
            </button>
        ) : null;

    return (
        <div
            id={`msg-${id}`}
            className={cn(
                "group flex w-full items-end gap-2 rounded-2xl transition-colors",
                highlighted ? "bg-primary-50" : "",
                mine ? "justify-end" : "justify-start",
            )}
        >
            {!mine ? <Avatar src={avatar} alt="avatar" className="h-9 w-9" /> : null}

            {mine ? <ReplyButton /> : null}

            <div className="flex max-w-[560px] items-end gap-3 break-words">
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

                    {/* Kutipan balasan — desain baru: dapat diklik untuk menuju pesan asal */}
                    {reply ? (
                        <button
                            type="button"
                            onClick={onReplyQuoteClick}
                            className="mb-2 flex w-full items-stretch gap-2 overflow-hidden rounded-md bg-neutral-100 text-left transition hover:bg-neutral-200"
                        >
                            <span className="w-1 shrink-0 bg-neutral-400" />
                            <span className="min-w-0 py-1 pr-2">
                                <span className="block truncate text-[11px] font-semibold text-neutral-700">
                                    {reply.sender_name}
                                </span>
                                <span className="block truncate text-xs text-neutral-500">
                                    {replyPreviewText(reply, t)}
                                </span>
                            </span>
                        </button>
                    ) : null}

                    {/* Kartu referensi Trip / Pergi Bareng (konteks pesan), atau
                        kartu tagihan patungan yang statusnya hidup. */}
                    {reference ? (
                        <div className={cn(text || reply ? "mb-2" : "")}>
                            {reference.type === "split_bill" ? (
                                <SplitBillCard
                                    reference={reference}
                                    state={splitBillState}
                                    clientKey={midtransClientKey}
                                />
                            ) : reference.type === "pergi_track" ? (
                                <TrackJourneyCard reference={reference} />
                            ) : (
                                <ReferenceCard reference={reference} />
                            )}
                        </div>
                    ) : null}

                    {text ? (
                        <div className="whitespace-pre-line text-sm text-neutral-700 break-words break-all">
                            {text}
                        </div>
                    ) : null}

                    {/* Gambar (bisa banyak) — klik untuk buka modal besar */}
                    {images.length > 0 ? (
                        <div
                            className={cn(
                                "mt-3 grid gap-1.5",
                                imageGridCols(images.length),
                                text ? "" : "mt-0",
                            )}
                        >
                            {images.map((a, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onImageClick?.(imageUrls, idx)}
                                    className="overflow-hidden rounded-lg border border-neutral-200"
                                >
                                    <img
                                        src={a.url}
                                        alt={a.name ?? "attachment"}
                                        className={cn(
                                            "w-full cursor-zoom-in object-cover",
                                            images.length === 1 ? "max-h-64" : "h-28",
                                        )}
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {/* Lampiran non-gambar (PDF) */}
                    {files.length > 0 ? (
                        <div className={cn("space-y-1.5", images.length || text ? "mt-2" : "mt-0")}>
                            {files.map((a, idx) => (
                                <a
                                    key={idx}
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-primary-700 hover:bg-primary-50"
                                >
                                    📄 <span className="truncate">{a.name ?? t("chat.document")}</span>
                                </a>
                            ))}
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

            {!mine ? <ReplyButton /> : null}
        </div>
    );
}
