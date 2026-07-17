import { FaStar } from "react-icons/fa";
import { useTranslation } from "@/lib/useTranslation";

/**
 * Baris rating: bintang + angka, opsional diikuti jumlah ulasan atau teks bebas.
 *
 * Satu-satunya tempat baris bintang+rating dirakit, supaya warna, ukuran, dan
 * kelurusannya seragam di seluruh aplikasi. Sebelum ini tiap halaman merakit
 * sendiri dan bintangnya sempat punya lima warna berbeda.
 *
 * Catatan kelurusan: angka rating tidak punya descender, sehingga pusat optisnya
 * berada di atas pusat kotak baris yang dipakai `items-center`. Bintang yang
 * di-center pada kotak baris karenanya terlihat kerendahan ~0.9px, dan geseran
 * `-translate-y-[0.06em]` (hasil ukur piksel) meluruskannya.
 *
 * Nilainya kompromi, bukan sempurna: koreksi ideal sedikit berbeda antar konteks
 * `line-height` (`text-[11px]` butuh ~0.08em, `text-xs`/`text-sm` ~0.045em) karena
 * kotak bintang `size-3` berukuran tetap sementara ukuran teks bervariasi. 0.06em
 * menahan sisa selisih di bawah ~0.4px di seluruh pemakaian — jauh di bawah ambang
 * yang terlihat mata.
 *
 * Wadahnya block-level (`flex`) — aman di kontainer biasa maupun sebagai anak
 * flex. `className` dipakai untuk ukuran teks & warna teks ekor.
 *
 * Contoh:
 *   <StarRating rating={4.5} />                                → ★ 4.5
 *   <StarRating rating={4.5} reviews={12} />                   → ★ 4.5 (12)
 *   <StarRating rating={4.5} reviews={12} withReviewsLabel />  → ★ 4.5 (12 ulasan)
 *   <StarRating rating={4.5}>Trip Guider</StarRating>          → ★ 4.5 Trip Guider
 */
export default function StarRating({
    rating,
    reviews = null,
    withReviewsLabel = false,
    className = "",
    children = null,
    ...props
}) {
    const { t } = useTranslation();

    // Nilai rating datang dalam dua bentuk: number (mis. 4.6) dari sebagian
    // controller, dan string sudah terformat (mis. "4.6") dari number_format.
    const numeric = Number(rating);
    const label = Number.isFinite(numeric) ? numeric.toFixed(1) : rating;

    return (
        <div className={`flex items-center gap-1 ${className}`} {...props}>
            <FaStar className="size-3 shrink-0 -translate-y-[0.06em] text-yellow-400" />
            <span className="shrink-0 font-bold text-neutral-700">{label}</span>
            {reviews !== null && reviews !== undefined && (
                <span className="truncate text-neutral-500">
                    ({reviews}
                    {withReviewsLabel ? ` ${t("common.reviews")}` : ""})
                </span>
            )}
            {children}
        </div>
    );
}
