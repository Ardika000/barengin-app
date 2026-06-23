import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { FaTimes, FaStar } from "react-icons/fa";
import Button from "@/Components/Button";

/**
 * Modal ulasan yang dipakai ulang berdasarkan tipe:
 * - trip         : menilai trip + pemandu (dua rating)
 * - pergi_bareng : menilai pembuat perjalanan (satu rating)
 */
export default function ReviewModal({ target, onClose }) {
    const isTrip = target.type === "trip";

    const { data, setData, post, processing, errors } = useForm({
        type: target.type,
        id: target.id,
        trip_rating: null, // hanya diisi untuk tipe trip
        user_rating: 0,
        comment: "",
    });

    const [localError, setLocalError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isTrip && data.trip_rating < 1) {
            setLocalError("Mohon beri rating untuk trip.");
            return;
        }
        if (data.user_rating < 1) {
            setLocalError(
                isTrip
                    ? "Mohon beri rating untuk pemandu."
                    : "Mohon beri rating untuk pembuat perjalanan.",
            );
            return;
        }

        setLocalError(null);
        post("/reviews", {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 pt-6">
                    <div>
                        <h2 className="text-lg font-bold text-neutral-900">
                            Beri Ulasan Perjalanan
                        </h2>
                        <p className="mt-0.5 text-sm text-neutral-500">
                            {target.title}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="Tutup"
                    >
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-5 px-6 py-5">
                    {/* Target user singkat */}
                    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <img
                            src={target.user.avatar}
                            alt={target.user.name}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                                e.target.src = "/assets/default-profile.png";
                            }}
                        />
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-neutral-900">
                                {target.user.name}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {isTrip ? "Pemandu Trip" : "Pembuat Perjalanan"}
                            </p>
                        </div>
                    </div>

                    {/* Rating trip (khusus trip) */}
                    {isTrip && (
                        <RatingRow
                            label="Rating Trip"
                            value={data.trip_rating}
                            onChange={(v) => setData("trip_rating", v)}
                        />
                    )}

                    {/* Rating user (pemandu / pembuat) */}
                    <RatingRow
                        label={
                            isTrip ? "Rating Pemandu" : "Rating Pembuat Perjalanan"
                        }
                        value={data.user_rating}
                        onChange={(v) => setData("user_rating", v)}
                    />

                    {/* Komentar */}
                    <div>
                        <label className="mb-2 block font-semibold text-neutral-900">
                            Beri Ulasan
                        </label>
                        <textarea
                            rows={4}
                            value={data.comment}
                            onChange={(e) => setData("comment", e.target.value)}
                            placeholder="ulasan terkait perjalanan"
                            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-800 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                        {errors.comment && (
                            <p className="mt-1 text-xs text-danger-600">
                                {errors.comment}
                            </p>
                        )}
                    </div>

                    {(localError || errors.user_rating || errors.trip_rating) && (
                        <p className="text-sm font-medium text-danger-600">
                            {localError ||
                                errors.user_rating ||
                                errors.trip_rating}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4">
                    <Button
                        type="primary"
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                    >
                        Batal
                    </Button>
                    <Button
                        type="primary"
                        variant="solid"
                        size="sm"
                        disabled={processing}
                    >
                        {processing ? "Mengirim..." : "Kirim Ulasan"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function RatingRow({ label, value, onChange }) {
    const [hover, setHover] = useState(0);

    return (
        <div>
            <p className="mb-2 font-semibold text-neutral-900">{label}</p>
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hover || value) >= star;
                    return (
                        <button
                            key={star}
                            type="button"
                            onClick={() => onChange(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            className="transition-transform hover:scale-110"
                            aria-label={`${star} bintang`}
                        >
                            <FaStar
                                className={`h-7 w-7 ${
                                    active
                                        ? "text-warning-500"
                                        : "text-neutral-300"
                                }`}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
