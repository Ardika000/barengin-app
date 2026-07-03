import React, { useMemo, useState } from "react";
import { FiHeart, FiMessageCircle } from "react-icons/fi";
import CommentComposer from "./CommentComposer";
import { FaHeart } from "react-icons/fa";
import { useTranslation } from "@/lib/useTranslation";

function ReplyRow({ reply, isCurrentUser, onToggleLikeReply }) {
    return (
        <div className="pl-12 pt-3">
            <div className="flex gap-3">
                <img
                    src={reply.avatar}
                    alt={reply.author}
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-neutral-900 text-sm">
                                {reply.author}
                            </p>
                            {isCurrentUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                                    You
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-neutral-500">
                            {reply.time}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
                        {reply.text}
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-neutral-600">
                        <button
                            type="button"
                            className={[
                                "inline-flex items-center gap-2 transition text-sm cursor-pointer",
                                reply.likedByMe
                                    ? "text-rose-600"
                                    : "hover:text-neutral-900",
                            ].join(" ")}
                            onClick={() => onToggleLikeReply?.(reply.id)}
                        >
                            {reply.likedByMe ? (
                                <FaHeart className="text-base" size={14} />
                            ) : (
                                <FiHeart className="text-base" size={14} />
                            )}
                            {reply.likes}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResponseItem({
    response,
    onReplySubmit,
    currentUserId,
    onToggleLikeComment,
    onToggleLikeReply,
}) {
    const { t } = useTranslation();
    const [openReplyComposer, setOpenReplyComposer] = useState(false);
    const [openReplies, setOpenReplies] = useState(false);

    const replyCount = useMemo(
        () => response.replies?.length ?? 0,
        [response.replies],
    );

    return (
        <div className="px-5 py-4 border-t border-neutral-200">
            <div className="flex gap-3">
                <img
                    src={response.avatar}
                    alt={response.author}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-neutral-900">
                            {response.author}
                        </p>
                        <span className="text-xs text-neutral-500">
                            {response.time}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-neutral-800 leading-relaxed whitespace-pre-line">
                        {response.text}
                    </p>

                    <div className="mt-3 flex items-center gap-5 text-neutral-600">
                        <button
                            type="button"
                            className={[
                                "inline-flex items-center gap-2 transition text-sm cursor-pointer",
                                response.likedByMe
                                    ? "text-rose-600"
                                    : "hover:text-neutral-900",
                            ].join(" ")}
                            onClick={() => onToggleLikeComment?.(response.id)}
                        >
                            {response.likedByMe ? (
                                <FaHeart className="text-lg" size={14} />
                            ) : (
                                <FiHeart className="text-lg" size={14} />
                            )}
                            {response.likes}
                        </button>

                        {replyCount > 0 && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 hover:text-neutral-900 transition text-sm cursor-pointer"
                                onClick={() => setOpenReplies((v) => !v)}
                                aria-expanded={openReplies}
                                aria-controls={`replies-${response.id}`}
                                disabled={replyCount === 0}
                            >
                                <FiMessageCircle className="text-base" />
                                {replyCount}
                            </button>
                        )}

                        <button
                            type="button"
                            className="text-sm font-medium hover:text-neutral-900 transition cursor-pointer"
                            onClick={() => setOpenReplyComposer((v) => !v)}
                        >
                            {t("forum.reply")}
                        </button>
                    </div>

                    {openReplyComposer ? (
                        <div className="mt-3 pl-12">
                            <CommentComposer
                                compact
                                placeholder={t("forum.write_reply")}
                                submitLabel={t("forum.reply")}
                                onCancel={() => setOpenReplyComposer(false)}
                                onSubmit={(text) => {
                                    onReplySubmit?.(response.id, text);
                                    setOpenReplies(true);
                                    setOpenReplyComposer(false);
                                }}
                            />
                        </div>
                    ) : null}

                    {(openReplies || openReplyComposer) && replyCount > 0 ? (
                        <div id={`replies-${response.id}`} className="mt-2">
                            {response.replies.map((r) => (
                                <ReplyRow
                                    key={r.id}
                                    reply={r}
                                    isCurrentUser={r.userId === currentUserId}
                                    onToggleLikeReply={onToggleLikeReply}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
