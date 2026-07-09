import { FaMapMarkerAlt, FaRegCalendarAlt, FaRoute, FaCarSide, FaCheck, FaStar, FaShoppingBag } from "react-icons/fa";
import Button from "@/Components/Button";
import { useTranslation } from "@/lib/useTranslation";

/**
 * Kartu horizontal riwayat (Trip Bareng / Pergi Bareng / Jastip)
 * dengan tombol "Beri Ulasan".
 */
export default function JalanBarengCard({ item, onReview }) {
    const { t } = useTranslation();
    const {
        type,
        type_label,
        title,
        subtitle,
        image,
        date_label,
        user,
        reviewed,
        review_target,
    } = item;

    const isTrip = type === "trip";
    const isJastip = type === "jastip";
    const TypeIcon = isTrip ? FaRoute : isJastip ? FaShoppingBag : FaCarSide;
    const badgeColor = isTrip ? "bg-primary-700" : isJastip ? "bg-warning-600" : "bg-success-600";

    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center">
            {/* Gambar */}
            <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-32">
                <img
                    src={image}
                    alt={title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.target.src = "/assets/default-image.png";
                    }}
                />
                <span
                    className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${badgeColor}`}
                >
                    <TypeIcon className="h-2.5 w-2.5" />
                    {type_label}
                </span>
            </div>

            {/* Konten */}
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-neutral-900">
                    {title}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
                    <FaMapMarkerAlt className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="truncate">{subtitle}</span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
                    <FaRegCalendarAlt className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">{date_label}</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-6 w-6 rounded-full object-cover border border-neutral-200"
                        onError={(e) => {
                            e.target.src = "/assets/default-profile.png";
                        }}
                    />
                    <span className="truncate text-xs font-medium text-neutral-600">
                        {user.name}
                    </span>
                </div>
            </div>

            {/* Aksi */}
            <div className="shrink-0 sm:self-center">
                {reviewed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-4 py-2 text-sm font-semibold text-success-700">
                        <FaCheck className="h-3.5 w-3.5" />
                        {t("ph.reviewed")}
                    </span>
                ) : (
                    <Button
                        type="primary"
                        variant="solid"
                        size="sm"
                        rounded={false}
                        className="w-full gap-2 rounded-lg sm:w-auto"
                        onClick={() => onReview(review_target)}
                    >
                        <FaStar className="h-3.5 w-3.5" />
                        {t("ph.give_review")}
                    </Button>
                )}
            </div>
        </div>
    );
}
