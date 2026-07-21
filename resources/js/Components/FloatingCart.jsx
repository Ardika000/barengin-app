import React from "react";
import { Link, usePage } from "@inertiajs/react";
import { useTranslation } from "@/lib/useTranslation";
import { FaBagShopping } from "react-icons/fa6";

// Indikator keranjang jastip melayang - muncul hanya bila ada item di keranjang.
// Disembunyikan di halaman checkout (sudah menampilkan isi keranjang).
export default function FloatingCart() {
    const { t } = useTranslation();
    const { url, props } = usePage();
    const count = Number(props?.jastip_cart_count || 0);

    if (count < 1 || url.startsWith("/jastip/checkout")) {
        return null;
    }

    return (
        <Link
            href="/jastip/checkout"
            className="fixed bottom-6 right-6 z-[1100] flex items-center gap-3 rounded-full bg-primary-700 py-3 pl-4 pr-5 text-white shadow-lg shadow-primary-700/30 transition hover:bg-primary-800"
        >
            <span className="relative">
                <FaBagShopping className="text-xl" />
                <span className="absolute -right-2.5 -top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold">
                    {count > 99 ? "99+" : count}
                </span>
            </span>
            <span className="text-sm font-semibold">{t("jastip.cart.view")}</span>
        </Link>
    );
}
