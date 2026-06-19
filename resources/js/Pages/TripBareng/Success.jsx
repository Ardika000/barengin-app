import React from "react";
import { Head, Link, router } from "@inertiajs/react";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import MainLayout from "@/Layouts/MainLayout";

import { FaRegCalendarAlt, FaUserFriends } from "react-icons/fa";
import { BsCheckLg, BsChatDotsFill } from "react-icons/bs";

export default function Success({ order }) {
    const handleOpenTripGroupChat = () => {
        router.post(`/chat/trip/${order.trip_id}/group`);
    };
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-16 pb-32">
            <Head title="Pembayaran Berhasil - Barengin" />

            <Container className="flex flex-col items-center w-full max-w-2xl px-4">
                
                {/* 1. Ikon Ceklis Besar */}
                <div className="w-24 h-24 bg-[#34C759] rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200 mb-6">
                    <BsCheckLg className="text-5xl" strokeWidth={1} />
                </div>

                {/* 2. Judul */}
                <h1 className="text-3xl font-bold text-neutral-900 mb-2 text-center">Pembayaran Berhasil</h1>
                <p className="text-lg text-neutral-600 mb-10 text-center">Yeay, Pembayaran Kamu berhasil</p>

                {/* 3. Kartu Transaksi */}
                <div className="w-full max-w-[500px] relative mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8 w-full relative z-0">
                        
                        {/* Header Kartu: Transaction ID */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-sm text-neutral-500 mb-1">Transaction ID</p>
                                <p className="text-xl font-bold text-neutral-900 tracking-wide">{order.transaction_id}</p>
                            </div>
                            <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold">
                                Terbayar
                            </div>
                        </div>

                        {/* Info Trip */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img
                                    src={order.image}
                                    alt={order.trip_title}
                                    className="w-16 h-16 rounded-xl object-cover border border-neutral-100 shadow-sm"
                                    onError={(e) => e.target.src = "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?q=80&w=2071&auto=format&fit=crop"}
                                />
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-900">{order.trip_title}</h3>
                                    <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1 font-medium">
                                        <FaRegCalendarAlt />
                                        {order.date_range}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xl font-bold text-neutral-900">{order.quantity}x</span>
                        </div>
                    </div>

                    {/* 4. Floating Badge (Dinamis Sesuai Permintaan) */}
                    <div className="absolute -bottom-5 right-2 md:-right-8 bg-[#6ED78D] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-green-200 z-10 font-semibold text-sm">
                        <FaUserFriends className="text-lg shrink-0" />
                        {order.friends_waiting > 0 
                            ? `${order.friends_waiting} Teman Baru Menunggu` 
                            : "Bergabung dalam grup"
                        }
                    </div>
                </div>

                {/* 5. Tombol Aksi */}
                <div className="w-full max-w-[500px] flex flex-col gap-4 mt-2">
                    {/* Tombol Primary (Biru) dengan icon chat */}
                    <Button 
                        isButtonLink={false}
                        type="primary" 
                        size="md" 
                        rounded={true}
                        className="w-full font-bold flex items-center justify-center gap-2 text-white"
                        onClick={handleOpenTripGroupChat}
                    >
                        <BsChatDotsFill className="text-lg" />
                        Masuk ke Grup Chat
                    </Button>
                    
                    {/* Tombol Outline untuk Lewati */}
                    <Button 
                        isButtonLink
                        href="/trip-bareng"
                        variant="outline" 
                        type="neutral" 
                        size="md" 
                        rounded={true}
                        className="w-full font-bold bg-white text-neutral-700"
                    >
                        Lewati
                    </Button>
                </div>

            </Container>
        </div>
    );
}

Success.layout = (page) => <MainLayout children={page} />;