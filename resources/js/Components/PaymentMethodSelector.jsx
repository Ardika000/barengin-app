import React from "react";
import { MdAccountBalanceWallet } from "react-icons/md";
import { FiCreditCard, FiAlertCircle } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

/**
 * Pemilih metode pembayaran: saldo dompet atau Midtrans.
 *
 * Opsi dompet dikunci saat saldo kurang dari total - server tetap memvalidasi
 * ulang, ini hanya agar pengguna tahu sebabnya sebelum menekan bayar.
 */
export default function PaymentMethodSelector({
    value,
    onChange,
    balance = 0,
    total = 0,
    disabled = false,
}) {
    const { t } = useTranslation();

    const enough = Number(balance) >= Number(total);
    const shortfall = Math.max(0, Number(total) - Number(balance));

    const optionClass = (active, locked) =>
        [
            "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
            locked
                ? "cursor-not-allowed border-neutral-200 bg-neutral-50 opacity-60"
                : active
                  ? "border-primary-600 bg-primary-50"
                  : "border-neutral-200 hover:bg-neutral-50",
        ].join(" ");

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-700">
                {t("payment.method", "Metode Pembayaran")}
            </p>

            {/* Saldo dompet */}
            <button
                type="button"
                disabled={disabled || !enough}
                onClick={() => onChange("wallet")}
                className={optionClass(value === "wallet", !enough)}
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                    <MdAccountBalanceWallet size={18} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-800">
                        {t("payment.wallet", "Saldo Dompet")}
                    </span>
                    <span className="block text-xs text-neutral-500">
                        {t("payment.wallet_balance", "Saldo")}: {rupiah(balance)}
                    </span>
                </span>
                {value === "wallet" && enough ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" />
                ) : null}
            </button>

            {!enough ? (
                <p className="flex items-start gap-1.5 px-1 text-xs text-amber-600">
                    <FiAlertCircle size={13} className="mt-0.5 shrink-0" />
                    <span>
                        {t("payment.wallet_insufficient", "Saldo kurang")} {rupiah(shortfall)}.{" "}
                        {t("payment.wallet_topup_hint", "Isi saldo dari halaman Riwayat Profil.")}
                    </span>
                </p>
            ) : null}

            {/* Midtrans */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange("midtrans")}
                className={optionClass(value === "midtrans", false)}
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                    <FiCreditCard size={18} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-neutral-800">
                        {t("payment.midtrans", "Midtrans")}
                    </span>
                    <span className="block text-xs text-neutral-500">
                        {t("payment.midtrans_hint", "VA, QRIS, kartu, e-wallet")}
                    </span>
                </span>
                {value === "midtrans" ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" />
                ) : null}
            </button>
        </div>
    );
}
