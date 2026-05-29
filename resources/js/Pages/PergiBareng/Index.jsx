import React, { useState, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import PergiBarengSearchForm from "@/Components/PergiBarengSearchForm";
import PergiBarengCard from "@/Components/PergiBarengCard";
import Select from "@/Components/Select";
import Pagination from "@/Components/Pagination";
import HeroSection from "./HeroSection";

export default function Index({ trips = [] }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState("schedule");

    // Mengirim permintaan ke backend secara otomatis saat sortBy atau currentPage berubah
    useEffect(() => {
        router.get(
            window.location.pathname, // Mengambil URL saat ini dengan aman
            { sort: sortBy, page: currentPage }, // Mengirim query data sort & page ke backend
            {
                preserveState: true, // Mencegah reset state yang ada
                preserveScroll: true, // Mencegah layar scroll kembali ke atas saat loading
                replace: true, // Mengganti history URL agar rapi saat kembali (back browser)
            }
        );
    }, [sortBy, currentPage]);

    return (
        <>
            <Head title="Pergi Bareng - Barengin" />

            {/* Hero Section */}
            <HeroSection />
            <div className="relative z-30 -mt-12 px-4 sm:px-6 lg:px-8">
                <Container>
                    <PergiBarengSearchForm naked={true} />
                </Container>
            </div>

            <Container className="py-12 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <h2 className="text-2xl font-bold text-neutral-900">
                        Cari Teman Bareng Anda
                    </h2>

                    <div className="flex items-center gap-3">
                        <Select
                            label=""
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-48"
                            selectClassName="h-10"
                        >
                            <option value="schedule">Jadwal Terdekat</option>
                            <option value="rating">Rating Tertinggi</option>
                            <option value="seats">Sisa Kursi Terbanyak</option>
                        </Select>

                    </div>
                </div>
                
                {trips.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {trips.map((trip) => (
                                <PergiBarengCard key={trip.id} data={trip} />
                            ))}
                        </div>

                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={10}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <p className="text-neutral-500 text-lg">
                            Belum ada jadwal pergi bareng saat ini.
                        </p>
                    </div>
                )}
            </Container>
        </>
    );
}

Index.layout = (page) => <MainLayout>{page}</MainLayout>;