import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import { FiX, FiSearch } from "react-icons/fi";

function cn(...a) {
    return a.filter(Boolean).join(" ");
}

function UserRow({ user, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-neutral-100"
        >
            <img
                src={user.avatar}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover bg-neutral-200"
            />
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-neutral-700">
                    {user.name}
                </div>
                {user.username ? (
                    <div className="truncate text-xs text-neutral-500">
                        @{user.username}
                    </div>
                ) : null}
            </div>
        </button>
    );
}

export default function NewChatModal({ open, onClose }) {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [creating, setCreating] = useState(false);

    const inputRef = useRef(null);
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // fetch users (debounced)
    useEffect(() => {
        if (!open) return;

        let ignore = false;
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await axios.get("/chat/users", {
                    params: { q },
                });
                if (!ignore) setUsers(res.data?.data ?? []);
            } finally {
                if (!ignore) setLoading(false);
            }
        }, 300);

        return () => {
            ignore = true;
            clearTimeout(t);
        };
    }, [open, q]);

    const empty = useMemo(() => !loading && (users?.length ?? 0) === 0, [loading, users]);

    const startChat = (userId) => {
        if (creating) return;
        setCreating(true);
        router.post(
            "/chat/personal",
            { user_id: userId },
            {
                onFinish: () => {
                    setCreating(false);
                    onClose?.();
                },
                onError: (errors) => {
                    console.error(errors);
                    setCreating(false);
                },
            },
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[2000]">
            {/* backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="Close modal"
            />

            {/* modal */}
            <div className="relative mx-auto mt-24 w-[92%] max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                    <div className="text-base font-semibold text-neutral-700">
                        Mulai Chat Baru
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-neutral-100"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5">
                    <div className="relative">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                            <FiSearch className="h-5 w-5" />
                        </div>
                        <input
                            ref={inputRef}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari nama / username / email..."
                            className={cn(
                                "h-12 w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-700",
                                "focus:border-primary-700 focus:outline-none",
                            )}
                        />
                    </div>

                    <div className="mt-4 max-h-[360px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="py-10 text-center text-sm text-neutral-500">
                                Loading...
                            </div>
                        ) : null}

                        {empty ? (
                            <div className="py-10 text-center text-sm text-neutral-500">
                                User tidak ditemukan.
                            </div>
                        ) : null}

                        {(users ?? []).map((u) => (
                            <UserRow
                                key={u.id}
                                user={u}
                                onClick={() => startChat(u.id)}
                            />
                        ))}
                    </div>

                    {creating ? (
                        <div className="mt-3 text-xs text-neutral-500">
                            Membuat chat...
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}