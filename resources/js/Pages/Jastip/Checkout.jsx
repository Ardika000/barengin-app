import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import axios from "axios";

import Container from "@/Components/Container";
import Button from "@/Components/Button";
import PaymentMethodSelector from "@/Components/PaymentMethodSelector";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";

import { FaChevronLeft, FaMinus, FaPlus, FaTrashAlt } from "react-icons/fa";
import { MdOutlineShoppingBag } from "react-icons/md";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { HiOutlineShieldCheck } from "react-icons/hi2";

const INITIAL_VISIBLE = 3;

export default function Checkout({
    items: initialItems,
    summary,
    midtrans_client_key,
    wallet_balance = 0,
}) {
    const { t } = useTranslation();

    // ── STATE ──────────────────────────────────────────────
    const [items, setItems] = useState(initialItems || []);
    const [expanded, setExpanded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [snapReady, setSnapReady] = useState(false);
    const [snapToken, setSnapToken] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("midtrans");

    // Load Midtrans Snap script - identik dengan checkout trip (terbukti bekerja)
    useEffect(() => {
        const existing = document.querySelector(
            'script[src*="midtrans.com/snap/snap.js"]',
        );
        if (existing) {
            setSnapReady(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        // Fallback = client key merchant M334317500 (pasangan MIDTRANS_SERVER_KEY)
        script.setAttribute(
            "data-client-key",
            midtrans_client_key || "Mid-client-mGla22pQRRj2Oeks",
        );
        script.onload = () => setSnapReady(true);
        script.onerror = () => setSnapReady(false);
        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script))
                document.head.removeChild(script);
        };
    }, [midtrans_client_key]);

    const key = (it) => `${it.item_id}-${it.variant_id}`;

    // Sinkronkan keranjang session di server (indikator keranjang tetap akurat)
    const syncCart = (rows) => {
        axios
            .post("/jastip/cart/update", {
                items: rows.map((r) => ({
                    item_id: r.item_id,
                    variant_id: r.variant_id,
                    quantity: r.quantity,
                })),
            })
            .catch(() => {
                /* non-fatal */
            });
    };

    const changeQty = (it, dir) => {
        if (snapToken || isProcessing) return;
        setItems((prev) => {
            const next = prev.map((row) => {
                if (key(row) !== key(it)) return row;
                let q = row.quantity + (dir === "plus" ? 1 : -1);
                q = Math.max(1, q);
                if (row.remaining != null) q = Math.min(row.remaining, q);
                return { ...row, quantity: q };
            });
            syncCart(next);
            return next;
        });
    };

    const removeItem = (it) => {
        if (snapToken || isProcessing) return;
        setItems((prev) => {
            const next = prev.filter((row) => key(row) !== key(it));
            syncCart(next);
            return next;
        });
    };

    // ── KALKULASI ──────────────────────────────────────────
    const subtotal = useMemo(
        () => items.reduce((s, it) => s + it.price * it.quantity, 0),
        [items],
    );
    const serviceFee = summary?.service_fee ?? 5000;
    const shipping = summary?.shipping ?? 0;
    const total = subtotal + serviceFee + shipping;

    const visibleItems = expanded ? items : items.slice(0, INITIAL_VISIBLE);

    // ── HANDLERS ───────────────────────────────────────────
    const openMidtransPopup = (token) => {
        window.snap.pay(token, {
            onSuccess: (result) => {
                router.visit(`/jastip/success/${result.order_id}`);
            },
            onPending: () => {
                router.visit("/profile-history?tab=transactions");
            },
            onError: () => {
                toast.error(t("jastip.checkout.pay_failed"));
                setIsProcessing(false);
            },
            onClose: () => {
                router.visit("/profile-history?tab=transactions");
            },
        });
    };

    const handlePayment = async () => {
        if (items.length === 0) return;

        const payload = {
            items: items.map((it) => ({
                item_id: it.item_id,
                variant_id: it.variant_id,
                quantity: it.quantity,
            })),
        };

        // Bayar dari saldo: tidak lewat Snap sama sekali - server memotong saldo
        // lalu langsung melunasi pesanan.
        if (paymentMethod === "wallet") {
            setIsProcessing(true);
            try {
                const response = await axios.post("/jastip/payment", {
                    ...payload,
                    payment_method: "wallet",
                });

                if (response.data?.paid) {
                    router.visit(`/jastip/success/${response.data.transaction_id}`);
                    return;
                }

                throw new Error("Respons pembayaran saldo tidak dikenali.");
            } catch (error) {
                // 422 dari server membawa alasan yang berguna (mis. saldo/stok kurang)
                const msg =
                    error?.response?.data?.error || t("jastip.checkout.error");
                toast.error(msg);
                setIsProcessing(false);
            }
            return;
        }

        if (!snapReady || !window.snap) {
            toast.warning(t("jastip.checkout.not_ready"));
            return;
        }

        if (snapToken) {
            openMidtransPopup(snapToken);
            return;
        }

        setIsProcessing(true);
        try {
            const response = await axios.post("/jastip/payment", {
                ...payload,
                payment_method: "midtrans",
            });

            const { snap_token } = response.data || {};
            if (!snap_token)
                throw new Error("snap_token tidak ditemukan di response.");

            setSnapToken(snap_token);
            openMidtransPopup(snap_token);
        } catch (error) {
            console.error("Gagal mendapatkan token", error);
            const msg =
                error?.response?.data?.error || t("jastip.checkout.error");
            toast.error(msg);
            setIsProcessing(false);
        }
    };

    // ── RENDER ─────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-6">
            <Head title="Pembayaran Jastip - Barengin" />
            <Container>
                {/* Header - konsisten dgn checkout trip */}
                <div className="mb-8">
                    {/* Selalu kembali ke etalase semua jastip. Sebelumnya memakai
                        window.history.back() yang bisa memantul kembali ke checkout
                        (loop) karena keranjang melayang mendorong checkout ke riwayat. */}
                    <button
                        type="button"
                        onClick={() => router.visit("/jastip")}
                        className="inline-flex items-center text-2xl font-bold text-neutral-700 hover:text-primary-700 mb-2 gap-3 transition"
                    >
                        <FaChevronLeft className="text-xl" />
                        {t("jastip.checkout.title")}
                    </button>
                    <p className="text-neutral-500 ml-9">
                        {t("jastip.checkout.subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ── LEFT: Ringkasan Pesanan ── */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                            <h3 className="text-lg font-bold text-neutral-700 mb-2">
                                {t("jastip.checkout.order_summary")}
                            </h3>

                            {items.length === 0 ? (
                                <div className="py-10 text-center text-sm text-neutral-500">
                                    {t("jastip.checkout.empty")}
                                    <div className="mt-4 flex justify-center">
                                        <Button
                                            isButtonLink
                                            href="/jastip"
                                            type="primary"
                                            size="sm"
                                            className="text-white"
                                        >
                                            {t("jastip.checkout.browse")}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-neutral-100">
                                        {visibleItems.map((it) => (
                                            <div
                                                key={key(it)}
                                                className="flex gap-4 items-center py-5"
                                            >
                                                <img
                                                    src={it.image}
                                                    alt={it.name}
                                                    className="w-20 h-20 rounded-xl object-cover border border-neutral-200 shrink-0"
                                                    onError={(e) => {
                                                        e.target.src =
                                                            "/assets/default-image.png";
                                                    }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-base font-bold text-neutral-700 line-clamp-2">
                                                        {it.name}
                                                    </h4>
                                                    {it.variant && (
                                                        <p className="text-xs text-neutral-500 mt-0.5">
                                                            {it.variant_name}{" "}
                                                            {it.variant}
                                                        </p>
                                                    )}
                                                    <p className="text-primary-700 font-bold mt-1">
                                                        Rp{" "}
                                                        {Number(
                                                            it.price,
                                                        ).toLocaleString(
                                                            "id-ID",
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-3 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeItem(it)
                                                        }
                                                        disabled={
                                                            snapToken !==
                                                                null ||
                                                            isProcessing
                                                        }
                                                        title={t(
                                                            "jastip.checkout.remove",
                                                        )}
                                                        aria-label={t(
                                                            "jastip.checkout.remove",
                                                        )}
                                                        className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100 disabled:opacity-30"
                                                    >
                                                        <FaTrashAlt className="text-sm" />
                                                    </button>
                                                    {/* Counter - desain sama dgn checkout trip */}
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                changeQty(
                                                                    it,
                                                                    "minus",
                                                                )
                                                            }
                                                            disabled={
                                                                it.quantity <=
                                                                    1 ||
                                                                snapToken !==
                                                                    null ||
                                                                isProcessing
                                                            }
                                                            className="w-8 h-8 rounded-full border-2 border-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 transition"
                                                        >
                                                            <FaMinus className="text-xs" />
                                                        </button>
                                                        <span className="font-bold text-lg w-4 text-center">
                                                            {it.quantity}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                changeQty(
                                                                    it,
                                                                    "plus",
                                                                )
                                                            }
                                                            disabled={
                                                                (it.remaining !=
                                                                    null &&
                                                                    it.quantity >=
                                                                        it.remaining) ||
                                                                snapToken !==
                                                                    null ||
                                                                isProcessing
                                                            }
                                                            className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-sm hover:bg-primary-800 disabled:opacity-50 transition"
                                                        >
                                                            <FaPlus className="text-xs" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {items.length > INITIAL_VISIBLE && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpanded((v) => !v)
                                            }
                                            className="mt-1 text-sm font-semibold text-primary-700 hover:underline"
                                        >
                                            {expanded
                                                ? t("jastip.checkout.see_less")
                                                : t("jastip.checkout.see_more")}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: Jaminan + Detail Pembayaran ── */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4">
                            <HiOutlineShieldCheck className="mt-0.5 shrink-0 text-2xl text-green-600" />
                            <div>
                                <p className="text-sm font-bold text-green-700">
                                    {t("jastip.checkout.guarantee_title")}
                                </p>
                                <p className="text-xs text-green-600">
                                    {t("jastip.checkout.guarantee_desc")}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 sticky top-24">
                            <div className="flex items-center gap-2 mb-6">
                                <MdOutlineShoppingBag className="text-xl text-neutral-800" />
                                <h3 className="text-lg font-bold text-neutral-700">
                                    {t("jastip.checkout.payment_detail")}
                                </h3>
                            </div>

                            <div className="space-y-4 text-sm text-neutral-600 border-b border-neutral-100 pb-6 mb-6">
                                <div className="flex justify-between items-center">
                                    <span>{t("jastip.checkout.subtotal")}</span>
                                    <span className="font-semibold text-neutral-700">
                                        Rp{" "}
                                        {Number(subtotal).toLocaleString(
                                            "id-ID",
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>
                                        {t("jastip.checkout.service_fee")}
                                    </span>
                                    <span className="font-semibold text-neutral-700">
                                        Rp{" "}
                                        {Number(serviceFee).toLocaleString(
                                            "id-ID",
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>
                                        {t("jastip.checkout.shipping_fee")}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                        {shipping === 0
                                            ? t("jastip.checkout.free")
                                            : "Rp " +
                                              Number(shipping).toLocaleString(
                                                  "id-ID",
                                              )}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-neutral-700">
                                    {t("jastip.checkout.total")}
                                </span>
                                <span className="text-lg font-bold text-neutral-700">
                                    Rp {Number(total).toLocaleString("id-ID")}
                                </span>
                            </div>

                            {/* Metode pembayaran - dikunci setelah token Snap dibuat
                                agar pilihan tidak berubah di tengah transaksi */}
                            <div className="mb-6">
                                <PaymentMethodSelector
                                    value={paymentMethod}
                                    onChange={setPaymentMethod}
                                    balance={wallet_balance}
                                    total={total}
                                    disabled={isProcessing || snapToken !== null}
                                />
                            </div>

                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 mb-6">
                                <IoMdInformationCircleOutline className="text-orange-600 text-2xl shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800 leading-relaxed">
                                    {t("jastip.checkout.terms_note")}
                                </p>
                            </div>

                            <Button
                                onClick={handlePayment}
                                disabled={
                                    isProcessing ||
                                    items.length === 0 ||
                                    // Snap hanya jadi syarat saat memang membayar lewat Midtrans
                                    (paymentMethod === "midtrans" && !snapReady)
                                }
                                type="button"
                                size="md"
                                className="w-full font-bold flex justify-center text-white py-3 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isProcessing
                                    ? t("common.processing")
                                    : snapToken
                                      ? t("jastip.checkout.reopen")
                                      : t("jastip.checkout.pay_now")}
                            </Button>

                            {!snapReady && (
                                <p className="text-xs text-neutral-400 mt-3 text-center">
                                    {t("jastip.checkout.loading_payment")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}

Checkout.layout = (page) => <MainLayout children={page} />;
