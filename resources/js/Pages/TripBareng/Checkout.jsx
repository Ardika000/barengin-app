import React, { useEffect, useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import axios from "axios";

import Container from "@/Components/Container";
import Input from "@/Components/Input";
import Button from "@/Components/Button";
import MainLayout from "@/Layouts/MainLayout";
import PaymentMethodSelector from "@/Components/PaymentMethodSelector";
import { useTranslation } from "@/lib/useTranslation";

import { FaChevronLeft, FaUserFriends, FaMinus, FaPlus } from "react-icons/fa";
import { MdOutlineShoppingBag } from "react-icons/md";
import { IoMdInformationCircleOutline } from "react-icons/io";

const createEmptyParticipant = () => ({ name: "", passport: "", phone: "", nik: "" });

const toLocalPhone = (raw) => {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.startsWith("62")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    return d;
};

const validatePhone = (raw) => {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (!digits) return "empty";
    if (!/^8\d{8,11}$/.test(digits)) return "invalid";
    return null;
};

const isValidNik = (raw) => /^\d{16}$/.test(String(raw || ""));
const isValidPassport = (raw) => /^[A-Za-z0-9]{5,12}$/.test(String(raw || ""));

export default function Checkout({ trip, midtrans_client_key, wallet_balance = 0 }) {
    const { t } = useTranslation();
    const authUser = usePage().props?.auth?.user;
    const storageKey = `trip_${trip.id}_participants`;

    const makeFirstParticipant = () => ({
        name: authUser?.full_name || authUser?.name || "",
        passport: "",
        phone: toLocalPhone(authUser?.phone),
        nik: "",
    });

    const [quantity, setQuantity] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) && parsed.length > 0 ? parsed.length : 1;
            }
        } catch { /* ignore */ }
        return trip.remaining_quota > 0 ? 1 : 0;
    });

    const [participants, setParticipants] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch { /* ignore */ }
        return [makeFirstParticipant()];
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [snapReady,    setSnapReady]    = useState(false);
    const [snapToken,    setSnapToken]    = useState(null);
    const [errors,       setErrors]       = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("midtrans");

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(participants));
    }, [participants, storageKey]);

    useEffect(() => {
        setParticipants((prev) => {
            if (prev.length === quantity) return prev;
            if (prev.length < quantity) {
                return [...prev, ...Array.from({ length: quantity - prev.length }, createEmptyParticipant)];
            }
            return prev.slice(0, quantity);
        });
    }, [quantity]);

    useEffect(() => {
        const existing = document.querySelector('script[src*="midtrans.com/snap/snap.js"]');
        if (existing) { setSnapReady(true); return; }

        const script = document.createElement("script");
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        // Fallback = client key merchant M334317500; key lama milik akun lain
        // dan bikin popup gagal kalau snap.js dimuat pertama kali dengan itu.
        script.setAttribute("data-client-key", midtrans_client_key || "Mid-client-mGla22pQRRj2Oeks");
        script.onload  = () => setSnapReady(true);
        script.onerror = () => setSnapReady(false);
        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) document.head.removeChild(script);
        };
    }, [midtrans_client_key]);

    const subtotal     = useMemo(() => trip.price * quantity,              [trip.price, quantity]);
    const serviceFee   = useMemo(() => 5000 * quantity,                    [quantity]);
    const insuranceFee = useMemo(() => 5000 * quantity,                    [quantity]);
    const total        = useMemo(() => subtotal + serviceFee + insuranceFee,[subtotal, serviceFee, insuranceFee]);

    const handleParticipantChange = (index, field, value) => {
        let v = value;
        if (field === "phone") v = value.replace(/\D/g, "").slice(0, 12);
        else if (field === "nik") v = value.replace(/\D/g, "").slice(0, 16);
        else if (field === "passport") v = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);

        setParticipants((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, [field]: v } : item))
        );
        if (errors[index]?.[field]) {
            setErrors((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], [field]: false };
                return next;
            });
        }
    };

    const handleQuantityChange = (type) => {
        if (isProcessing || snapToken) return;
        if (type === "minus" && quantity > 1) {
            setQuantity((q) => q - 1);
            setErrors((prev) => prev.slice(0, quantity - 1));
        }
        if (type === "plus" && quantity < trip.remaining_quota) {
            setQuantity((q) => q + 1);
        }
    };

    const handlePayment = async () => {
        let newErrors = [];
        let firstInvalidIndex = -1;

        participants.forEach((p, idx) => {
            const err = { name: false, phone: false, nik: false, passport: false };
            if (!p.name.trim())  { err.name  = true; if (firstInvalidIndex === -1) firstInvalidIndex = idx; }
            const phoneErr = validatePhone(p.phone);
            if (phoneErr) { err.phone = phoneErr; if (firstInvalidIndex === -1) firstInvalidIndex = idx; }
            if (p.nik?.trim() && !isValidNik(p.nik)) { err.nik = true; if (firstInvalidIndex === -1) firstInvalidIndex = idx; }
            if (p.passport?.trim() && !isValidPassport(p.passport)) { err.passport = true; if (firstInvalidIndex === -1) firstInvalidIndex = idx; }
            newErrors[idx] = err;
        });

        setErrors(newErrors);

        if (firstInvalidIndex !== -1) {
            document
                .getElementById(`participant-form-${firstInvalidIndex}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        if (paymentMethod === "wallet") {
            setIsProcessing(true);
            try {
                const response = await axios.post(`/trip-bareng/${trip.id}/payment`, {
                    quantity,
                    participants,
                    payment_method: "wallet",
                });

                if (response.data?.paid) {
                    localStorage.removeItem(storageKey);
                    router.visit(`/trip-bareng/${trip.id}/success`);
                    return;
                }

                throw new Error("Respons pembayaran saldo tidak dikenali.");
            } catch (error) {
                const message = error?.response?.data?.error;
                toast.error(message || "Terjadi kesalahan sistem. Coba beberapa saat lagi.");
                setIsProcessing(false);
            }
            return;
        }

        if (!snapReady || !window.snap) {
            toast.warning("Sistem pembayaran belum siap. Coba refresh halaman.");
            return;
        }

        if (snapToken) {
            openMidtransPopup(snapToken);
            return;
        }

        setIsProcessing(true);
        try {
            const response = await axios.post(`/trip-bareng/${trip.id}/payment`, {
                quantity,
                participants,
                payment_method: "midtrans",
            });

            const { snap_token } = response.data || {};
            if (!snap_token) throw new Error("snap_token tidak ditemukan di response.");

            setSnapToken(snap_token);
            openMidtransPopup(snap_token);

        } catch (error) {
            console.error("Gagal mendapatkan token", error);
            toast.error("Terjadi kesalahan sistem. Coba beberapa saat lagi.");
            setIsProcessing(false);
        }
    };

    const openMidtransPopup = (token) => {
        window.snap.pay(token, {
            onSuccess: () => {
                localStorage.removeItem(storageKey);
                router.visit(`/trip-bareng/${trip.id}/success`);
            },
            onPending: () => {
                localStorage.removeItem(storageKey);
                router.visit("/profile-history?tab=transactions");
            },
            onError: () => {
                toast.error("Pembayaran gagal. Silakan coba lagi.");
                setIsProcessing(false);
            },
            onClose: () => {
                router.visit("/profile-history?tab=transactions");
            },
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-6">
            <Head title="Checkout Trip - Barengin" />
            <Container>

                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() =>
                            window.history.length > 1
                                ? window.history.back()
                                : router.visit(`/trip-bareng/${trip.id}`)
                        }
                        className="inline-flex items-center text-2xl font-bold text-neutral-700 hover:text-primary-700 mb-2 gap-3 transition cursor-pointer"
                    >
                        <FaChevronLeft className="text-xl" />
                        {t("trip.checkout.title")}
                    </button>
                    <p className="text-neutral-500 ml-9">{t("trip.checkout.subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    <div className="lg:col-span-8 space-y-6">

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                            <div className="flex gap-4 items-center pb-6 border-b border-neutral-100">
                                <img
                                    src={trip.image}
                                    alt={trip.title}
                                    className="w-20 h-20 rounded-xl object-cover border border-neutral-200"
                                    onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop")}
                                />
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-700 mb-1">{trip.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2 font-medium">
                                        <FaUserFriends className="text-neutral-400" />
                                        {trip.joined_count} / {trip.capacity} {t("trip.checkout.people_joined")}
                                    </div>
                                    <p className="text-primary-700 font-bold">
                                        Rp {Number(trip.price).toLocaleString("id-ID")}{" "}
                                        <span className="text-sm font-normal text-neutral-500">{t("common.per_person")}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6">
                                <div>
                                    <h4 className="font-bold text-neutral-700">{t("trip.checkout.total_participants")}</h4>
                                    <p className="text-sm text-neutral-500">{t("trip.checkout.only")} {trip.remaining_quota} {t("trip.checkout.quota_more")}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleQuantityChange("minus")}
                                        disabled={quantity <= 1 || isProcessing || snapToken !== null}
                                        className="w-8 h-8 rounded-full border-2 border-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 transition"
                                    >
                                        <FaMinus className="text-xs" />
                                    </button>
                                    <span className="font-bold text-lg w-4 text-center">{quantity}</span>
                                    <button
                                        onClick={() => handleQuantityChange("plus")}
                                        disabled={quantity >= trip.remaining_quota || isProcessing || snapToken !== null}
                                        className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center shadow-sm hover:bg-primary-800 disabled:opacity-50 transition"
                                    >
                                        <FaPlus className="text-xs" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {participants.map((p, idx) => (
                            <div
                                key={idx}
                                id={`participant-form-${idx}`}
                                className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${
                                    errors[idx]?.name || errors[idx]?.phone || errors[idx]?.nik || errors[idx]?.passport
                                        ? "border-red-400 ring-4 ring-red-50"
                                        : "border-neutral-100"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-neutral-700">{t("trip.checkout.participant_info")} {idx + 1}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${idx % 2 === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                        {t("trip.checkout.person")} {idx + 1}
                                    </span>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <Input
                                            label={<>{t("auth.onboard.full_name")} <span className="text-red-500">*</span></>}
                                            placeholder={t("trip.checkout.name_ph")}
                                            value={p.name}
                                            onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                                            disabled={snapToken !== null}
                                        />
                                        {errors[idx]?.name && (
                                            <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                                <IoMdInformationCircleOutline className="text-sm" /> {t("trip.checkout.name_required")}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Input
                                            label={t("trip.checkout.passport")}
                                            placeholder={t("trip.checkout.passport_ph")}
                                            value={p.passport}
                                            onChange={(e) => handleParticipantChange(idx, "passport", e.target.value)}
                                            disabled={snapToken !== null}
                                            maxLength={12}
                                        />
                                        {errors[idx]?.passport && (
                                            <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                                <IoMdInformationCircleOutline className="text-sm" /> {t("trip.checkout.passport_invalid")}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <Input
                                                label={<>{t("trip.checkout.phone_label")} <span className="text-red-500">*</span></>}
                                                placeholder="81234567890"
                                                inputMode="numeric"
                                                value={p.phone}
                                                onChange={(e) => handleParticipantChange(idx, "phone", e.target.value)}
                                                disabled={snapToken !== null}
                                                leftAddon={<span className="text-neutral-700 font-medium">+62</span>}
                                            />
                                            {errors[idx]?.phone && (
                                                <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                                    <IoMdInformationCircleOutline className="text-sm" />
                                                    {errors[idx].phone === "invalid"
                                                        ? t("trip.checkout.phone_invalid")
                                                        : t("trip.checkout.phone_required")}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Input
                                                label="NIK"
                                                placeholder="NIK"
                                                inputMode="numeric"
                                                value={p.nik}
                                                onChange={(e) => handleParticipantChange(idx, "nik", e.target.value)}
                                                disabled={snapToken !== null}
                                                maxLength={16}
                                            />
                                            {errors[idx]?.nik && (
                                                <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                                    <IoMdInformationCircleOutline className="text-sm" /> {t("trip.checkout.nik_invalid")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 sticky top-24">
                            <div className="flex items-center gap-2 mb-6">
                                <MdOutlineShoppingBag className="text-xl text-neutral-800" />
                                <h3 className="text-lg font-bold text-neutral-700">{t("trip.checkout.payment_details")}</h3>
                            </div>

                            <div className="space-y-4 text-sm text-neutral-600 border-b border-neutral-100 pb-6 mb-6">
                                <div className="flex justify-between items-center">
                                    <span>Subtotal ({quantity} {t("common.people_word")})</span>
                                    <span className="font-semibold text-neutral-700">Rp {Number(subtotal).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>{t("trip.checkout.service_fee")}</span>
                                    <span className="font-semibold text-neutral-700">Rp {Number(serviceFee).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>{t("trip.checkout.insurance_fee")}</span>
                                    <span className="font-semibold text-neutral-700">Rp {Number(insuranceFee).toLocaleString("id-ID")}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-neutral-700">{t("trip.checkout.total_payment")}</span>
                                <span className="text-lg font-bold text-neutral-700">Rp {Number(total).toLocaleString("id-ID")}</span>
                            </div>

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
                                    {t("trip.checkout.terms_note")}
                                </p>
                            </div>

                            <Button
                                onClick={handlePayment}
                                disabled={
                                    isProcessing ||
                                    quantity < 1 ||
                                    (paymentMethod === "midtrans" && !snapReady)
                                }
                                type="button"
                                size="md"
                                className="w-full font-bold flex justify-center text-white py-3 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? t("common.processing") : snapToken ? t("trip.checkout.reopen_payment") : t("trip.checkout.pay_now")}
                            </Button>

                            {paymentMethod === "midtrans" && !snapReady && (
                                <p className="text-xs text-neutral-400 mt-3 text-center">
                                    {t("trip.checkout.loading_payment")}
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
