import { FaHeart, FaLocationDot } from "react-icons/fa6";

export default function JastipFavoriteCard({ product }) {
    const { name, category, price, from, to, image } = product;

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="relative h-44 bg-neutral-100">
                <img
                    src={image}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.target.src = "/assets/default-image.png";
                    }}
                />
                {category && (
                    <span className="absolute left-3 top-3 rounded-md bg-primary-700 px-2 py-1 text-[10px] font-medium text-white">
                        {category}
                    </span>
                )}
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow">
                    <FaHeart className="h-4 w-4 text-red-500" />
                </span>
            </div>

            <div className="p-4">
                <h4 className="line-clamp-1 text-base font-semibold text-neutral-900">
                    {name}
                </h4>
                <p className="mt-1 text-lg font-bold text-neutral-900">
                    Rp {Number(price || 0).toLocaleString("id-ID")}
                </p>

                <div className="mt-3 flex items-center gap-1.5 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
                    <FaLocationDot className="shrink-0 text-primary-700" />
                    <span className="truncate">
                        Dari {from} ke{" "}
                        <span className="font-semibold">{to}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
