import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useTranslation } from "@/lib/useTranslation";

export default function Pagination({
    currentPage = 1,
    totalPages = 10,
    onPageChange = () => {},
    className = "",
}) {
    const { t } = useTranslation();
    // Logika perhitungan halaman yang dinamis dan optimal
    const getPageNumbers = () => {
        // Jika total halaman sedikit (<= 7), tampilkan semua angkanya
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        // Jika user berada di halaman-halaman awal
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, "...", totalPages];
        }

        // Jika user berada di halaman-halaman akhir
        if (currentPage >= totalPages - 3) {
            return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        // Jika user berada di tengah-tengah
        return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
    };

    const pages = getPageNumbers();

    return (
        <div className={`flex items-center justify-center gap-2 md:gap-3 ${className}`}>
            
            {/* --- Tombol Prev --- */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    currentPage === 1
                        ? "text-neutral-300 cursor-not-allowed"
                        : "text-neutral-600 hover:text-primary-700 active:scale-95"
                }`}
                aria-label={t("pagination.previous_aria")}
            >
                <FaChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t("pagination.previous")}</span>
            </button>

            {/* --- Angka Halaman --- */}
            <div className="flex items-center gap-1 sm:gap-1.5">
                {pages.map((page, index) => {
                    // Render titik-titik (ellipsis)
                    if (page === "...") {
                        return (
                            <span
                                key={`ellipsis-${index}`}
                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-neutral-400 text-sm font-medium"
                            >
                                ...
                            </span>
                        );
                    }

                    const isActive = page === currentPage;

                    // Render tombol angka
                    return (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? "bg-primary-50 border border-primary-500 text-primary-700 shadow-sm"
                                    : "bg-transparent border border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-primary-700 active:scale-95"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {page}
                        </button>
                    );
                })}
            </div>

            {/* --- Tombol Next --- */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    currentPage === totalPages
                        ? "text-neutral-300 cursor-not-allowed"
                        : "text-neutral-600 hover:text-primary-700 active:scale-95"
                }`}
                aria-label={t("pagination.next_aria")}
            >
                <span className="hidden sm:inline">{t("pagination.next")}</span>
                <FaChevronRight className="w-3.5 h-3.5" />
            </button>

        </div>
    );
}