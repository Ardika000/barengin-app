import React, { useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import InputField from "@/Components/Input";
import Button from "@/Components/Button";
import NavbarAuth from "@/Components/NavbarAuth";
import { Link, router, usePage } from "@inertiajs/react";

import Segment from "./Partials/Segment";
import ChatListItem from "./Partials/ChatListItem";
import Bubble from "./Partials/BubbleChat";
import Avatar from "./Partials/Avatar";
import NewChatModal from "./Partials/NewChatModal";
import GroupMembersModal from "./Partials/GroupMembersModal";

import { BiMessageSquareAdd, BiSearch } from "react-icons/bi";
import { FiArrowLeft, FiChevronRight, FiFilter, FiPaperclip, FiSend } from "react-icons/fi";

import axios from "axios";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

export default function ChatShow({
    conversations = [],
    conversation,
    messages = [],
}) {
    const authUser = usePage().props?.auth?.user;

    const getConversationPeer = (c) =>
        c?.participants?.find(
            (p) => Number(p.id) !== Number(authUser?.id),
        );

    const getConversationTitle = (c) =>
        c?.title ?? getConversationPeer(c)?.name ?? "Chat";

    const getConversationAvatar = (c) =>
        c?.avatar ?? getConversationPeer(c)?.avatar;

    const headerTitle = getConversationTitle(conversation);
    const headerAvatar = getConversationAvatar(conversation);
    const peer = getConversationPeer(conversation);

    const [tab, setTab] = useState(() => {
        const fromUrl = new URLSearchParams(window.location.search).get("tab");
        if (fromUrl === "groups" || fromUrl === "personal") return fromUrl;
        return conversation?.is_group ? "groups" : "personal";
    });

    useEffect(() => {
        const fromUrl = new URLSearchParams(window.location.search).get("tab");
        if (fromUrl === "groups" || fromUrl === "personal") {
            setTab(fromUrl);
            return;
        }

        setTab(conversation?.is_group ? "groups" : "personal");
    }, [conversation?.id, conversation?.is_group]);

    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [openNewChat, setOpenNewChat] = useState(false);
    const [openMembers, setOpenMembers] = useState(false);

    const [participants, setParticipants] = useState(
        conversation?.participants ?? [],
    );
    useEffect(() => {
        setParticipants(conversation?.participants ?? []);
        setOpenMembers(false);
    }, [conversation?.id]);

    const [sidebarConversations, setSidebarConversations] = useState(conversations ?? []);
    useEffect(() => setSidebarConversations(conversations ?? []), [conversations]);

    // Melacak id percakapan yang sudah ada di sidebar, dipakai untuk mendeteksi
    // percakapan BARU yang masuk lewat channel pribadi user.
    const knownConvIdsRef = useRef(new Set());
    useEffect(() => {
        knownConvIdsRef.current = new Set(
            (sidebarConversations ?? []).map((c) => Number(c.id)),
        );
    }, [sidebarConversations]);

    const filtered = useMemo(() => {
    return (sidebarConversations ?? [])
        .filter((c) => {
            if (tab === "groups") return !!c.is_group;
            return !c.is_group;
        })
        .filter((c) => {
            if (!q) return true;
            return (c.title ?? "").toLowerCase().includes(q.toLowerCase());
        })
        .filter((c) => {
            if (filter === "unread") return Number(c.unread ?? 0) > 0;
            return true;
        });
}, [sidebarConversations, q, filter, tab]);

    const [localMessages, setLocalMessages] = useState(messages ?? []);
    useEffect(() => setLocalMessages(messages ?? []), [conversation?.id]);

    const [peerLastReadAt, setPeerLastReadAt] = useState(
        conversation?.peer_last_read_at ?? null,
    );
    useEffect(() => {
        setPeerLastReadAt(conversation?.peer_last_read_at ?? null);
    }, [conversation?.id]);

    const [onlineIds, setOnlineIds] = useState(new Set());

    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [localMessages?.length]);

    const formatTime = (iso) =>
        iso
            ? new Date(iso).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "";

    const markAsRead = async () => {
        if (!conversation?.id) return;
        try {
            await axios.post(`/chat/${conversation.id}/read`);
            setSidebarConversations((prev) =>
                prev.map((c) =>
                    Number(c.id) === Number(conversation?.id)
                        ? { ...c, unread: 0 }
                        : c,
                ),
            );
        } catch (err) {
            console.error("markAsRead failed", err);
        }
    };

    const getSubtitleFromPayload = (payload) => {
        if (payload.text) return payload.text;

        if (payload.attachment_type?.startsWith("image/")) return "Foto";
        if (payload.attachment_type === "application/pdf") return "PDF";
        if (payload.attachment_url) return "Lampiran";

        return "";
    };

    useEffect(() => {
        if (!conversation?.id) return;
        if (!window.Echo) return;

        const channelName = `conversation.${conversation.id}`;
        const channel = window.Echo.private(channelName);

        channel.listen(".message.sent", (payload) => {
            setLocalMessages((prev) => [...(prev ?? []), payload]);

            if (payload?.sender_id !== authUser?.id) {
                markAsRead();
            }
        });

        channel.listen(".conversation.read", (payload) => {
            if (payload.user_id === peer?.id) {
                setPeerLastReadAt(payload.last_read_at);
            }
        });

        return () => {
            window.Echo.leave(`private-${channelName}`);
        };
    }, [conversation?.id, peer?.id, authUser?.id]);

    useEffect(() => {
        if (!window.Echo) return;
        const ids = (conversations ?? []).map((c) => c.id);

        ids.forEach((id) => {
            const channelName = `conversation.${id}`;
            const channel = window.Echo.private(channelName);

            channel.listen(".message.sent", (payload) => {
                setSidebarConversations((prev) => {
                    const next = prev.map((item) => {
                        if (Number(item.id) !== Number(payload.conversation_id)) {
                            return item;
                        }

                        const isCurrent =
                            Number(payload.conversation_id) === Number(conversation?.id);
                        const shouldInc =
                            payload.sender_id !== authUser?.id && !isCurrent;

                        return {
                            ...item,
                            subtitle: getSubtitleFromPayload(payload),
                            last_message_at: payload.created_at ?? item.last_message_at,
                            unread: shouldInc
                                ? Number(item.unread ?? 0) + 1
                                : isCurrent
                                  ? 0
                                  : item.unread ?? 0,
                        };
                    });

                    return [...next].sort(
                        (a, b) =>
                            new Date(b.last_message_at ?? 0) -
                            new Date(a.last_message_at ?? 0),
                    );
                });
            });
        });

        return () => {
            ids.forEach((id) => window.Echo.leave(`private-conversation.${id}`));
        };
    }, [conversations?.length, conversation?.id, authUser?.id]);

    // Channel pribadi user: menangkap pesan dari percakapan yang BELUM ada di
    // sidebar (mis. seseorang baru pertama kali chat kita). Saat itu terjadi,
    // muat ulang daftar percakapan supaya chat baru langsung muncul tanpa refresh.
    useEffect(() => {
        if (!window.Echo || !authUser?.id) return;

        const channelName = `user.${authUser.id}`;
        const channel = window.Echo.private(channelName);

        channel.listen(".message.sent", (payload) => {
            const cid = Number(payload.conversation_id);
            if (knownConvIdsRef.current.has(cid)) return;

            // Tandai optimistik agar pesan susulan tidak memicu reload berulang.
            knownConvIdsRef.current.add(cid);

            router.reload({
                only: ["conversations"],
                preserveScroll: true,
                preserveState: true,
            });
        });

        return () => {
            window.Echo.leave(`private-${channelName}`);
        };
    }, [authUser?.id]);

    useEffect(() => {
        markAsRead();
    }, [conversation?.id]);

    useEffect(() => {
        const onFocus = () => markAsRead();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [conversation?.id]);

    useEffect(() => {
        if (!window.Echo) return;

        const channel = window.Echo.join("online");

        channel.here((users) => {
            setOnlineIds(new Set(users.map((u) => u.id)));
        });

        channel.joining((user) => {
            setOnlineIds((prev) => new Set([...prev, user.id]));
        });

        channel.leaving((user) => {
            setOnlineIds((prev) => {
                const next = new Set(prev);
                next.delete(user.id);
                return next;
            });
        });

        return () => {
            window.Echo.leave("online");
        };
    }, []);

    const lastSeenAt = peer?.last_seen_at;
    const isOnlineByLastSeen =
        lastSeenAt &&
        Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;

    const isPeerOnline = peer?.id ? onlineIds.has(peer.id) : false;
    const showOnline = isPeerOnline || isOnlineByLastSeen;

    const [text, setText] = useState("");
    const sendingRef = useRef(false);

    const sendMessage = (messageText, attachmentFile = null) => {
        if (sendingRef.current) return;

        sendingRef.current = true;

        const optimistic = {
            id: `tmp-${Date.now()}`,
            conversation_id: conversation.id,
            sender_id: authUser?.id,
            text: messageText || "",
            created_at: new Date().toISOString(),
            attachment_url: attachmentFile ? URL.createObjectURL(attachmentFile) : null,
            attachment_type: attachmentFile?.type ?? null,
            attachment_name: attachmentFile?.name ?? null,
            sender: {
                id: authUser?.id,
                name: authUser?.full_name,
                avatar: authUser?.public_profile_image,
            },
            optimistic: true,
        };

        setLocalMessages((prev) => [...(prev ?? []), optimistic]);
        setText("");

        const formData = new FormData();
        if (messageText) formData.append("message_text", messageText);
        if (attachmentFile) formData.append("attachment", attachmentFile);

        router.post(`/chat/${conversation.id}/messages`, formData, {
            preserveScroll: true,
            forceFormData: true,
            onFinish: () => {
                sendingRef.current = false;
            },
            onError: () => {
                sendingRef.current = false;
            },
        });
    };

    const submit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        sendMessage(text, null);
    };

    const handleAttach = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        sendMessage("", file);
        e.target.value = "";
    };

    return (
        <>
            <NavbarAuth />
            <Container className="max-w-[1400px]">
                <div className="min-h-[calc(100vh-96px)] border-l border-r border-neutral-200 md:grid md:grid-cols-[420px_1fr]">
                    <aside className="hidden border-r border-neutral-200 bg-white px-8 py-8 md:block">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-semibold text-neutral-700">
                                Chat Messages
                            </h3>

                            <button
                                type="button"
                                onClick={() => setOpenNewChat(true)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                                aria-label="New Chat"
                            >
                                <BiMessageSquareAdd className="text-3xl" />
                            </button>
                        </div>

                        <div className="mt-6">
                            <Segment value={tab} onChange={setTab} />
                        </div>

                        <div className="mt-6">
                            <InputField
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search Chat..."
                                leftIcon={<BiSearch className="text-xl" />}
                                rounded
                                size="md"
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFilter("all")}
                                    className={cn(
                                        "rounded-full px-4 py-2 text-sm font-medium transition",
                                        filter === "all"
                                            ? "bg-primary-100 text-primary-700"
                                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                                    )}
                                >
                                    Semua
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFilter("unread")}
                                    className={cn(
                                        "rounded-full px-4 py-2 text-sm font-medium transition",
                                        filter === "unread"
                                            ? "bg-primary-100 text-primary-700"
                                            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                                    )}
                                >
                                    Belum Dibaca
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            {filtered.map((c) => (
                                <ChatListItem
                                    key={c.id}
                                    href={`/chat/${c.id}`}
                                    active={Number(c.id) === Number(conversation?.id)}
                                    avatar={getConversationAvatar(c)}
                                    title={getConversationTitle(c)}
                                    subtitle={c.subtitle}
                                    time={formatTime(c.last_message_at)}
                                    unread={c.unread}
                                />
                            ))}
                        </div>
                    </aside>

                    <section className="relative bg-white">
                        <div className="flex items-center gap-3 border-b border-neutral-200 px-6 py-5 sm:px-10 sm:py-6">
                            <Link
                                href="/chat"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-neutral-100 md:hidden"
                                aria-label="Back"
                            >
                                <FiArrowLeft className="h-5 w-5 text-neutral-700" />
                            </Link>

                            <Avatar src={headerAvatar} alt={headerTitle} />

                            {conversation?.is_group ? (
                                <button
                                    type="button"
                                    onClick={() => setOpenMembers(true)}
                                    className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 -ml-2 text-left transition hover:bg-neutral-100"
                                    title="Lihat anggota grup"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-lg font-semibold text-neutral-700">
                                            {headerTitle}
                                        </div>
                                        <div className="text-sm text-neutral-500">
                                            {`${participants?.length ?? 0} Anggota`}
                                        </div>
                                    </div>
                                    <FiChevronRight className="h-5 w-5 shrink-0 text-neutral-400 transition group-hover:text-neutral-600" />
                                </button>
                            ) : (
                                <div className="min-w-0">
                                    <div className="truncate text-lg font-semibold text-neutral-700">
                                        {headerTitle}
                                    </div>
                                    <div className="text-sm text-neutral-500">
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "h-2.5 w-2.5 rounded-full",
                                                    showOnline ? "bg-success-700" : "bg-neutral-500",
                                                )}
                                            />
                                            {showOnline ? "Online" : "Offline"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-[calc(100vh-96px-84px-96px)] overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
                            <div className="space-y-2">
                                {(localMessages ?? []).map((m) => {
                                    const isMine = Number(m.sender_id) === Number(authUser?.id);
                                    const isRead =
                                        isMine &&
                                        peerLastReadAt &&
                                        m.created_at &&
                                        new Date(peerLastReadAt).getTime() >= new Date(m.created_at).getTime();

                                    return (
                                        <Bubble
                                            key={m.id}
                                            mine={isMine}
                                            text={m.text}
                                            time={formatTime(m.created_at)}
                                            readText={isRead ? "dibaca" : ""}
                                            avatar={m.sender?.avatar}
                                            isGroup={conversation?.is_group}
                                            senderName={m.sender?.name}
                                            attachmentUrl={m.attachment_url}
                                            attachmentType={m.attachment_type}
                                            attachmentName={m.attachment_name}
                                        />
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        <div className="border-t border-neutral-200 px-6 py-5 sm:px-10 sm:py-6">
                            <form onSubmit={submit} className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        className="hidden"
                                        id="chat-attachment"
                                        onChange={handleAttach}
                                    />
                                    <label
                                        htmlFor="chat-attachment"
                                        className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500"
                                    >
                                        <FiPaperclip className="h-5 w-5" />
                                    </label>

                                    <input
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        placeholder="Your Messages"
                                        className={cn(
                                            "h-14 w-full rounded-full border border-neutral-300 bg-white pl-12 pr-4 text-sm text-neutral-700 placeholder:text-neutral-500",
                                            "focus:border-primary-700 focus:outline-none",
                                        )}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-white hover:opacity-90"
                                    aria-label="Send"
                                >
                                    <FiSend className="h-6 w-6" />
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </Container>
            <NewChatModal open={openNewChat} onClose={() => setOpenNewChat(false)} />
            <GroupMembersModal
                open={openMembers}
                onClose={() => setOpenMembers(false)}
                conversationId={conversation?.id}
                members={participants}
                ownerId={conversation?.owner_id}
                isOwner={!!conversation?.is_owner}
                authUserId={authUser?.id}
                onRemoved={(userId) =>
                    setParticipants((prev) =>
                        prev.filter((p) => Number(p.id) !== Number(userId)),
                    )
                }
            />
        </>
    );
}