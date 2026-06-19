import { useState, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import TripCard from "@/Components/TripCard";
import Container from "@/Components/Container";
import TripSearchForm from "@/Components/TripSearchForm";
import Pagination from "@/Components/Pagination";
import Select from "@/Components/Select";
import MainLayout from "@/Layouts/MainLayout";

export default function Index({ trips, all_trips }) {
    const [activeTab, setActiveTab] = useState("all");
    const [sortBy, setSortBy]       = useState("");

    const tripItems = trips?.data || [];

    // ── Sorting dilakukan di frontend (data sudah ada di tripItems) ──
    const sortedTrips = useMemo(() => {
        if (!sortBy) return tripItems;

        return [...tripItems].sort((a, b) => {
            switch (sortBy) {
                case "rating":
                    // Rating tertinggi → terendah
                    return (b.rating ?? 0) - (a.rating ?? 0);

                case "price_asc":
                    // Harga termurah → termahal
                    return (a.price ?? 0) - (b.price ?? 0);

                case "price_desc":
                    // Harga termahal → termurah
                    return (b.price ?? 0) - (a.price ?? 0);

                case "newest":
                    // Terbaru → terlama (berdasarkan id, makin besar makin baru)
                    return (b.id ?? 0) - (a.id ?? 0);

                default:
                    return 0;
            }
        });
    }, [tripItems, sortBy]);

    const handlePageChange = (newPage) => {
        router.get(
            window.location.pathname,
            { page: newPage },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-16 md:pb-24">
            <Head title="Trip Bareng - Barengin" />

            {/* Hero */}
            <header
                className="relative pt-28 pb-32 md:pt-40 md:pb-44 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('/assets/trip-bareng/hero-bg.png')",
                }}
            >
                <Container className="relative z-10 text-center text-white px-4">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
                        Eksplor Tempat di Sekitar Anda
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg mb-0 max-w-2xl mx-auto font-normal text-neutral-200 leading-relaxed">
                        Ambil jeda dari stres kehidupan sehari-hari, rencanakan
                        perjalanan, dan jelajahi destinasi favoritmu bersama-sama.
                    </p>
                </Container>
            </header>

            {/* Search Form */}
            <section className="relative z-10 -mt-16 md:-mt-20 px-4 sm:px-0">
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
                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900">
                            Cari Trip Terbaikmu
                        </h2>
                        <p className="text-sm text-neutral-500 mt-1">
                            {sortedTrips.length} trip tersedia
                        </p>
                    </div>

                    {/* Satu dropdown Urutkan */}
                    <Select
                        label=""
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-48"
                        selectClassName="h-10 bg-white"
                    >
                        <option value="">Urutkan</option>
                        <option value="rating">⭐ Rating Tertinggi</option>
                        <option value="price_asc">💰 Harga Termurah</option>
                        <option value="price_desc">💎 Harga Termahal</option>
                        <option value="newest">🆕 Terbaru</option>
                    </Select>
                </div>

                {sortedTrips.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {sortedTrips.map((trip) => (
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
                            Belum ada trip yang tersedia saat ini.
                        </p>
                    </div>
                )}

            </Container>
        </div>
    );
}

Index.layout = (page) => <MainLayout>{page}</MainLayout>;