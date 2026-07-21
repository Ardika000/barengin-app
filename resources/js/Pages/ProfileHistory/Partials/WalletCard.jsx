import React, { useState } from "react";
import { MdAccountBalanceWallet } from "react-icons/md";
import { FiChevronDown, FiChevronUp, FiPlus } from "react-icons/fi";
import FormModal from "@/Components/FormModal";
import { useTranslation } from "@/lib/useTranslation";

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

/** Nominal cepat & batas minimal - selaras dengan WalletController. */
const QUICK_AMOUNTS = [50000, 100000, 250000, 500000];
const MIN_TOPUP = 10000;

/**
 * Kartu dompet di sidebar Profile History.
 *
 * Menampilkan saldo, tombol isi saldo (membuka modal), dan mutasi terakhir.
 * Saldo bertambah saat pengguna mengisi saldo lewat Midtrans, dan saat anggota
 * melunasi bagian patungan dari pergi bareng yang ia selenggarakan.
 */
export default function WalletCard({ wallet, onTopUp }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [topUpOpen, setTopUpOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const entries = wallet?.entries ?? [];
    const amountValid = Number(amount) >= MIN_TOPUP;

    const closeTopUp = () => {
        setTopUpOpen(false);
        setAmount("");
    };

    const submitTopUp = async () => {
        if (!amountValid || submitting) return;

        setSubmitting(true);
        try {
            // Popup Snap dibuka oleh pemanggil; modal ditutup lebih dulu agar
            // tidak menumpuk di atas popup.
            closeTopUp();
            await onTopUp?.(Number(amount));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        // w-full wajib: sidebar adalah flex-col dengan items-center/lg:items-start,
        // jadi anak tanpa w-full akan menyusut mengikuti lebar isinya (kartu ikut
        // melebar/menyempit mengikuti panjang angka saldo).
        <div className="mt-5 w-full rounded-3xl border border-neutral-200 bg-white p-5">
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

            <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-800"
            >
                <FiPlus size={14} />
                {t("wallet.topup", "Isi Saldo")}
            </button>

            {entries.length > 0 ? (
                <>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="mt-3 flex w-full items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100"
                    >
                        {t("wallet.recent", "Mutasi terakhir")}
                        {open ? (
                            <FiChevronUp size={14} />
                        ) : (
                            <FiChevronDown size={14} />
                        )}
                    </button>

                    {open ? (
                        // Tinggi dibatasi lalu digulir: mutasi bisa banyak, dan sidebar
                        // ini sticky - tanpa batas, daftar panjang akan mendorong isi
                        // sidebar melewati tinggi layar.
                        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-2 pl-2">
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
                        "Belum ada mutasi. Isi saldo untuk mulai, atau tunggu anggota membayar patungan pergi bareng kamu.",
                    )}
                </p>
            )}

            <FormModal
                open={topUpOpen}
                onClose={closeTopUp}
                onSubmit={submitTopUp}
                icon={<MdAccountBalanceWallet size={24} />}
                iconClass="bg-primary-100 text-primary-700"
                title={t("wallet.topup_title", "Isi Saldo Dompet")}
                description={t(
                    "wallet.topup_desc",
                    "Saldo masuk setelah pembayaran lunas.",
                )}
                confirmLabel={t("wallet.topup_confirm", "Isi Saldo")}
                cancelLabel={t("wallet.topup_cancel", "Batal")}
                processing={submitting}
                size="sm"
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {QUICK_AMOUNTS.map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setAmount(String(v))}
                                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                    Number(amount) === v
                                        ? "border-primary-600 bg-primary-50 text-primary-700"
                                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                }`}
                            >
                                {rupiah(v)}
                            </button>
                        ))}
                    </div>

                    <div>
                        {/* Label dihapus: isinya sama persis dengan placeholder,
                            jadi hanya menambah baris teks tanpa informasi baru.
                            aria-label menjaga input tetap punya nama yang terbaca
                            screen reader meski labelnya tak lagi tampil. */}
                        <input
                            id="topup-amount"
                            type="number"
                            min={MIN_TOPUP}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            aria-label={t("wallet.topup_amount_label", "Nominal lain")}
                            placeholder={t(
                                "wallet.topup_placeholder",
                                "Nominal lain (min Rp10.000)",
                            )}
                            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500"
                        />
                        {/* Peringatan hanya muncul setelah user mengetik sesuatu,
                            supaya modal tidak langsung terlihat "error" saat dibuka. */}
                        {amount !== "" && !amountValid ? (
                            <p className="mt-1 text-xs text-red-600">
                                {t(
                                    "wallet.topup_min_error",
                                    "Minimal isi saldo Rp10.000.",
                                )}
                            </p>
                        ) : null}
                    </div>
                </div>
            </FormModal>
        </div>
    );
}
