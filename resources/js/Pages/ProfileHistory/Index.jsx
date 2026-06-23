import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import FlashMessage from "@/Components/FlashMessage";
import TripCard from "@/Components/TripCard";
import PergiBarengCard from "@/Components/PergiBarengCard";

import ProfileSidebar from "./Partials/ProfileSidebar";
import ProfileEditForm from "./Partials/ProfileEditForm";
import TransactionCard from "./Partials/TransactionCard";
import JalanBarengCard from "./Partials/JalanBarengCard";
import ReviewModal from "./Partials/ReviewModal";
// import JastipFavoriteCard from "./Partials/JastipFavoriteCard"; // Jastip dinonaktifkan sementara

import {
    FaReceipt,
    FaRoute,
    // FaUtensils, // Jastip dinonaktifkan sementara
    FaMapMarkedAlt,
    FaCarSide,
} from "react-icons/fa";

const TABS = [
    { key: "transactions", label: "Transaksi Anda", pageParam: "tx_page", icon: FaReceipt },
    { key: "history", label: "History Jalan Bareng", pageParam: "jb_page", icon: FaRoute },
    // Jastip dinonaktifkan sementara (fitur jastip kemungkinan dihapus)
    // { key: "jastip", label: "Jastip Kesukaan", pageParam: "jastip_page", icon: FaUtensils },
    { key: "trips", label: "Trip Kesukaan", pageParam: "trip_page", icon: FaMapMarkedAlt },
    { key: "pergi", label: "Pergi Bareng", pageParam: "pb_page", icon: FaCarSide },
];

export default function ProfileHistory({
    profile,
    transactions,
    jalan_bareng,
    trip_favorites,
    pergi_barengs,
    jastip_favorites,
    tab = "transactions",
    midtrans_client_key,
}) {
    const [activeTab, setActiveTab] = useState(tab);
    const [editing, setEditing] = useState(false);
    const [snapReady, setSnapReady] = useState(false);
    const [reviewTarget, setReviewTarget] = useState(null);

    // Muat Midtrans Snap agar tombol "Bayar Sekarang" bisa membuka popup
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
        script.setAttribute("data-client-key", midtrans_client_key || "");
        script.onload = () => setSnapReady(true);
        document.head.appendChild(script);
    }, [midtrans_client_key]);

    const handlePay = (snapToken) => {
        if (!snapToken) return;
        if (!snapReady || !window.snap) {
            alert("Sistem pembayaran belum siap. Coba muat ulang halaman.");
            return;
        }

        window.snap.pay(snapToken, {
            onSuccess: () => router.reload({ only: ["transactions"] }),
            onPending: () => router.reload({ only: ["transactions"] }),
            onError: () => router.reload({ only: ["transactions"] }),
            onClose: () => router.reload({ only: ["transactions"] }),
        });
    };

    const goToPage = (pageParam, page) => {
        const params = new URLSearchParams(window.location.search);
        params.set(pageParam, page);
        params.set("tab", activeTab);
        router.get(
            `${window.location.pathname}?${params.toString()}`,
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <Container className="min-h-screen py-8">
            <FlashMessage className="mb-6" />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
                {/* ===== Left: Profile ===== */}
                <aside className="lg:sticky lg:top-24 lg:self-start">
                    {editing ? (
                        <ProfileEditForm
                            profile={profile}
                            onCancel={() => setEditing(false)}
                        />
                    ) : (
                        <ProfileSidebar
                            profile={profile}
                            onEdit={() => setEditing(true)}
                        />
                    )}
                </aside>

                {/* ===== Right: Tabbed content ===== */}
                <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                    {/* Tab nav */}
                    <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 border-b border-neutral-200 sm:gap-x-6">
                        {TABS.map((t) => {
                            const isActive = activeTab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setActiveTab(t.key)}
                                    className={`-mb-px whitespace-nowrap border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
                                        isActive
                                            ? "border-primary-700 text-primary-700"
                                            : "border-transparent text-neutral-500 hover:text-neutral-800"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab content */}
                    {activeTab === "transactions" && (
                        <TabSection
                            paginator={transactions}
                            pageParam="tx_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaReceipt className="h-12 w-12" />,
                                title: "Belum ada transaksi",
                                desc: "Transaksi trip & jastip Anda akan muncul di sini.",
                            }}
                        >
                            <div className="space-y-4">
                                {transactions.data.map((tx) => (
                                    <TransactionCard
                                        key={tx.id}
                                        transaction={tx}
                                        onPay={handlePay}
                                        onReview={setReviewTarget}
                                    />
                                ))}
                            </div>
                        </TabSection>
                    )}

                    {activeTab === "history" && (
                        <TabSection
                            paginator={jalan_bareng}
                            pageParam="jb_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaRoute className="h-12 w-12" />,
                                title: "Belum ada riwayat jalan bareng",
                                desc: "Trip & pergi bareng yang sudah Anda ikuti akan muncul di sini untuk diulas.",
                            }}
                        >
                            <div className="space-y-4">
                                {jalan_bareng.data.map((item) => (
                                    <JalanBarengCard
                                        key={item.key}
                                        item={item}
                                        onReview={setReviewTarget}
                                    />
                                ))}
                            </div>
                        </TabSection>
                    )}

                    {/* Jastip Kesukaan dinonaktifkan sementara (fitur jastip kemungkinan dihapus)
                    {activeTab === "jastip" && (
                        <TabSection
                            paginator={jastip_favorites}
                            pageParam="jastip_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaUtensils className="h-12 w-12" />,
                                title: "Belum ada jastip kesukaan",
                                desc: "Jelajahi jastip dan temukan barang favorit Anda.",
                            }}
                        >
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {jastip_favorites.data.map((product) => (
                                    <JastipFavoriteCard
                                        key={product.id}
                                        product={product}
                                    />
                                ))}
                            </div>
                        </TabSection>
                    )}
                    */}

                    {activeTab === "trips" && (
                        <TabSection
                            paginator={trip_favorites}
                            pageParam="trip_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaMapMarkedAlt className="h-12 w-12" />,
                                title: "Belum ada trip kesukaan",
                                desc: "Temukan dan ikuti trip seru di sekitar Anda.",
                            }}
                        >
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {trip_favorites.data.map((trip) => (
                                    <TripCard key={trip.id} trip={trip} />
                                ))}
                            </div>
                        </TabSection>
                    )}

                    {activeTab === "pergi" && (
                        <TabSection
                            paginator={pergi_barengs}
                            pageParam="pb_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaCarSide className="h-12 w-12" />,
                                title: "Belum ada pergi bareng",
                                desc: "Gabung atau buat perjalanan bareng komunitas.",
                            }}
                        >
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {pergi_barengs.data.map((ride) => (
                                    <PergiBarengCard key={ride.id} data={ride} />
                                ))}
                            </div>
                        </TabSection>
                    )}
                </section>
            </div>

            {reviewTarget && (
                <ReviewModal
                    target={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                />
            )}
        </Container>
    );
}

function TabSection({ paginator, pageParam, onPageChange, empty, children }) {
    const hasData = paginator?.data?.length > 0;

    if (!hasData) {
        return <EmptyState {...empty} />;
    }

    return (
        <>
            {children}
            {paginator.last_page > 1 && (
                <Pagination
                    currentPage={paginator.current_page}
                    totalPages={paginator.last_page}
                    onPageChange={(page) => onPageChange(pageParam, page)}
                />
            )}
        </>
    );
}

function EmptyState({ icon, title, desc }) {
    return (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
            <div className="mb-4 flex justify-center text-neutral-300">
                {icon}
            </div>
            <h3 className="mb-1 text-lg font-semibold text-neutral-900">
                {title}
            </h3>
            <p className="text-sm text-neutral-500">{desc}</p>
        </div>
    );
}

ProfileHistory.layout = (page) => <MainLayout children={page} />;
