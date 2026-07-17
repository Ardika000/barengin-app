import React from "react";
import { Link } from "@inertiajs/react";
import StarRating from "@/Components/StarRating";

export default function TripCard({ trip }) {
    return (
        <Link
            href={trip.id ? `/trip-bareng/${trip.id}` : "/trip-bareng"}
            className="relative block h-74 md:h-96 rounded-2xl overflow-hidden group cursor-pointer"
        >
            <img
                src={trip.image}
                alt={trip.title}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

            <StarRating
                rating={trip.rating}
                className="absolute top-4 right-4 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-neutral-500 backdrop-blur-sm"
            >
                rating
            </StarRating>

            <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-lg font-semibold">{trip.title}</h3>
                <p className="text-sm text-white/80">{trip.duration}</p>
            </div>
        </Link>
    );
}
