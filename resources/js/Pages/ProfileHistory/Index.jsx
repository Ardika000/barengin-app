import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { toast } from "@/lib/toast";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Pagination from "@/Components/Pagination";
import TripCard from "@/Components/TripCard";
import PergiBarengCard from "@/Components/PergiBarengCard";

import ProfileSidebar from "./Partials/ProfileSidebar";
import ProfileEditForm from "./Partials/ProfileEditForm";
import SettingsPanel from "./Partials/SettingsPanel";
import TransactionCard from "./Partials/TransactionCard";
import JalanBarengCard from "./Partials/JalanBarengCard";
import JastipRequestCard from "./Partials/JastipRequestCard";
import ReviewModal from "./Partials/ReviewModal";
import JastipCard from "@/Pages/Home/Cards/JastipCard";
import { useTranslation } from "@/lib/useTranslation";

import {
    FaReceipt,
    FaRoute,
    FaShoppingBag,
    FaMapMarkedAlt,
    FaCarSide,
    FaCog,
} from "react-icons/fa";

const TABS = [
    { key: "transactions", labelKey: "ph.tab_transactions", pageParam: "tx_page", icon: FaReceipt },
    { key: "requests", labelKey: "ph.tab_requests", pageParam: "req_page", icon: FaShoppingBag },
    { key: "history", labelKey: "ph.tab_history", pageParam: "jb_page", icon: FaRoute },
    { key: "jastip_history", labelKey: "ph.tab_jastip_history", pageParam: "jh_page", icon: FaShoppingBag },
    { key: "trips", labelKey: "ph.tab_trips", pageParam: "trip_page", icon: FaMapMarkedAlt },
    { key: "pergi", labelKey: "ph.tab_pergi_fav", pageParam: "pb_page", icon: FaCarSide },
    { key: "jastip", labelKey: "ph.tab_jastip_fav", pageParam: "jastip_page", icon: FaShoppingBag },
    // Rumah bagi pemilih bahasa (dipindah dari navbar) & preferensi notifikasi.
    { key: "settings", labelKey: "settings.title", icon: FaCog },
];

export default function ProfileHistory({
    profile,
    wallet,
    transactions,
    jalan_bareng,
    jastip_history,
    trip_favorites,
    pergi_barengs,
    jastip_favorites,
    jastip_requests,
    notification_prefs = {},
    tab = "transactions",
    midtrans_client_key,
}) {
    const { t, locale } = useTranslation();
    const [activeTab, setActiveTab] = useState(tab);
    const [editing, setEditing] = useState(false);
    const [snapReady, setSnapReady] = useState(false);
    const [reviewTarget, setReviewTarget] = useState(null);

    // Nilai awal useState hanya dipakai saat mount. Tanpa sinkronisasi ini,
    // membuka ?tab=... dari halaman Profile History itu sendiri (mis. menu
    // "Pengaturan" di navbar) tidak berpindah tab: Inertia memakai ulang
    // komponen yang sama sehingga tidak ada remount.
    useEffect(() => {
        setActiveTab(tab);
    }, [tab]);

    const tabNavRef = useRef(null);
    const tabRefs = useRef({});
    const [indicator, setIndicator] = useState({ left: 0, width: 0, measured: false });
    // Penempatan PERTAMA harus instan: kalau transisi sudah aktif sejak mount,
    // garisnya terlihat "terbang" dari kiri (left 0 -> posisi tab aktif) setiap
    // kali halaman dibuka. Animasi baru dinyalakan untuk perpindahan berikutnya.
    const [canAnimate, setCanAnimate] = useState(false);
    const firstMeasureRef = useRef(true);

    // Letakkan garis di bawah tab aktif & bawa tab itu ke dalam pandangan.
    //
    // Auto-scroll-nya bukan hiasan: bar ini bergulir horizontal dan "Pengaturan"
    // ada di ujung kanan. Saat tab diaktifkan dari luar (menu profil ->
    // ?tab=settings), tanpa ini bar tetap tertinggal di kiri sehingga tab
    // aktifnya sama sekali tidak kelihatan.
    const syncToActive = useCallback(
        (behavior) => {
            const nav = tabNavRef.current;
            const el = tabRefs.current[activeTab];
            if (!nav || !el) return;

            // offsetLeft relatif terhadap nav (offsetParent-nya, karena `relative`),
            // jadi nilainya mengikuti isi yang tergulir — bukan posisi layar.
            const left = el.offsetLeft;
            const width = el.offsetWidth;

            // WAJIB mengembalikan objek LAMA bila nilainya sama. Kalau selalu
            // membuat objek baru, tiap tembakan ResizeObserver memicu render ulang
            // yang memicu observer lagi — React langsung berteriak "Maximum update
            // depth exceeded". Referensi yang sama membuat React membatalkan render.
            setIndicator((prev) =>
                prev.measured && prev.left === left && prev.width === width
                    ? prev
                    : { left, width, measured: true },
            );

            // Pusatkan bila memungkinkan; clamp agar tidak melewati kedua ujung.
            const target = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
            const max = Math.max(0, nav.scrollWidth - nav.clientWidth);
            const next = Math.min(Math.max(0, target), max);

            // Jangan menyuruh scroll ke tempat yang sudah ditempati — mencegah
            // gangguan pada scroll manual pengguna & animasi yang terpotong.
            if (Math.abs(nav.scrollLeft - next) > 1) {
                nav.scrollTo({ left: next, behavior });
            }
        },
        [activeTab],
    );

    useEffect(() => {
        syncToActive("smooth");

        if (firstMeasureRef.current) {
            firstMeasureRef.current = false;
            // Tunggu satu frame agar posisi awal sempat ter-commit tanpa transisi.
            requestAnimationFrame(() => setCanAnimate(true));
        }
        // Bergantung pada `locale`, BUKAN `t`: mengganti bahasa mengubah lebar
        // label sehingga garis memang harus diukur ulang — tapi useTranslation
        // membuat `t` baru setiap render, jadi memakainya sebagai dependency
        // membuat effect ini jalan tiap render (loop). `locale` cuma string.
    }, [syncToActive, locale]);

    // Lebar nav bisa berubah SETELAH effect di atas selesai: konten tab yang baru
    // mengubah tinggi halaman, scrollbar vertikal muncul/hilang, lalu kolom ini
    // menyempit/melebar. Kalau tidak diukur ulang, target scroll tadi memakai
    // ukuran basi dan tab aktif tetap di luar pandangan (ini persis bug-nya:
    // clientWidth 715 saat effect, 674 setelah layout tenang). ResizeObserver
    // juga sekaligus menangani resize jendela.
    useEffect(() => {
        const nav = tabNavRef.current;
        if (!nav || typeof ResizeObserver === "undefined") return;

        // "auto": koreksi ini menyusul perubahan layout, bukan aksi pengguna —
        // menganimasikannya hanya terlihat seperti bar yang bergeser sendiri.
        const observer = new ResizeObserver(() => syncToActive("auto"));
        observer.observe(nav);

        return () => observer.disconnect();
    }, [syncToActive]);

    // Garis ini diukur dari lebar TEKS tab. Pada muat dingin (font belum
    // ter-cache) pengukuran pertama memakai font cadangan yang lebih sempit,
    // lalu font aslinya datang dan seluruh label melebar — garisnya jadi
    // melenceng. ResizeObserver di atas tidak menangkapnya karena lebar nav
    // sendiri tidak berubah, hanya isinya. Jadi ukur ulang saat font siap.
    useEffect(() => {
        if (!document.fonts?.ready) return;

        let cancelled = false;
        document.fonts.ready.then(() => {
            if (!cancelled) syncToActive("auto");
        });

        return () => {
            cancelled = true;
        };
    }, [syncToActive]);

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

    // Bayar request titipan yang sudah ditawar — muat ulang tab Titipan Saya
    const handlePayRequest = (snapToken) => {
        if (!snapToken) return;
        if (!snapReady || !window.snap) {
            toast.warning(t("ph.pay_not_ready"));
            return;
        }

        const reload = () => router.reload({ only: ["jastip_requests"] });
        window.snap.pay(snapToken, {
            onSuccess: reload,
            onPending: reload,
            onError: reload,
            onClose: reload,
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
                            wallet={wallet}
                            onEdit={() => setEditing(true)}
                        />
                    )}
                </aside>

                {/* ===== Right: Tabbed content ===== */}
                {/* min-w-0 wajib: tanpa ini track grid 1fr melebar mengikuti isi tab,
                    sehingga overflow-x-auto pada nav tidak aktif dan halaman meluber. */}
                <section className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
                    {/* Tab nav — scroll horizontal tanpa wrap, scrollbar disembunyikan.
                        `relative` wajib: ia menjadi containing block bagi indikator
                        garis di bawah, sekaligus membuat indikator ikut tergulir
                        bersama tombol-tombolnya. */}
                    <div
                        ref={tabNavRef}
                        className="relative mb-6 flex flex-nowrap gap-x-4 overflow-x-auto border-b border-neutral-200 sm:gap-x-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {TABS.map((item) => {
                            const isActive = activeTab === item.key;
                            return (
                                <button
                                    key={item.key}
                                    ref={(el) => {
                                        tabRefs.current[item.key] = el;
                                    }}
                                    type="button"
                                    onClick={() => setActiveTab(item.key)}
                                    className={`-mb-px whitespace-nowrap border-b-2 border-transparent px-1 py-3 text-sm font-semibold transition-colors ${
                                        isActive
                                            ? "text-primary-700"
                                            : "text-neutral-500 hover:text-neutral-800"
                                    }`}
                                >
                                    {t(item.labelKey)}
                                </button>
                            );
                        })}

                        {/* Garis aktif: satu elemen yang meluncur, bukan border milik
                            tiap tombol — supaya perpindahannya bisa dianimasikan.
                            Tombol tetap memakai border-b-2 transparan agar tingginya
                            tidak berubah. Disembunyikan sampai pengukuran pertama
                            selesai supaya tidak terlihat "terbang" dari kiri. */}
                        <span
                            aria-hidden="true"
                            className={[
                                "pointer-events-none absolute -bottom-px h-0.5 rounded-full bg-primary-700",
                                canAnimate
                                    ? "transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
                                    : "",
                                indicator.measured ? "" : "opacity-0",
                            ].join(" ")}
                            style={{ left: indicator.left, width: indicator.width }}
                        />
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

                    {/* Titipan Saya — request titipan & pembayarannya */}
                    {activeTab === "requests" && (
                        <TabSection
                            paginator={jastip_requests}
                            pageParam="req_page"
                            onPageChange={goToPage}
                            empty={{
                                icon: <FaShoppingBag className="h-12 w-12" />,
                                title: t("ph.empty_requests_title"),
                                desc: t("ph.empty_requests_desc"),
                            }}
                        >
                            <div className="space-y-4">
                                {jastip_requests.data.map((req) => (
                                    <JastipRequestCard
                                        key={req.id}
                                        request={req}
                                        onPay={handlePayRequest}
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

                    {activeTab === "settings" && (
                        <SettingsPanel notificationPrefs={notification_prefs} />
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
