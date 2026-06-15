import React from "react";
import { Head, router } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import { FaCheck, FaCalendarAlt } from "react-icons/fa";
import { BsChatDotsFill } from "react-icons/bs";
export default function Success({ trip }) {
    const handleOpenPergiBarengGroupChat = () => {
        router.post(`/chat/pergi-bareng/${trip.id}/group`);
    }
    return (
        <MainLayout>
            <Head title="Berhasil Bergabung" />

            <Container className="py-16 flex flex-col items-center justify-center min-h-[70vh]">
                
                {/* Ikon Centang Hijau */}
                <div className="w-20 h-20 bg-success-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-success-200">
                    <FaCheck className="text-3xl" />
                </div>

                <h1 className="text-3xl font-bold text-neutral-900 mb-2">Berhasil Bergabung</h1>
                <p className="text-neutral-600 mb-8">Yeay, Kamu berhasil bergabung</p>

                {/* Card Summary */}
                <div className="bg-white border border-neutral-200 rounded-2xl p-6 w-full max-w-md shadow-sm mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-neutral-500">Pergi Bareng ID</p>
                            <p className="font-bold text-neutral-900">{trip.trip_id}</p>
                        </div>
                        <span className="bg-success-100 text-success-700 text-xs font-semibold px-2 py-1 rounded">Tergabung</span>
                    </div>

                    <div className="flex items-center gap-4 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        <img src="/assets/terminal-cibubur.jpg" className="w-14 h-14 rounded-lg object-cover" alt="Trip" />
                        <div className="flex-1">
                            <h4 className="font-bold text-sm text-neutral-900">{trip.title}</h4>
                            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                                <FaCalendarAlt /> {trip.date}
                            </p>
                        </div>
                        <div className="font-bold text-neutral-700">1x</div>
                    </div>
                </div>

                {/* Tombol Aksi */}
                <div className="w-full max-w-md space-y-3">
                    <Button isButtonLink={false} type="primary" className="w-full font-bold flex items-center justify-center gap-2 text-white" onClick={handleOpenPergiBarengGroupChat}>
                        <BsChatDotsFill className="text-lg" />
                        Masuk ke Grup Chat
                    </Button>
                    <Button isButtonLink href={`/pergi-bareng/${trip.id}`} variant="outline" className="w-full justify-center text-neutral-600 border-neutral-300 hover:bg-neutral-50">
                        Lewati
                    </Button>
                </div>

            </Container>
        </MainLayout>
    );
}