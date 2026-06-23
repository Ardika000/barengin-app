import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import axios from "axios";

import Container from "@/Components/Container";
import Input from "@/Components/Input";
import Button from "@/Components/Button";
import MainLayout from "@/Layouts/MainLayout";

import { FaChevronLeft, FaUserFriends, FaMinus, FaPlus } from "react-icons/fa";
import { MdOutlineShoppingBag } from "react-icons/md";
import { IoMdInformationCircleOutline } from "react-icons/io";

const createEmptyParticipant = () => ({ name: "", passport: "", phone: "", nik: "" });

export default function Checkout({ trip, midtrans_client_key }) {
    // storageKey harus didefinisikan PERTAMA sebelum dipakai di useState
    const storageKey = `trip_${trip.id}_participants`;

    // ── STATE ──────────────────────────────────────────────
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
        return [createEmptyParticipant()];
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [snapReady,    setSnapReady]    = useState(false);
    const [snapToken,    setSnapToken]    = useState(null);
    const [errors,       setErrors]       = useState([]);

    // ── EFFECTS ────────────────────────────────────────────

    // Simpan participants ke localStorage setiap berubah
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(participants));
    }, [participants, storageKey]);

    // Sinkronisasi jumlah form dengan quantity
    useEffect(() => {
        setParticipants((prev) => {
            if (prev.length === quantity) return prev;
            if (prev.length < quantity) {
                return [...prev, ...Array.from({ length: quantity - prev.length }, createEmptyParticipant)];
            }
            return prev.slice(0, quantity);
        });
    }, [quantity]);

    // Load Midtrans Snap script (hanya sekali)
    useEffect(() => {
        const existing = document.querySelector('script[src*="midtrans.com/snap/snap.js"]');
        if (existing) { setSnapReady(true); return; }

        const script = document.createElement("script");
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        script.setAttribute("data-client-key", midtrans_client_key || "Mid-client-XtaGQOWVJKpMUwg0");
        script.onload  = () => setSnapReady(true);
        script.onerror = () => setSnapReady(false);
        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) document.head.removeChild(script);
        };
    }, [midtrans_client_key]);

    // ── KALKULASI ──────────────────────────────────────────
    const subtotal     = useMemo(() => trip.price * quantity,              [trip.price, quantity]);
    const serviceFee   = useMemo(() => 5000 * quantity,                    [quantity]);
    const insuranceFee = useMemo(() => 5000 * quantity,                    [quantity]);
    const total        = useMemo(() => subtotal + serviceFee + insuranceFee,[subtotal, serviceFee, insuranceFee]);

    // ── HANDLERS ───────────────────────────────────────────

    const handleParticipantChange = (index, field, value) => {
        setParticipants((prev) =>
            prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
        );
        // Hapus error field saat user mulai mengetik
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
        // 1. Validasi form partisipan
        let newErrors = [];
        let firstInvalidIndex = -1;

        participants.forEach((p, idx) => {
            const err = { name: false, phone: false };
            if (!p.name.trim())  { err.name  = true; if (firstInvalidIndex === -1) firstInvalidIndex = idx; }
            if (!p.phone.trim()) { err.phone = true; if (firstInvalidIndex === -1) firstInvalidIndex = idx; }
            newErrors[idx] = err;
        });

        setErrors(newErrors);

        if (firstInvalidIndex !== -1) {
            document
                .getElementById(`participant-form-${firstInvalidIndex}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        // 2. Cek Snap siap
        if (!snapReady || !window.snap) {
            alert("Midtrans Snap belum siap. Coba refresh halaman.");
            return;
        }

        // 3. Buka kembali popup jika token sudah ada
        if (snapToken) {
            openMidtransPopup(snapToken);
            return;
        }

        // 4. Buat transaksi baru
        setIsProcessing(true);
        try {
            const response = await axios.post(`/trip-bareng/${trip.id}/payment`, {
                quantity,
                participants,
            });

            const { snap_token } = response.data || {};
            if (!snap_token) throw new Error("snap_token tidak ditemukan di response.");

            setSnapToken(snap_token);
            openMidtransPopup(snap_token);

        } catch (error) {
            console.error("Gagal mendapatkan token", error);
            alert("Terjadi kesalahan sistem. Coba beberapa saat lagi.");
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
                // Transaksi tercatat sebagai "Menunggu Pembayaran"
                localStorage.removeItem(storageKey);
                router.visit("/profile-history?tab=transactions");
            },
            onError: () => {
                alert("Pembayaran gagal. Silakan coba lagi.");
                setIsProcessing(false);
            },
            onClose: () => {
                // Transaksi sudah dibuat (pending) -> arahkan ke riwayat transaksi
                router.visit("/profile-history?tab=transactions");
            },
        });
    };

    // ── RENDER ─────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 pb-20 pt-6">
            <Head title="Checkout Trip - Barengin" />
            <Container>

                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/trip-bareng/${trip.id}`}
                        className="inline-flex items-center text-2xl font-bold text-neutral-900 hover:text-primary-700 mb-2 gap-3 transition"
                    >
                        <FaChevronLeft className="text-xl" />
                        Checkout Trip
                    </Link>
                    <p className="text-neutral-500 ml-9">Selesaikan pesanan Anda dengan aman dan cepat</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ── LEFT: Forms ── */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Trip Summary & Quantity */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                            <div className="flex gap-4 items-center pb-6 border-b border-neutral-100">
                                <img
                                    src={trip.image}
                                    alt={trip.title}
                                    className="w-20 h-20 rounded-xl object-cover border border-neutral-200"
                                    onError={(e) => (e.target.src = "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop")}
                                />
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-900 mb-1">{trip.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2 font-medium">
                                        <FaUserFriends className="text-neutral-400" />
                                        {trip.joined_count} / {trip.capacity} orang telah bergabung
                                    </div>
                                    <p className="text-primary-700 font-bold">
                                        Rp {Number(trip.price).toLocaleString("id-ID")}{" "}
                                        <span className="text-sm font-normal text-neutral-500">/orang</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6">
                                <div>
                                    <h4 className="font-bold text-neutral-900">Total partisipan</h4>
                                    <p className="text-sm text-neutral-500">Hanya tersisa {trip.remaining_quota} kuota lagi</p>
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

                        {/* Participant Forms — jumlah sesuai quantity */}
                        {participants.map((p, idx) => (
                            <div
                                key={idx}
                                id={`participant-form-${idx}`}
                                className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${
                                    errors[idx]?.name || errors[idx]?.phone
                                        ? "border-red-400 ring-4 ring-red-50"
                                        : "border-neutral-100"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-neutral-900">Info Partisipan {idx + 1}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${idx % 2 === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                        Person {idx + 1}
                                    </span>
                                </div>

                                <div className="space-y-5">
                                    {/* Nama */}
                                    <div>
                                        <Input
                                            label="Nama Lengkap"
                                            placeholder="Masukkan nama lengkap sesuai KTP"
                                            value={p.name}
                                            onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                                            disabled={snapToken !== null}
                                        />
                                        {errors[idx]?.name && (
                                            <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                                <IoMdInformationCircleOutline className="text-sm" /> Nama Lengkap wajib diisi.
                                            </p>
                                        )}
                                    </div>

                                    {/* Paspor */}
                                    <Input
                                        label="No. Paspor (Opsional)"
                                        placeholder="Nomor paspor resmi anda"
                                        value={p.passport}
                                        onChange={(e) => handleParticipantChange(idx, "passport", e.target.value)}
                                        disabled={snapToken !== null}
                                    />

                                    {/* Telepon & NIK */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <Input
                                                label="Nomor Telepon"
                                                placeholder="No Telpon"
                                                value={p.phone}
                                                onChange={(e) => handleParticipantChange(idx, "phone", e.target.value)}
                                                disabled={snapToken !== null}
                                                leftAddon={<span className="text-neutral-700 font-medium">+62</span>}
                                            />
                                            {errors[idx]?.phone && (
                                                <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1">
                                                    <IoMdInformationCircleOutline className="text-sm" /> Nomor Telepon wajib diisi.
                                                </p>
                                            )}
                                        </div>
                                        <Input
                                            label="NIK (Opsional)"
                                            placeholder="NIK"
                                            value={p.nik}
                                            onChange={(e) => handleParticipantChange(idx, "nik", e.target.value)}
                                            disabled={snapToken !== null}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── RIGHT: Summary ── */}
                    <div className="lg:col-span-4">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 sticky top-24">
                            <div className="flex items-center gap-2 mb-6">
                                <MdOutlineShoppingBag className="text-xl text-neutral-800" />
                                <h3 className="text-lg font-bold text-neutral-900">Detail Pembayaran</h3>
                            </div>

                            <div className="space-y-4 text-sm text-neutral-600 border-b border-neutral-100 pb-6 mb-6">
                                <div className="flex justify-between items-center">
                                    <span>Subtotal ({quantity} orang)</span>
                                    <span className="font-semibold text-neutral-900">Rp {Number(subtotal).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Biaya Layanan</span>
                                    <span className="font-semibold text-neutral-900">Rp {Number(serviceFee).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Biaya Asuransi Trip</span>
                                    <span className="font-semibold text-neutral-900">Rp {Number(insuranceFee).toLocaleString("id-ID")}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-neutral-900">Total Pembayaran</span>
                                <span className="text-lg font-bold text-neutral-900">Rp {Number(total).toLocaleString("id-ID")}</span>
                            </div>

                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 mb-6">
                                <IoMdInformationCircleOutline className="text-orange-600 text-2xl shrink-0 mt-0.5" />
                                <p className="text-xs text-orange-800 leading-relaxed">
                                    Dengan menekan 'Bayar Sekarang', Anda menyetujui Ketentuan Layanan dan Kebijakan
                                    Pembatalan kami. Pembayaran ditangani aman oleh Midtrans.
                                </p>
                            </div>

                            <Button
                                onClick={handlePayment}
                                disabled={isProcessing || !snapReady || quantity < 1}
                                type="button"
                                size="md"
                                className="w-full font-bold flex justify-center text-white py-3 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? "Memproses..." : snapToken ? "Buka Kembali Pembayaran" : "Bayar Sekarang"}
                            </Button>

                            {!snapReady && (
                                <p className="text-xs text-neutral-400 mt-3 text-center">
                                    Memuat sistem pembayaran... (Jika lama, coba refresh)
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
