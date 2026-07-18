import React, { useState } from "react";
import axios from "axios";
import { Link, router } from "@inertiajs/react";
import { FiCheckCircle, FiClock, FiCreditCard, FiAlertCircle } from "react-icons/fi";
import { MdReceiptLong, MdAccountBalanceWallet } from "react-icons/md";
import { useTranslation } from "@/lib/useTranslation";
import { useMidtransSnap } from "@/lib/useMidtransSnap";
import { toast } from "@/lib/toast";

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

/**
 * Kartu tagihan patungan di dalam gelembung chat.
 *
 * `reference` (snapshot pada pesan) hanya dipakai untuk judul; status lunas/belum
 * datang dari `state` yang dikirim ulang tiap render halaman, sehingga kartu lama
 * di riwayat chat tetap menampilkan keadaan terkini.
 */
export default function SplitBillCard({ reference, state, clientKey }) {
    const { t } = useTranslation();
    const snapReady = useMidtransSnap(clientKey);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    // Token Snap dari percobaan yang belum tuntas (popup ditutup / pending),
    // supaya pembayaran bisa dilanjutkan tanpa membuat transaksi baru.
    const [pendingToken, setPendingToken] = useState(null);

    // Tagihan sudah dihapus / tidak terlihat oleh user ini → tampilkan ringkasan
    // seadanya dari snapshot pesan supaya gelembung tidak kosong.
    if (!state) {
        return (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    {t("split_bill.card_label", "Bagi Tagihan")}
                </p>
                <p className="truncate text-sm font-semibold text-neutral-700">
                    {reference?.title}
                </p>
            </div>
        );
    }

    const mine = state.my_share;
    const isPaid = mine?.status === "paid";

    const canPayWithWallet =
        mine && Number(state.wallet_balance ?? 0) >= Number(mine.amount);
    const shortfall = mine
        ? Math.max(0, Number(mine.amount) - Number(state.wallet_balance ?? 0))
        : 0;

    // Bayar dari saldo: tidak lewat Snap — server memotong saldo lalu melunasi
    // bagian ini, jadi cukup muat ulang untuk melihat status terbaru.
    const payWithWallet = async () => {
        if (busy || !mine) return;
        setError(null);
        setBusy(true);

        try {
            const { data } = await axios.post(`/split-bill/shares/${mine.id}/pay`, {
                payment_method: "wallet",
            });

            if (data?.paid) {
                toast.success(
                    t("split_bill.pay_success", "Pembayaran berhasil! Bagianmu sudah lunas."),
                );
                router.reload();
                return;
            }

            throw new Error("Respons pembayaran saldo tidak dikenali.");
        } catch (e) {
            setError(
                e?.response?.data?.error ??
                    t("split_bill.pay_failed", "Pembayaran gagal."),
            );
            setBusy(false);
        }
    };

    // snap.pay() hanya membuka popup lalu langsung kembali — jadi status "busy"
    // dilepas di callback-nya, bukan di `finally`. Kalau dilepas di `finally`,
    // tombol aktif lagi padahal popup masih terbuka.
    const openSnap = (token) => {
        window.snap.pay(token, {
            // Muat ulang agar status kartu (dan dompet penyelenggara)
            // ikut ter-update dari server.
            onSuccess: () => {
                setPendingToken(null);
                toast.success(
                    t("split_bill.pay_success", "Pembayaran berhasil! Bagianmu sudah lunas."),
                );
                router.reload();
            },
            onPending: () => {
                // Pembayaran belum tuntas (mis. transfer bank menunggu). Simpan
                // token supaya bisa dilanjutkan lewat tombol yang sama.
                setPendingToken(token);
                setBusy(false);
                router.reload();
            },
            onError: () => {
                setError(t("split_bill.pay_failed", "Pembayaran gagal."));
                setBusy(false);
            },
            // Popup ditutup tanpa menyelesaikan pembayaran → simpan token supaya
            // tombol berubah jadi "Lanjutkan Pembayaran", bukan menggantung.
            onClose: () => {
                setPendingToken(token);
                setBusy(false);
            },
        });
    };

    const pay = async () => {
        if (busy || !mine) return;
        setError(null);

        if (!snapReady || !window.snap) {
            setError(t("split_bill.snap_not_ready", "Pembayaran belum siap. Coba lagi sebentar."));
            return;
        }

        setBusy(true);

        // Sudah punya token dari percobaan sebelumnya → langsung buka lagi,
        // tanpa membuat transaksi baru di server.
        if (pendingToken) {
            openSnap(pendingToken);
            return;
        }

        try {
            const { data } = await axios.post(`/split-bill/shares/${mine.id}/pay`, {
                payment_method: "midtrans",
            });

            openSnap(data.snap_token);
        } catch (e) {
            setError(
                e?.response?.data?.error ??
                    t("split_bill.pay_failed", "Pembayaran gagal."),
            );
            setBusy(false);
        }
    };

    return (
        <div className="w-full min-w-[240px] rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <div className="flex items-start gap-2">
                <MdReceiptLong className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {t("split_bill.card_label", "Bagi Tagihan")}
                    </p>
                    <p className="truncate text-sm font-semibold text-neutral-800">
                        {state.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                        {t("split_bill.total", "Total")}: {rupiah(state.total_amount)}
                    </p>
                </div>
            </div>

            {state.note ? (
                <p className="mt-2 whitespace-pre-line text-xs text-neutral-600">
                    {state.note}
                </p>
            ) : null}

            {/* Sudut pandang penyelenggara: rekap siapa yang sudah bayar. */}
            {state.is_creator ? (
                <div className="mt-3 border-t border-amber-200 pt-2">
                    <p className="mb-1.5 text-xs font-semibold text-neutral-600">
                        {t("split_bill.paid_progress", "Sudah bayar")}:{" "}
                        {state.paid_count}/{state.share_count}
                    </p>
                    <ul className="space-y-1">
                        {state.shares.map((s) => (
                            <li
                                key={s.id}
                                className="flex items-center justify-between gap-2 text-xs"
                            >
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <img
                                        src={s.avatar}
                                        alt=""
                                        className="h-4 w-4 shrink-0 rounded-full object-cover"
                                    />
                                    <span className="truncate text-neutral-700">
                                        {s.name}
                                    </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1">
                                    <span className="text-neutral-600">
                                        {rupiah(s.amount)}
                                    </span>
                                    {s.status === "paid" ? (
                                        <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                        <FiClock className="h-3.5 w-3.5 text-neutral-400" />
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Sudut pandang anggota: bagiannya sendiri. */}
            {mine ? (
                <div className="mt-3 border-t border-amber-200 pt-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-neutral-600">
                            {t("split_bill.your_share", "Bagianmu")}
                        </span>
                        <span className="text-sm font-bold text-neutral-800">
                            {rupiah(mine.amount)}
                        </span>
                    </div>

                    {isPaid ? (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            <FiCheckCircle className="h-3 w-3" />
                            {t("split_bill.paid", "Lunas")}
                        </p>
                    ) : (
                        <div className="mt-2 space-y-1.5">
                            {/* Bayar dari saldo — SELALU ditampilkan agar pembayar
                                tahu opsinya. Nonaktif bila saldo kurang, disertai
                                arahan mengisi saldo. Server tetap memvalidasi ulang. */}
                            <button
                                type="button"
                                onClick={payWithWallet}
                                disabled={busy || !canPayWithWallet}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <MdAccountBalanceWallet className="h-3.5 w-3.5" />
                                {busy
                                    ? t("split_bill.processing", "Memproses...")
                                    : `${t("split_bill.pay_wallet", "Bayar dengan Saldo")} ${rupiah(mine.amount)}`}
                            </button>

                            {!canPayWithWallet ? (
                                <p className="flex items-start gap-1 px-0.5 text-[11px] text-amber-600">
                                    <FiAlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                    <span>
                                        {t("payment.wallet_insufficient", "Saldo kurang")}{" "}
                                        {rupiah(shortfall)}.{" "}
                                        <Link
                                            href="/profile-history"
                                            className="font-semibold underline"
                                        >
                                            {t("wallet.topup", "Isi Saldo")}
                                        </Link>
                                    </span>
                                </p>
                            ) : null}

                            {/* Popup Midtrans ditutup tanpa selesai → jelaskan
                                bahwa pembayaran masih bisa dilanjutkan. */}
                            {pendingToken ? (
                                <p className="flex items-start gap-1 px-0.5 text-[11px] text-amber-600">
                                    <FiClock className="mt-0.5 h-3 w-3 shrink-0" />
                                    {t(
                                        "split_bill.payment_incomplete",
                                        "Pembayaran belum selesai. Lanjutkan untuk menyelesaikannya.",
                                    )}
                                </p>
                            ) : null}

                            <button
                                type="button"
                                onClick={pay}
                                disabled={busy}
                                className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                                    pendingToken
                                        ? "bg-amber-500 text-white hover:bg-amber-600"
                                        : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                                }`}
                            >
                                <FiCreditCard className="h-3.5 w-3.5" />
                                {busy
                                    ? t("split_bill.processing", "Memproses...")
                                    : pendingToken
                                      ? t("split_bill.continue_payment", "Lanjutkan Pembayaran")
                                      : t("split_bill.pay_midtrans", "Bayar via Midtrans")}
                            </button>
                        </div>
                    )}
                </div>
            ) : null}

            {error ? (
                <p className="mt-2 text-[11px] text-red-600">{error}</p>
            ) : null}
        </div>
    );
}
