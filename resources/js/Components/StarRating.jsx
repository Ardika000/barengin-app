import { FaStar } from "react-icons/fa";
import { useTranslation } from "@/lib/useTranslation";

export default function StarRating({
    rating,
    reviews = null,
    withReviewsLabel = false,
    className = "",
    children = null,
    ...props
}) {
    const { t } = useTranslation();

    const numeric = Number(rating);
    const label = Number.isFinite(numeric) ? numeric.toFixed(1) : rating;

    return (
        <div className={`flex items-center gap-1 ${className}`} {...props}>
            {/* -translate-y: angka rating tanpa descender bikin bintang terlihat kerendahan */}
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
