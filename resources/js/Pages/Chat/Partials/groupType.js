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

// Lencana status perjalanan induk grup. `status` datang dari
// ChatController::groupStatus dan hanya terisi untuk grup trip & pergi bareng.
//
// Ketiganya sengaja berbeda rona, bukan bergradasi dari satu warna: "menunggu"
// dan "selesai" sama-sama keadaan tenang, jadi kalau keduanya abu-abu anggota
// harus membaca teksnya untuk membedakan. Hanya "berlangsung" yang diberi titik
// berdenyut, karena itu satu-satunya keadaan yang berubah saat ini juga.
export const GROUP_STATUS_STYLES = {
    waiting: {
        key: "chat.group_status.waiting",
        fallback: "Menunggu",
        chip: "bg-sky-100 text-sky-700",
        dot: "bg-sky-500",
        pulse: false,
    },
    ongoing: {
        key: "chat.group_status.ongoing",
        fallback: "Berlangsung",
        chip: "bg-green-100 text-green-700",
        dot: "bg-green-500",
        pulse: true,
    },
    finished: {
        key: "chat.group_status.finished",
        fallback: "Selesai",
        chip: "bg-neutral-200 text-neutral-600",
        dot: "bg-neutral-400",
        pulse: false,
    },
};
