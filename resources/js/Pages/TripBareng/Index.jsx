import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import TripCard from "@/Components/TripCard";
import Container from "@/Components/Container";
import TripSearchForm from "@/Components/TripSearchForm";
import Pagination from "@/Components/Pagination";
import Select from "@/Components/Select";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";

export default function Index({ trips, all_trips, filters = {} }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("all");
    const [sortBy, setSortBy]       = useState(filters?.sort ?? "");

    const tripItems = trips?.data || [];

    // ── Navigasi ke backend dengan mempertahankan pencarian + urutan ──
    const visit = (params) => {
        router.get(
            window.location.pathname,
            {
                tujuan: filters?.tujuan || undefined,
                start_date: filters?.start_date || undefined,
                end_date: filters?.end_date || undefined,
                ...params,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleSort = (e) => {
        const value = e.target.value;
        setSortBy(value);
        visit({ sort: value || undefined, page: 1 }); // reset ke halaman 1
    };

    const handlePageChange = (newPage) => visit({ sort: sortBy || undefined, page: newPage });

    return (
        <div className="min-h-screen bg-neutral-50 pb-16 md:pb-24">
            <Head title="Trip Bareng - Barengin" />

            {/* Hero */}
            <header
                className="pt-24 pb-30 md:pt-40 md:pb-40 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.4)), url('/assets/trip-bareng/hero-bg.png')",
                }}
            >
                <Container className="text-center text-white">
                    <h1 className="text-4xl md:text-6xl font-semibold mb-4">
                        {t("trip.hero.title")}
                    </h1>
                    <p className="text-base md:text-lg mb-0 max-w-3xl mx-auto font-light">
                        {t("trip.hero.subtitle")}
                    </p>
                </Container>
            </header>

            {/* Search Form */}
            <section className="-mt-16 md:-mt-20 px-4 sm:px-0">
                <Container>
                    <TripSearchForm
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                    />
                </Container>
            </section>

            {/* Trip List */}
            <Container className="mt-12 md:mt-16">

                {/* Header & Sort */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-700">
                            {t("trip.index.heading")}
                        </h2>
                        <p className="text-sm text-neutral-500 mt-1">
                            {trips?.total ?? tripItems.length} {t("trip.index.available")}
                        </p>
                    </div>

                    {/* Satu dropdown Urutkan */}
                    <Select
                        label=""
                        value={sortBy}
                        onChange={handleSort}
                        className="w-48"
                        selectClassName="h-10 bg-white"
                    >
                        <option value="">{t("trip.sort.default")}</option>
                        <option value="rating">{t("trip.sort.rating")}</option>
                        <option value="price_asc">{t("trip.sort.price_asc")}</option>
                        <option value="price_desc">{t("trip.sort.price_desc")}</option>
                        <option value="newest">{t("trip.sort.newest")}</option>
                    </Select>
                </div>

                {tripItems.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {tripItems.map((trip) => (
                                <TripCard key={trip.id} trip={trip} />
                            ))}
                        </div>

                        {trips.last_page > 1 && (
                            <div className="mt-12 md:mt-16 border-t border-neutral-200 pt-8 flex justify-center">
                                <Pagination
                                    currentPage={trips.current_page}
                                    totalPages={trips.last_page}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200 shadow-sm">
                        <p className="text-neutral-500 text-lg font-medium">
                            {t("trip.index.empty")}
                        </p>
                    </div>
                )}

            </Container>
        </div>
    );
}

Index.layout = (page) => <MainLayout>{page}</MainLayout>;