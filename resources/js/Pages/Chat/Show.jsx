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
import ReferenceCard from "./Partials/ReferenceCard";
import Avatar from "./Partials/Avatar";
import ImageLightbox from "@/Components/ImageLightbox";
import NewChatModal from "./Partials/NewChatModal";
import GroupMembersModal from "./Partials/GroupMembersModal";

import { BiMessageSquareAdd, BiSearch } from "react-icons/bi";
import { FiArrowLeft, FiChevronRight, FiFilter, FiPaperclip, FiSend, FiX, FiCornerUpLeft } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

import axios from "axios";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

// Id numerik pesan tertinggi (abaikan pesan optimistik "tmp-..."). Dipakai
// sebagai penanda "after" saat polling pesan baru.
function maxRealId(list) {
    return (list ?? []).reduce((mx, m) => {
        const n = Number(m?.id);
        return Number.isFinite(n) && n > mx ? n : mx;
    }, 0);
}

export default function ChatShow({
    conversations = [],
    conversation,
    messages = [],
    pendingReference = null,
}) {
    const { t } = useTranslation();
    const authUser = usePage().props?.auth?.user;

    // Kartu referensi (Trip / Pergi Bareng) yang tersemat di komposer, dikirim
    // bersama pesan pertama lalu dibersihkan. Hanya di-set ulang saat BERPINDAH
    // percakapan — bukan tiap kali prop pendingReference berubah. Sebab setelah
    // pesan pertama terkirim, storeMessage me-`back()` ke halaman yang sama; kalau
    // kita ikut pendingReference, kartu akan muncul lagi dan menempel di pesan
    // berikutnya. Membiarkan dep hanya conversation.id juga menghormati aksi "tutup".
    const [activeReference, setActiveReference] = useState(pendingReference);
    useEffect(() => {
        setActiveReference(pendingReference);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?.id]);

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

    // Referensi pesan terkini untuk menghitung id terakhir saat polling.
    const messagesRef = useRef(localMessages);
    useEffect(() => {
        messagesRef.current = localMessages;
    }, [localMessages]);

    // Online lawan menurut polling (fallback saat WebSocket/Pusher tidak jalan).
    const [pollPeerOnline, setPollPeerOnline] = useState(false);
    useEffect(() => setPollPeerOnline(false), [conversation?.id]);

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

        const first = (payload.attachments ?? [])[0];
        if (first?.type?.startsWith("image/")) return t("chat.photo");
        if (first?.type === "application/pdf") return t("chat.pdf");
        if (first) return t("chat.attachment");

        return "";
    };

    useEffect(() => {
        if (!conversation?.id) return;
        if (!window.Echo) return;

        const channelName = `conversation.${conversation.id}`;
        const channel = window.Echo.private(channelName);

        channel.listen(".message.sent", (payload) => {
            // Dedup: pesan yang sama bisa datang lewat Pusher DAN polling fallback.
            setLocalMessages((prev) => {
                const list = prev ?? [];
                if (list.some((m) => Number(m.id) === Number(payload.id))) {
                    return list;
                }
                return [...list, payload];
            });

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

    // Pusher/Echo sedang terhubung? Jika ya, polling di-SKIP: Pusher sudah
    // mengantar pesan/online/read secara realtime. Polling yang tetap jalan hanya
    // MEMBEBANI server — di dev server single-thread, request poll bahkan
    // MENGANTRE dan membuat pengiriman pesan tampak lambat 5–15 detik. Jadi
    // polling murni fallback saat WebSocket tidak tersedia/terputus.
    const echoConnected = () =>
        window.Echo?.connector?.pusher?.connection?.state === "connected";

    // ── Fallback POLLING (hanya saat WebSocket/Pusher TIDAK terhubung) ──
    // Pesan baru dari lawan bicara + status baca + online lawan.
    useEffect(() => {
        if (!conversation?.id) return;
        let cancelled = false;

        const tick = async () => {
            if (document.hidden) return;
            if (echoConnected()) return;
            try {
                const after = maxRealId(messagesRef.current);
                const { data } = await axios.get(`/chat/${conversation.id}/poll`, {
                    params: { after },
                });
                if (cancelled) return;

                const incoming = data.messages ?? [];
                const existing = new Set(
                    (messagesRef.current ?? []).map((m) => m.id),
                );
                const toAdd = incoming.filter((m) => !existing.has(m.id));
                if (toAdd.length) {
                    setLocalMessages((prev) => [...(prev ?? []), ...toAdd]);
                    markAsRead();
                }

                if (data.peer_last_read_at) setPeerLastReadAt(data.peer_last_read_at);
                setPollPeerOnline(!!data.peer_online);
            } catch {
                /* diamkan; coba lagi tick berikutnya */
            }
        };

        tick();
        // Fallback saja: kalau Pusher jalan, pesan sudah masuk realtime lebih dulu
        // (poll ter-dedup by id). 3 detik agar tetap responsif bila WebSocket gagal.
        const interval = setInterval(tick, 3000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?.id]);

    // Sidebar: chat baru, pesan terakhir & unread tanpa perlu refresh.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            if (document.hidden) return;
            if (echoConnected()) return;
            try {
                const { data } = await axios.get("/chat/poll");
                if (cancelled) return;
                if (Array.isArray(data.conversations)) {
                    setSidebarConversations(data.conversations);
                }
            } catch {
                /* diamkan */
            }
        };
        const interval = setInterval(tick, 12000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const lastSeenAt = peer?.last_seen_at;
    const isOnlineByLastSeen =
        lastSeenAt &&
        Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;

    const isPeerOnline = peer?.id ? onlineIds.has(peer.id) : false;
    const showOnline = isPeerOnline || pollPeerOnline || isOnlineByLastSeen;

    const [text, setText] = useState("");
    const sendingRef = useRef(false);

    // Balasan pesan & lampiran tertunda (bisa banyak gambar + keterangan).
    const [replyingTo, setReplyingTo] = useState(null);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [attachError, setAttachError] = useState("");

    // Modal gambar (lightbox) & sorotan pesan tujuan saat klik kutipan balasan.
    const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });
    const [highlightId, setHighlightId] = useState(null);
    const highlightTimer = useRef(null);

    // Reset komposer saat pindah percakapan.
    useEffect(() => {
        setReplyingTo(null);
        setPendingAttachments([]);
        setAttachError("");
    }, [conversation?.id]);

    const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

    const attachmentLabel = (type, hasFile) => {
        if (type?.startsWith("image/")) return t("chat.photo");
        if (type === "application/pdf") return t("chat.pdf");
        return hasFile ? t("chat.attachment") : "";
    };

    const openLightbox = (images, index) =>
        setLightbox({ open: true, images: images ?? [], index: index ?? 0 });

    // Klik kutipan balasan → gulir ke pesan asal & beri sorotan sesaat.
    const scrollToMessage = (id) => {
        const el = document.getElementById(`msg-${id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(id);
        clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlightId(null), 1600);
    };
    useEffect(() => () => clearTimeout(highlightTimer.current), []);

    const sendMessage = (messageText, files, replyObj, reference) => {
        if (sendingRef.current) return;
        sendingRef.current = true;

        const tmpId = `tmp-${Date.now()}`;
        const optimistic = {
            id: tmpId,
            conversation_id: conversation.id,
            sender_id: authUser?.id,
            text: messageText || "",
            created_at: new Date().toISOString(),
            reference: reference ?? null,
            attachments: (files ?? []).map((f) => ({
                url: URL.createObjectURL(f),
                type: f.type,
                name: f.name,
            })),
            reply_to: replyObj
                ? {
                      id: replyObj.id,
                      sender_name: replyObj.sender?.name ?? "",
                      text: replyObj.text,
                      attachment_type: (replyObj.attachments ?? [])[0]?.type ?? null,
                      has_attachment: (replyObj.attachments ?? []).length > 0,
                  }
                : null,
            sender: {
                id: authUser?.id,
                name: authUser?.full_name,
                avatar: authUser?.public_profile_image,
            },
            optimistic: true,
            sent: false,
        };

        setLocalMessages((prev) => [...(prev ?? []), optimistic]);
        setText("");

        const formData = new FormData();
        if (messageText) formData.append("message_text", messageText);
        (files ?? []).forEach((f) => formData.append("attachments[]", f));
        if (replyObj?.id) formData.append("reply_to_id", replyObj.id);
        if (reference?.type && reference?.id) {
            formData.append("reference_type", reference.type);
            formData.append("reference_id", reference.id);
        }

        // Kirim lewat axios (bukan Inertia router.post) agar respons RINGAN: server
        // hanya mengembalikan pesan yang baru dibuat, bukan memuat ulang seluruh
        // props halaman chat (rebuild sidebar + semua pesan) — itu penyebab utama
        // pengiriman terasa lambat.
        window.axios
            .post(`/chat/${conversation.id}/messages`, formData)
            .then(({ data }) => {
                const real = data?.message;
                if (!real) {
                    setLocalMessages((prev) =>
                        (prev ?? []).map((m) =>
                            m.id === tmpId ? { ...m, sent: true } : m,
                        ),
                    );
                    return;
                }

                // Ganti pesan optimistik dengan pesan asli (memperoleh id numerik
                // → tombol "Balas" muncul). Dedup by id kalau Pusher/poll sudah
                // menyisipkannya lebih dulu.
                setLocalMessages((prev) => {
                    const list = prev ?? [];
                    if (list.some((m) => Number(m.id) === Number(real.id))) {
                        return list.filter((m) => m.id !== tmpId);
                    }
                    return list.map((m) => (m.id === tmpId ? real : m));
                });

                // Perbarui sidebar pengirim secara lokal (tanpa reload server):
                // naikkan percakapan ke atas + perbarui cuplikan & waktu.
                setSidebarConversations((prev) => {
                    const next = (prev ?? []).map((c) =>
                        Number(c.id) === Number(conversation.id)
                            ? {
                                  ...c,
                                  subtitle: getSubtitleFromPayload(real),
                                  last_message_at:
                                      real.created_at ?? c.last_message_at,
                                  unread: 0,
                              }
                            : c,
                    );
                    return [...next].sort(
                        (a, b) =>
                            new Date(b.last_message_at ?? 0) -
                            new Date(a.last_message_at ?? 0),
                    );
                });
            })
            .catch((error) => {
                console.error("send message failed", error);
            })
            .finally(() => {
                sendingRef.current = false;
            });
    };

    const submit = (e) => {
        e.preventDefault();
        const trimmed = text.trim();
        const files = pendingAttachments.map((a) => a.file);
        if (!trimmed && files.length === 0 && !activeReference) return;

        sendMessage(trimmed, files, replyingTo, activeReference);

        // Bersihkan komposer (object URL pratinjau dibebaskan).
        pendingAttachments.forEach((a) => {
            if (a.preview) {
                try { URL.revokeObjectURL(a.preview); } catch {}
            }
        });
        setReplyingTo(null);
        setPendingAttachments([]);
        setAttachError("");
        // Referensi hanya dilampirkan ke pesan pertama, lalu dilepas.
        setActiveReference(null);
    };

    const handleAttach = (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length === 0) return;

        const accepted = [];
        let hasOversize = false;
        files.forEach((file) => {
            if (file.size > MAX_ATTACHMENT_BYTES) {
                hasOversize = true;
                return;
            }
            const isImage = (file.type || "").startsWith("image/");
            accepted.push({
                file,
                isImage,
                name: file.name,
                preview: isImage ? URL.createObjectURL(file) : null,
            });
        });

        setAttachError(hasOversize ? t("chat.attach_oversize") : "");
        if (accepted.length) {
            setPendingAttachments((prev) => [...prev, ...accepted].slice(0, 10));
        }
    };

    const removePendingAttachment = (index) => {
        setPendingAttachments((prev) => {
            const target = prev[index];
            if (target?.preview) {
                try { URL.revokeObjectURL(target.preview); } catch {}
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    return (
        <>
            <NavbarAuth />
            <Container className="max-w-[1400px]">
                <div className="h-[calc(100vh-96px)] overflow-hidden border-l border-r border-neutral-200 md:grid md:grid-cols-[420px_1fr]">
                    <aside className="hidden h-full min-h-0 overflow-y-auto border-r border-neutral-200 bg-white px-8 py-8 md:block">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-semibold text-neutral-700">
                                {t("chat.title")}
                            </h3>

                            <button
                                type="button"
                                onClick={() => setOpenNewChat(true)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                                aria-label={t("chat.new_chat")}
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
                                placeholder={t("chat.search_placeholder")}
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
                                    {t("chat.filter_all")}
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
                                    {t("chat.filter_unread")}
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
                                    badgeLabel={c.group_meta}
                                    time={formatTime(c.last_message_at)}
                                    unread={c.unread}
                                />
                            ))}
                        </div>
                    </aside>

                    <section className="relative flex h-full min-h-0 flex-col bg-white">
                        <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-6 py-5 sm:px-10 sm:py-6">
                            <Link
                                href="/chat"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-neutral-100 md:hidden"
                                aria-label={t("chat.back")}
                            >
                                <FiArrowLeft className="h-5 w-5 text-neutral-700" />
                            </Link>

                            <Avatar src={headerAvatar} alt={headerTitle} />

                            {conversation?.is_group ? (
                                <button
                                    type="button"
                                    onClick={() => setOpenMembers(true)}
                                    className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 -ml-2 text-left transition hover:bg-neutral-100"
                                    title={t("chat.view_group_members")}
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-lg font-semibold text-neutral-700">
                                            {headerTitle}
                                        </div>
                                        <div className="text-sm text-neutral-500">
                                            {t("chat.members_count").replace(
                                                ":count",
                                                participants?.length ?? 0,
                                            )}
                                            {conversation?.group_meta
                                                ? ` · ${conversation.group_meta}`
                                                : ""}
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
                                            {showOnline ? t("chat.online") : t("chat.offline")}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
                            <div className="space-y-2">
                                {(localMessages ?? []).map((m) => {
                                    const isMine = Number(m.sender_id) === Number(authUser?.id);
                                    const isRead =
                                        isMine &&
                                        peerLastReadAt &&
                                        m.created_at &&
                                        new Date(peerLastReadAt).getTime() >= new Date(m.created_at).getTime();

                                    // Status pesan sendiri: Mengirim… → Terkirim → Dibaca.
                                    let statusText = "";
                                    if (isMine) {
                                        if (isRead) statusText = t("chat.status_read");
                                        else if (m.optimistic && !m.sent) statusText = t("chat.status_sending");
                                        else statusText = t("chat.status_sent");
                                    }

                                    // Balas hanya untuk pesan yang sudah tersimpan (punya id numerik).
                                    const canReply = Number.isFinite(Number(m.id));

                                    return (
                                        <Bubble
                                            key={m.id}
                                            id={m.id}
                                            highlighted={String(highlightId) === String(m.id)}
                                            mine={isMine}
                                            text={m.text}
                                            time={formatTime(m.created_at)}
                                            readText={statusText}
                                            avatar={m.sender?.avatar}
                                            isGroup={conversation?.is_group}
                                            senderName={m.sender?.name}
                                            attachments={m.attachments}
                                            onImageClick={openLightbox}
                                            reply={m.reply_to}
                                            reference={m.reference}
                                            onReplyQuoteClick={
                                                m.reply_to?.id
                                                    ? () => scrollToMessage(m.reply_to.id)
                                                    : undefined
                                            }
                                            onReply={canReply ? () => setReplyingTo(m) : undefined}
                                        />
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-neutral-200 px-6 py-5 sm:px-10 sm:py-6">
                            {/* Kartu referensi tersemat (konteks Trip / Pergi Bareng) */}
                            {activeReference ? (
                                <div className="mb-3">
                                    <ReferenceCard
                                        reference={activeReference}
                                        onDismiss={() => setActiveReference(null)}
                                    />
                                </div>
                            ) : null}

                            {/* Bar "membalas" — desain baru (garis tipis + ikon, bukan kotak biru) */}
                            {replyingTo ? (
                                <div className="mb-3 flex items-center gap-3 border-l-2 border-neutral-300 bg-neutral-50 py-1.5 pl-3 pr-2">
                                    <FiCornerUpLeft className="h-4 w-4 shrink-0 text-neutral-400" />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold text-neutral-700">
                                            {t("chat.replying_to").replace(
                                                ":name",
                                                Number(replyingTo.sender_id) === Number(authUser?.id)
                                                    ? t("chat.yourself")
                                                    : replyingTo.sender?.name ?? "",
                                            )}
                                        </div>
                                        <div className="truncate text-sm text-neutral-500">
                                            {replyingTo.text ||
                                                attachmentLabel(
                                                    (replyingTo.attachments ?? [])[0]?.type,
                                                    (replyingTo.attachments ?? []).length > 0,
                                                )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="shrink-0 text-neutral-400 hover:text-neutral-700"
                                        aria-label={t("chat.cancel_reply")}
                                    >
                                        <FiX className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : null}

                            {/* Pratinjau banyak lampiran (bisa diberi keterangan) */}
                            {pendingAttachments.length > 0 ? (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {pendingAttachments.map((a, idx) => (
                                        <div
                                            key={idx}
                                            className="relative h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                                        >
                                            {a.isImage ? (
                                                <img
                                                    src={a.preview}
                                                    alt={a.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-2xl">
                                                    📄
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removePendingAttachment(idx)}
                                                className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                                                aria-label={t("chat.remove_attachment")}
                                            >
                                                <FiX className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {attachError ? (
                                <div className="mb-2 text-sm text-danger-700">{attachError}</div>
                            ) : null}

                            <form onSubmit={submit} className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        multiple
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
                                        placeholder={
                                            pendingAttachments.length > 0
                                                ? t("chat.caption_placeholder")
                                                : t("chat.message_placeholder")
                                        }
                                        className={cn(
                                            "h-14 w-full rounded-full border border-neutral-300 bg-white pl-12 pr-4 text-sm text-neutral-700 placeholder:text-neutral-500",
                                            "focus:border-primary-700 focus:outline-none",
                                        )}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-white hover:opacity-90"
                                    aria-label={t("chat.send")}
                                >
                                    <FiSend className="h-6 w-6" />
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </Container>

            <ImageLightbox
                images={lightbox.images}
                index={lightbox.index}
                open={lightbox.open}
                onClose={() => setLightbox((s) => ({ ...s, open: false }))}
            />
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