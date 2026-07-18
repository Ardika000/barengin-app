import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Container from "@/Components/Container";
import InputField from "@/Components/Input";
import Button from "@/Components/Button";
import NavAuth from "@/Components/NavbarAuth";
import { Link } from "@inertiajs/react";

import Segment from "./Partials/Segment";
import ChatListItem from "./Partials/ChatListItem";
import Avatar from "./Partials/Avatar";
import NewChatModal from "./Partials/NewChatModal";

import { BiMessageSquareAdd, BiSearch } from "react-icons/bi";
import { FiFilter } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

export default function ChatIndex({ conversations = [] }) {
    const { t } = useTranslation();
    const [tab, setTab] = useState("personal");
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [openNewChat, setOpenNewChat] = useState(false);

    // Polling fallback: perbarui daftar chat (chat baru, pesan terakhir, unread)
    // tanpa refresh, walau WebSocket/Pusher tidak tersedia (shared hosting).
    const [list, setList] = useState(conversations ?? []);
    useEffect(() => setList(conversations ?? []), [conversations]);

    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            if (document.hidden) return;
            try {
                const { data } = await axios.get("/chat/poll");
                if (!cancelled && Array.isArray(data.conversations)) {
                    setList(data.conversations);
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

    // Jumlah chat dengan pesan belum dibaca per tab, untuk lencana di Segment.
    const { personalUnread, groupUnread } = useMemo(() => {
        let personal = 0;
        let groups = 0;
        for (const c of list ?? []) {
            if (Number(c.unread ?? 0) <= 0) continue;
            if (c.is_group) groups += 1;
            else personal += 1;
        }
        return { personalUnread: personal, groupUnread: groups };
    }, [list]);

    const filtered = useMemo(() => {
        return (list ?? [])
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
    }, [list, q, filter, tab]);

    const formatTime = (iso) =>
        iso
            ? new Date(iso).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "";

    return (
        <>
            <NavAuth />
            <Container className="max-w-[1400px]">
                <div className="min-h-[calc(100vh-96px)] border-l border-r border-neutral-200 md:grid md:grid-cols-[420px_1fr]">
                    {/* LEFT SIDEBAR */}
                    <aside className="border-neutral-200 bg-white px-6 py-6 sm:px-8 sm:py-8 md:border-r">
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
                                <BiMessageSquareAdd className="text-xl" />
                            </button>
                        </div>

                        <div className="mt-6">
                            <Segment
                                value={tab}
                                onChange={setTab}
                                personalUnread={personalUnread}
                                groupUnread={groupUnread}
                            />
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
                            <div className="flex items-center gap-2">
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
                            {filtered.length === 0 ? (
                                <div className="py-10 text-center text-sm text-neutral-500">
                                    {tab === "groups"
                                        ? t("chat.empty_groups")
                                        : t("chat.empty_personal")}
                                </div>
                            ) : null}

                            {filtered.map((c) => (
                                <ChatListItem
                                    key={c.id}
                                    href={`/chat/${c.id}`}
                                    active={false}
                                    avatar={c.avatar}
                                    title={c.title}
                                    subtitle={c.subtitle}
                                    badgeLabel={c.group_meta}
                                    groupType={c.group_type}
                                    time={formatTime(c.last_message_at)}
                                    unread={c.unread}
                                />
                            ))}
                        </div>
                    </aside>

                    <section className="hidden items-center justify-center bg-white md:flex">
                        <div className="text-center">
                            <div className="text-lg font-semibold text-neutral-700">
                                {t("chat.none_open_title")}
                            </div>
                            <div className="mt-2 text-sm text-neutral-500">
                                {t("chat.none_open_subtitle")}
                            </div>
                        </div>
                    </section>
                </div>
            </Container>
            <NewChatModal
                open={openNewChat}
                onClose={() => setOpenNewChat(false)}
            />
        </>
    );
}
