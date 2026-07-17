import React, { useState } from "react";
import { MdAccountBalanceWallet } from "react-icons/md";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

/**
 * Kartu dompet di sidebar Profile History.
 *
 * Saldo bertambah saat anggota melunasi bagian patungan dari pergi bareng yang
 * diselenggarakan pengguna ini. Mutasi terakhir bisa dibuka untuk melihat
 * asal saldo.
 */
export default function WalletCard({ wallet }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const entries = wallet?.entries ?? [];

    return (
        <div className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <MdAccountBalanceWallet size={22} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-500">
                        {t("wallet.title", "Dompet")}
                    </p>
                    <p className="truncate text-xl font-bold text-neutral-800">
                        {rupiah(wallet?.balance)}
                    </p>
                </div>
            </div>

            {entries.length > 0 ? (
                <>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="mt-4 flex w-full items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100"
                    >
                        {t("wallet.recent", "Mutasi terakhir")}
                        {open ? (
                            <FiChevronUp size={14} />
                        ) : (
                            <FiChevronDown size={14} />
                        )}
                    </button>

                    {open ? (
                        <ul className="mt-2 space-y-2">
                            {entries.map((e) => (
                                <li
                                    key={e.id}
                                    className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2 last:border-0"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium text-neutral-700">
                                            {e.description}
                                        </p>
                                        <p className="text-[11px] text-neutral-400">
                                            {e.date_label}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 text-xs font-bold ${
                                            e.type === "credit"
                                                ? "text-success-700"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {e.type === "credit" ? "+" : "−"}
                                        {rupiah(e.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </>
            ) : (
                <p className="mt-3 text-xs text-neutral-400">
                    {t(
                        "wallet.empty",
                        "Belum ada pemasukan. Saldo bertambah saat anggota membayar patungan pergi bareng kamu.",
                    )}
                </p>
            )}
        </div>
    );
}
