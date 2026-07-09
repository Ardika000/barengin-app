import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import TripCard from "@/Components/TripCard";
import PergiBarengCard from "@/Components/PergiBarengCard";

import ProfileSidebar from "./Partials/ProfileSidebar";
import ProfileEditForm from "./Partials/ProfileEditForm";
import TransactionCard from "./Partials/TransactionCard";
import JalanBarengCard from "./Partials/JalanBarengCard";
import ReviewModal from "./Partials/ReviewModal";
import JastipCard from "@/Pages/Home/Cards/JastipCard";
import { useTranslation } from "@/lib/useTranslation";

import {
    FaReceipt,
    FaRoute,
    FaShoppingBag,
    FaMapMarkedAlt,
    FaCarSide,
} from "react-icons/fa";

const TABS = [
    { key: "transactions", labelKey: "ph.tab_transactions", pageParam: "tx_page", icon: FaReceipt },
    { key: "history", labelKey: "ph.tab_history", pageParam: "jb_page", icon: FaRoute },
    { key: "jastip_history", labelKey: "ph.tab_jastip_history", pageParam: "jh_page", icon: FaShoppingBag },
    { key: "trips", labelKey: "ph.tab_trips", pageParam: "trip_page", icon: FaMapMarkedAlt },
    { key: "pergi", labelKey: "ph.tab_pergi_fav", pageParam: "pb_page", icon: FaCarSide },
    { key: "jastip", labelKey: "ph.tab_jastip_fav", pageParam: "jastip_page", icon: FaShoppingBag },
];

export default function ProfileHistory({
    profile,
    transactions,
    jalan_bareng,
    jastip_history,
    trip_favorites,
    pergi_barengs,
    jastip_favorites,
    tab = "transactions",
    midtrans_client_key,
}) {
    const { t } = useTranslation();
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
            toast.warning(t("ph.pay_not_ready"));
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
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
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
                {/* min-w-0 wajib: tanpa ini track grid 1fr melebar mengikuti isi tab,
                    sehingga overflow-x-auto pada nav tidak aktif dan halaman meluber. */}
                <section className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                    {/* Tab nav — scroll horizontal tanpa wrap, scrollbar disembunyikan */}
                    <div className="mb-6 flex flex-nowrap gap-x-4 overflow-x-auto border-b border-neutral-200 sm:gap-x-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {TABS.map((item) => {
                            const isActive = activeTab === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setActiveTab(item.key)}
                                    className={`-mb-px whitespace-nowrap border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
                                        isActive
                                            ? "border-primary-700 text-primary-700"
                                            : "border-transparent text-neutral-500 hover:text-neutral-800"
                                    }`}
                                >
                                    {t(item.labelKey)}
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
                                title: t("ph.empty_tx_title"),
                                desc: t("ph.empty_tx_desc"),
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
                                title: t("ph.empty_history_title"),
                                desc: t("ph.empty_history_desc"),
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

                    {/* Riwayat pembelian Jastip — beri ulasan untuk jastiper */}
                    {activeTab === "jastip_history" && (
                        <TabSection
                            paginator={jastip_history}
                            pageParam="jh_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaShoppingBag className="h-12 w-12" />,
                                title: t("ph.empty_jastip_history_title"),
                                desc: t("ph.empty_jastip_history_desc"),
                            }}
                        >
                            <div className="space-y-4">
                                {jastip_history.data.map((item) => (
                                    <JalanBarengCard
                                        key={item.key}
                                        item={item}
                                        onReview={setReviewTarget}
                                    />
                                ))}
                            </div>
                        </TabSection>
                    )}

                    {/* Jastip Kesukaan — item yang di-like (kartu sama dgn etalase) */}
                    {activeTab === "jastip" && (
                        <TabSection
                            paginator={jastip_favorites}
                            pageParam="jastip_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaShoppingBag className="h-12 w-12" />,
                                title: t("ph.empty_jastip_fav_title"),
                                desc: t("ph.empty_jastip_fav_desc"),
                            }}
                        >
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                {jastip_favorites.data.map((product) => (
                                    <JastipCard key={product.id} product={product} />
                                ))}
                            </div>
                        </TabSection>
                    )}

                    {activeTab === "trips" && (
                        <TabSection
                            paginator={trip_favorites}
                            pageParam="trip_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaMapMarkedAlt className="h-12 w-12" />,
                                title: t("ph.empty_trips_title"),
                                desc: t("ph.empty_trips_desc"),
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
                                title: t("ph.empty_pergi_title"),
                                desc: t("ph.empty_pergi_desc"),
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
                    className="mt-8"
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
