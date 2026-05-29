import React, { useState, useMemo } from "react";
import { Head } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import {
    FaMagnifyingGlass,
    FaStar,
    FaSuitcase,
    FaBagShopping,
} from "react-icons/fa6";
import { FaCrown } from "react-icons/fa";

// Helper: Ambil inisial nama
const getInitials = (name) => {
    if (!name) return "U";
    const words = name.split(" ");
    if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Helper: Warna background acak dari ID
const getRandomBg = (id) => {
    const colors = [
        "bg-blue-100 text-blue-600",
        "bg-green-100 text-green-600",
        "bg-red-100 text-red-600",
        "bg-purple-100 text-purple-600",
        "bg-orange-100 text-orange-600",
    ];
    return colors[(id || 0) % colors.length];
};

export default function Leaderboard({ dbGuiders = [] }) {
    // State untuk melacak tab yang sedang aktif ("trip" atau "jastip")
    const [activeTab, setActiveTab] = useState("trip");

    // ==========================================
    // DATA DARI DATABASE: OPEN TRIP
    // ==========================================
    const tripData = useMemo(() => {
        if (!dbGuiders || dbGuiders.length === 0)
            return { topThree: [], otherRanks: [] };

        // Format raw data dari database
        const formatted = dbGuiders.map((guider, index) => {
            // Rating acak (pseudo-random) karena di seeder user belum ada kolom rating
            const pseudoRating = (4.5 + (guider.id % 6) * 0.1).toFixed(1);

            return {
                id: guider.id,
                rank: index + 1, // Ranking urut
                name: guider.name,
                count: guider.total_trip,
                rating: pseudoRating,
                avatar: guider.profile_image ?? "/assets/default-profile.png",
                initials: getInitials(guider.name),
                bg: getRandomBg(guider.id),
            };
        });

        // Pisahkan Top 3 untuk Podium
        const top3Raw = formatted.slice(0, 3);

        // Susun ulang urutan podium biar yang juara 1 di tengah (2 - 1 - 3)

        const topThree = [];
        if (top3Raw[1]) topThree.push(top3Raw[1]); // Rank 2
        if (top3Raw[0]) topThree.push(top3Raw[0]); // Rank 1
        if (top3Raw[2]) topThree.push(top3Raw[2]); // Rank 3

        // Sisanya untuk Tabel (Mulai dari rank 4 dst)
        const otherRanks = formatted.slice(3).map((item) => ({
            ...item,
            rank: `# ${String(item.rank).padStart(2, "0")}`, // Format jadi "# 04"
        }));

        return { topThree, otherRanks };
    }, [dbGuiders]);

    // ==========================================
    // DUMMY DATA: JASTIP
    // ==========================================
    const jastipTopThree = [
        {
            id: 4,
            rank: 2,
            name: "Budi S",
            rating: 4.8,
            count: 210,
            avatar: "/assets/default-profile.png",
        },
        {
            id: 5,
            rank: 1,
            name: "Siska K",
            rating: 5.0,
            count: 305,
            avatar: "/assets/default-profile.png",
        },
        {
            id: 6,
            rank: 3,
            name: "Tono M",
            rating: 4.7,
            count: 180,
            avatar: "/assets/default-profile.png",
        },
    ];

    const jastipOtherRanks = [
        {
            rank: "# 04",
            initials: "AW",
            name: "Ayu Wandira",
            count: 165,
            rating: 4.7,
            bg: "bg-pink-100 text-pink-600",
        },
        {
            rank: "# 05",
            initials: "DR",
            name: "Doni R",
            count: 140,
            rating: 4.6,
            bg: "bg-green-100 text-green-600",
        },
        {
            rank: "# 06",
            initials: "FJ",
            name: "Fajar J",
            count: 120,
            rating: 4.6,
            bg: "bg-yellow-100 text-yellow-600",
        },
        {
            rank: "# 07",
            initials: "RN",
            name: "Rina N",
            count: 95,
            rating: 4.5,
            bg: "bg-blue-100 text-blue-600",
        },
        {
            rank: "# 08",
            initials: "DS",
            name: "Dimas S",
            count: 80,
            rating: 4.5,
            bg: "bg-gray-100 text-gray-600",
        },
    ];

    // Variabel penentu data mana yang akan dirender berdasarkan tab aktif
    const currentTopThree =
        activeTab === "trip" ? tripData.topThree : jastipTopThree;
    const currentOtherRanks =
        activeTab === "trip" ? tripData.otherRanks : jastipOtherRanks;

    const columnTwoTitle = activeTab === "trip" ? "GUIDER" : "JASTIPER";
    const columnThreeTitle =
        activeTab === "trip" ? "TOTAL TRIP" : "TOTAL JASTIP";
    const itemLabel = activeTab === "trip" ? "Trip" : "Jastip";
    const IconItem = activeTab === "trip" ? FaSuitcase : FaBagShopping;

    return (
        <Container className="py-12">
            {" "}
            {/* Latar belakang abu-abu sangat muda khas UI modern */}
            <Head title="Leaderboard" />
            <Container className="py-4">
                {/* 1. Header Section */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">
                        Leaderboard
                    </h1>
                    <p className="text-neutral-600 text-sm md:text-base max-w-2xl mx-auto">
                        Lihat siapa yang memimpin dalam hal perjalanan dan
                        membawa pulang barang-barang terbaik.
                    </p>
                </div>

                {/* 2. Filter & Search Section */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-20">
                    {/* Search Bar */}
                    <div className="relative w-full max-w-md">
                        <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Cari topik favoritmu..."
                            className="w-full pl-11 pr-4 py-3 rounded-full border border-neutral-200 focus:ring-2 focus:ring-[#0077D3] focus:border-[#0077D3] outline-none shadow-sm transition"
                        />
                    </div>

                    {/* Tab Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setActiveTab("trip")}
                            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 border ${
                                activeTab === "trip"
                                    ? "bg-[#0077D3] text-white border-[#0077D3] shadow-md"
                                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                            }`}
                        >
                            Open Trip
                        </button>
                        <button
                            onClick={() => setActiveTab("jastip")}
                            className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 border ${
                                activeTab === "jastip"
                                    ? "bg-[#0077D3] text-white border-[#0077D3] shadow-md"
                                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                            }`}
                        >
                            Jastip
                        </button>
                    </div>
                </div>
            </Container>
            {/* 3. Top 3 Podium Section */}
            <Container className="pt-18 pb-0">
                <div className="flex justify-center items-end gap-4 md:gap-20 mb-16">
                    {currentTopThree.map((user) => (
                        <div
                            key={user.id}
                            className={`relative bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 w-48 md:w-64${user.rank === 1 ? "order-2 -translate-y-6 md:-translate-y-10 z-10" : user.rank === 2 ? "order-1" : "order-3"}`}
                        >
                            {/* Avatar & Crown */}
                            <div className="relative -mt-16 mb-4">
                                {user.rank === 1 && (
                                    <FaCrown className="absolute -top-10 left-1/2 -translate-x-1/2 text-yellow-400 text-5xl z-20 drop-shadow-md" />
                                )}
                                <div
                                    className={`rounded-full overflow-hidden border-4 border-white shadow-md bg-neutral-100 ${user.rank === 1 ? "w-24 h-24 md:w-32 md:h-32" : "w-20 h-20 md:w-24 md:h-24"}`}
                                >
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src =
                                                "/assets/default-profile.png";
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Rank Info */}
                            <h2 className="text-[#0077D3] font-black text-2xl md:text-3xl mb-1">
                                #{user.rank}
                            </h2>
                            {/* Ukuran teks diturunkan jadi text-sm (HP) dan md:text-base (Laptop) */}
                            <h3 className="font-bold text-neutral-900 text-sm md:text-base text-center mb-3 px-2 line-clamp-1">
                                {user.name}
                            </h3>

                            <div className="flex items-center justify-center gap-2 text-xs md:text-sm font-semibold text-neutral-700 mb-5 w-full">
                                <span className="flex items-center gap-1">
                                    <FaStar className="text-orange-400 text-lg mb-0.5" />{" "}
                                    {user.rating}
                                </span>
                                <span className="flex items-center gap-1.5 whitespace-nowrap">
                                    <IconItem className="text-[#0077D3]" />{" "}
                                    {user.count} {itemLabel}
                                </span>
                            </div>

                            <Button type="primary" size="sm" className="w-full">
                                Ikuti
                            </Button>
                        </div>
                    ))}
                </div>
            </Container>
            {/* 4. Rank List Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#F4F7FB] border-b border-neutral-100 text-neutral-500 text-xs font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">RANK</th>
                                <th className="py-4 px-6">{columnTwoTitle}</th>
                                <th className="py-4 px-6">
                                    {columnThreeTitle}
                                </th>
                                <th className="py-4 px-6">RATING</th>
                                <th className="py-4 px-6 text-center">
                                    ACTION
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {currentOtherRanks.map((item, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-neutral-50/50 transition duration-150"
                                >
                                    <td className="py-4 px-6 text-neutral-500 font-medium text-sm">
                                        {item.rank}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            {/* Inisial Profil (Avatar teks) */}
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.bg}`}
                                            >
                                                {item.initials}
                                            </div>
                                            <span className="font-semibold text-neutral-900 text-sm">
                                                {item.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-neutral-600 text-sm">
                                        {item.count} {itemLabel.toLowerCase()}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="flex items-center gap-1 text-neutral-800 font-medium text-sm">
                                            <FaStar className="text-orange-400 text-base mb-0.5" />{" "}
                                            {item.rating}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <Button
                                            type="primary"
                                            variant={
                                                item.rank === "# 05"
                                                    ? "outline"
                                                    : "solid"
                                            }
                                            size="sm"
                                            className="w-28 text-xs py-2"
                                        >
                                            {item.rank === "# 05"
                                                ? "Mengikuti"
                                                : "Ikuti"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* 5. Floating Current User Position */}
            <div className="sticky max-w-max bottom-10 ml-auto right-4 md:right-10 z-[100]">
                <div className="flex items-center gap-3 bg-white shadow-xl border border-neutral-100 rounded-full py-2 px-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 text-[#0077D3] rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                            10
                        </div>
                        <span className="text-neutral-900 font-bold text-sm">
                            Posisi Saat Ini 🚀
                        </span>
                    </div>
                </div>
            </div>
        </Container>
    );
}

Leaderboard.layout = (page) => <MainLayout>{page}</MainLayout>;
