import React, { useState, useEffect } from "react";
import { Head, Link } from "@inertiajs/react";
import Container from "@/Components/Container";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";

import { FaChevronLeft } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { MdContentCopy } from "react-icons/md";

export default function WaitingPayment({ paymentData }) {
    const { t } = useTranslation();
    // Timer State (Set ke 3600 detik = 1 Jam)
    const [timeLeft, setTimeLeft] = useState(3600);
    const [copied, setCopied] = useState(false);

    // Efek Hitung Mundur (Countdown)
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    // Format waktu ke HH:MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    // Fungsi Salin VA
    const handleCopy = () => {
        navigator.clipboard.writeText(paymentData.va_number.replace(/\s/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset tulisan salin setelah 2 detik
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24 pt-8">
            <Head title="Menunggu Pembayaran - Barengin" />

            <Container>
                {/* Menggunakan max-w-3xl agar card nya tidak terlalu lebar (sesuai desain) */}
                <div className="max-w-4xl mx-auto">
                    
                    {/* Header */}
                    <div className="mb-8">
                        <Link 
                            href={`/trip-bareng/${paymentData.trip_id}/checkout`} 
                            className="inline-flex items-center text-2xl font-bold text-neutral-700 hover:text-primary-700 mb-2 gap-3 transition"
                        >
                            <FaChevronLeft className="text-xl" />
                            {t("trip.waiting.title")}
                        </Link>
                        <p className="text-neutral-600 ml-9">{t("trip.waiting.subtitle")}</p>
                    </div>

                    {/* Banner Timer Biru */}
                    <div className="bg-[#0071C1] text-white rounded-2xl p-8 mb-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <p className="text-base font-medium mb-3">{t("trip.waiting.complete_in")}</p>
                        <div className="flex items-center gap-3 text-[40px] md:text-[44px] font-bold leading-none tracking-wide mb-3">
                            <FaRegClock className="text-3xl md:text-4xl" />
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-base font-medium opacity-90">{t("trip.waiting.due")} {paymentData.due_date}</p>
                    </div>

                    {/* Card Total Pembayaran */}
                    <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-neutral-200 flex justify-between items-center">
                        <span className="text-lg font-bold text-neutral-700">{t("trip.checkout.total_payment")}</span>
                        <span className="text-xl font-bold text-neutral-700">Rp {paymentData.total_amount.toLocaleString("id-ID")}</span>
                    </div>

                    {/* Card Virtual Account */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-neutral-200">
                        {/* Header Bank */}
                        <div className="flex items-center gap-4">
                            {/* Logo BCA (Mockup text/image) */}
                            <div className="flex items-center gap-1 font-bold italic text-blue-800 text-2xl tracking-tighter">
                                <span className="text-[#00529C]">BCA</span>
                            </div>
                            <span className="text-lg font-medium text-neutral-700">{paymentData.bank_name}</span>
                        </div>

                        <hr className="border-neutral-200 my-6" />

                        {/* Rincian VA */}
                        <div>
                            <p className="text-sm font-medium text-neutral-600 mb-3">{t("trip.waiting.va_label")}</p>
                            
                            {/* Kotak Nomor VA */}
                            <div className="bg-[#F4F9FD] rounded-xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <span className="text-2xl font-medium text-[#0071C1] tracking-wider">
                                    {paymentData.va_number}
                                </span>
                                
                                <button 
                                    onClick={handleCopy}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-semibold text-sm transition-all duration-200
                                        ${copied 
                                            ? 'bg-green-50 border-green-200 text-green-600' 
                                            : 'bg-white border-neutral-200 text-[#0071C1] hover:bg-blue-50'
                                        }`}
                                >
                                    <MdContentCopy className="text-lg" />
                                    {copied ? t("trip.waiting.copied") : t("trip.waiting.copy")}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </Container>
        </div>
    );
}

WaitingPayment.layout = (page) => <MainLayout children={page} />;