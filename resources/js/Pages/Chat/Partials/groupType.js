import { FaRoute, FaCarSide, FaBoxOpen } from "react-icons/fa";

// Tampilan penanda jenis grup chat. Dipakai bersama oleh daftar chat
// (ChatListItem) dan header percakapan (Show) agar warna & labelnya konsisten.
// `key` menunjuk ke kamus terjemahan; `type` datang dari ChatController::groupType.
export const GROUP_TYPE_STYLES = {
    trip: {
        key: "chat.group_type.trip",
        fallback: "Trip Bareng",
        icon: FaRoute,
        chip: "bg-primary-100 text-primary-700",
    },
    pergi_bareng: {
        key: "chat.group_type.pergi_bareng",
        fallback: "Pergi Bareng",
        icon: FaCarSide,
        chip: "bg-amber-100 text-amber-700",
    },
    jastip: {
        key: "chat.group_type.jastip",
        fallback: "Jastip",
        icon: FaBoxOpen,
        chip: "bg-emerald-100 text-emerald-700",
    },
};
