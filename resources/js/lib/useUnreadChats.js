import { useCallback, useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import axios from "axios";

export function useUnreadChats() {
    const { props } = usePage();
    const user = props?.auth?.user;

    const [count, setCount] = useState(Number(props?.chat_unread_count ?? 0));

    useEffect(() => {
        setCount(Number(props?.chat_unread_count ?? 0));
    }, [props?.chat_unread_count]);

    const refresh = useCallback(async () => {
        try {
            const { data } = await axios.get("/chat/poll");
            if (Array.isArray(data?.conversations)) {
                setCount(
                    data.conversations.filter((c) => (c.unread ?? 0) > 0).length,
                );
            }
        } catch {
            /* biarkan, lencana pakai nilai terakhir */
        }
    }, []);

    useEffect(() => {
        if (!window.Echo || !user?.id) return;

        const channelName = `user.${user.id}`;
        const channel = window.Echo.private(channelName);

        channel.listen(".message.sent", (payload) => {
            if (Number(payload?.sender_id) === Number(user.id)) return;
            refresh();
        });

        return () => {
            channel.stopListening(".message.sent");
            window.Echo.leave(`private-${channelName}`);
        };
    }, [user?.id, refresh]);

    useEffect(() => {
        if (!user?.id) return;

        const tick = () => {
            if (document.hidden) return;
            refresh();
        };
        const interval = setInterval(tick, 12000);

        return () => clearInterval(interval);
    }, [user?.id, refresh]);

    return {
        count,
        label: count > 99 ? "99+" : String(count),
        refresh,
    };
}

export default useUnreadChats;
