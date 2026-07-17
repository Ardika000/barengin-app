import React, { useState } from "react";
import axios from "axios";
import { FiX, FiUserX } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

function MemberRow({ member, isOwner, canManage, isSelf, onRemove, removing }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-neutral-100">
            <img
                src={member.avatar}
                alt={member.name}
                className="h-10 w-10 rounded-full bg-neutral-200 object-cover"
            />
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-neutral-700">
                    {member.name}
                    {isSelf ? (
                        <span className="ml-1 text-xs font-normal text-neutral-500">
                            ({t("chat.you")})
                        </span>
                    ) : null}
                </div>
                {isOwner ? (
                    <div className="text-xs font-medium text-primary-700">
                        {t("chat.group_owner")}
                    </div>
                ) : null}
            </div>

            {canManage && !isOwner ? (
                <button
                    type="button"
                    onClick={() => onRemove(member)}
                    disabled={removing}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border border-danger-700 px-3 py-1.5 text-xs font-medium text-danger-700 transition hover:bg-danger-700 hover:text-white",
                        removing && "cursor-not-allowed opacity-50",
                    )}
                >
                    <FiUserX className="h-4 w-4" />
                    {removing ? "..." : t("chat.remove_member")}
                </button>
            ) : null}
        </div>
    );
}

export default function GroupMembersModal({
    open,
    onClose,
    conversationId,
    members = [],
    ownerId,
    isOwner = false,
    groupType,
    authUserId,
    onRemoved,
}) {
    const { t } = useTranslation();
    const [removingId, setRemovingId] = useState(null);
    const [error, setError] = useState("");

    if (!open) return null;

    const handleRemove = async (member) => {
        if (removingId) return;
        // Grup trip/pergi bareng: mengeluarkan dari chat juga mengeluarkan dari
        // entitasnya (trip = refund, pergi bareng = lepas peserta). Peringatkan.
        const warn =
            groupType === "trip"
                ? " " + t("chat.remove_warn_trip")
                : groupType === "pergi_bareng"
                  ? " " + t("chat.remove_warn_pergi_bareng")
                  : "";
        if (
            !window.confirm(
                t("chat.remove_confirm").replace(":name", member.name) + warn,
            )
        ) {
            return;
        }

        setRemovingId(member.id);
        setError("");
        try {
            await axios.delete(
                `/chat/${conversationId}/participants/${member.id}`,
            );
            onRemoved?.(member.id);
        } catch (err) {
            setError(
                err?.response?.data?.message ??
                    t("chat.remove_failed"),
            );
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000]">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label={t("chat.close")}
            />

            <div className="relative mx-auto mt-24 w-[92%] max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                    <div className="text-base font-semibold text-neutral-700">
                        {t("chat.members")}
                        <span className="ml-1 text-sm font-normal text-neutral-500">
                            ({members.length})
                        </span>
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-neutral-100"
                        onClick={onClose}
                        aria-label={t("chat.close")}
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5">
                    {error ? (
                        <div className="mb-3 rounded-lg bg-danger-100 px-3 py-2 text-xs text-danger-700">
                            {error}
                        </div>
                    ) : null}

                    <div className="max-h-[420px] overflow-y-auto pr-1">
                        {(members ?? []).map((m) => (
                            <MemberRow
                                key={m.id}
                                member={m}
                                isOwner={Number(m.id) === Number(ownerId)}
                                isSelf={Number(m.id) === Number(authUserId)}
                                canManage={isOwner}
                                removing={removingId === m.id}
                                onRemove={handleRemove}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
