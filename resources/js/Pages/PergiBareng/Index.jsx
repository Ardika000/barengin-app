import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import PergiBarengSearchForm from "@/Components/PergiBarengSearchForm";
import PergiBarengCard from "@/Components/PergiBarengCard";
import Select from "@/Components/Select";
import Pagination from "@/Components/Pagination";
import HeroSection from "./HeroSection";
import { useTranslation } from "@/lib/useTranslation";

export default function Index({ trips = {}, filters = {}, foreignLocation = false }) {
    const { t } = useTranslation();
    const [sortBy, setSortBy] = useState(filters?.sort ?? "schedule");

    // `trips` adalah objek paginator dari Laravel (data + meta)
    const data = trips?.data ?? [];
    const currentPage = trips?.current_page ?? 1;
    const lastPage = trips?.last_page ?? 1;

    // Navigasi ke backend dengan tetap mempertahankan filter pencarian
    const visit = (params) => {
        router.get(
            window.location.pathname,
            {
                dari: filters?.dari || undefined,
                ke: filters?.ke || undefined,
                tanggal: filters?.tanggal || undefined,
                waktu: filters?.waktu || undefined,
                jumlah: filters?.jumlah || undefined,
                ...params,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleSort = (e) => {
        const value = e.target.value;
        setSortBy(value);
        visit({ sort: value, page: 1 }); // reset ke halaman 1 saat ganti urutan
    };

    const handlePageChange = (page) => visit({ sort: sortBy, page });

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
                    <h2 className="text-2xl font-bold text-neutral-700">
                        {t("pb.index.heading")}
                    </h2>

                    <div className="flex items-center gap-3">
                        <Select
                            label=""
                            value={sortBy}
                            onChange={handleSort}
                            className="w-48"
                            selectClassName="h-10"
                        >
                            <option value="schedule">{t("pb.sort.schedule")}</option>
                            <option value="rating">{t("trip.sort.rating")}</option>
                            <option value="seats">{t("pb.sort.seats")}</option>
                        </Select>

                    </div>
                </div>

                {foreignLocation && (
                    <div className="mb-6 rounded-xl border border-orange-200/60 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
                        {t("pb.index.id_only")}
                    </div>
                )}

                {data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {data.map((trip) => (
                                <PergiBarengCard key={trip.id} data={trip} />
                            ))}
                        </div>

                        {lastPage > 1 && (
                            <div className="mt-8">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={lastPage}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <p className="text-neutral-500 text-lg">
                            {t("pb.index.empty")}
                        </p>
                    </div>
                )}
            </Container>
        </>
    );
}

Index.layout = (page) => <MainLayout>{page}</MainLayout>;