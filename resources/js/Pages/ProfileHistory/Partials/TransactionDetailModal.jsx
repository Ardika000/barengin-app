import { Link } from "@inertiajs/react";
import { FaTimes, FaChevronRight } from "react-icons/fa";
import Button from "@/Components/Button";

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function TransactionDetailModal({ transaction, onClose, onReview }) {
    const d = transaction.detail;
    if (!d) return null;

    const canReview =
        transaction.status === "completed" &&
        transaction.review_target &&
        onReview;

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
                    <h2 className="text-xl font-bold text-neutral-900">
                        Detail Transaksi
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="Tutup"
                    >
                        <FaTimes className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {/* Status + actions */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="mb-3 text-lg font-bold text-neutral-900">
                                {d.status_heading}
                            </h3>
                            <div className="space-y-1.5 text-sm">
                                <DetailRow
                                    label="No. Pesanan"
                                    value={d.order_no}
                                />
                                <DetailRow
                                    label="Tanggal Pembelian"
                                    value={d.date_label}
                                />
                            </div>
                        </div>

                        {transaction.status === "completed" && (
                            <div className="flex shrink-0 flex-col gap-2">
                                {transaction.detail_url && (
                                    <Button
                                        isButtonLink
                                        href={transaction.detail_url}
                                        type="primary"
                                        size="sm"
                                        rounded={false}
                                        className="rounded-lg"
                                    >
                                        Beli Lagi
                                    </Button>
                                )}
                                {canReview && (
                                    <Button
                                        type="neutral"
                                        variant="outline"
                                        size="sm"
                                        rounded={false}
                                        className="rounded-lg"
                                        onClick={() =>
                                            onReview(transaction.review_target)
                                        }
                                    >
                                        Beri Ulasan
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Detail Pesanan */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="font-bold text-neutral-900">
                                Detail Pesanan
                            </h4>
                            {d.seller && (
                                <div className="flex items-center gap-2 text-sm text-neutral-700">
                                    <img
                                        src={d.seller.avatar}
                                        alt={d.seller.name}
                                        className="h-6 w-6 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src =
                                                "/assets/default-profile.png";
                                        }}
                                    />
                                    <span className="font-medium">
                                        {d.seller.name}
                                    </span>
                                    <FaChevronRight className="h-3 w-3 text-neutral-400" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {d.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3"
                                >
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                        onError={(e) => {
                                            e.target.src =
                                                "/assets/default-image.png";
                                        }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-neutral-900">
                                            {item.name}
                                        </p>
                                        <p className="text-sm text-neutral-500">
                                            {item.slot} Slot
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Pengiriman (jastip) */}
                    {d.shipping && (
                        <div>
                            <h4 className="mb-3 font-bold text-neutral-900">
                                Info Pengiriman
                            </h4>
                            <div className="flex gap-3 text-sm">
                                <span className="w-20 shrink-0 text-neutral-500">
                                    Alamat
                                </span>
                                <span className="text-neutral-800">
                                    {d.shipping.address}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Rincian Pembayaran */}
                    <div>
                        <h4 className="mb-3 font-bold text-neutral-900">
                            Rincian Pembayaran
                        </h4>
                        <div className="mb-3 flex items-center justify-between text-sm">
                            <span className="text-neutral-500">
                                Metode Pembayaran
                            </span>
                            <span className="font-semibold text-neutral-900">
                                {d.payment_method}
                            </span>
                        </div>

                        {d.fees.length > 0 && (
                            <div className="space-y-2 border-t border-neutral-100 pt-3 text-sm">
                                {d.fees.map((fee, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-neutral-500">
                                            {fee.label}
                                        </span>
                                        <span className="text-neutral-800">
                                            {rupiah(fee.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 font-bold text-neutral-900">
                            <span>Total Biaya</span>
                            <span>{rupiah(d.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-8">
            <span className="text-neutral-500">{label}</span>
            <span className="font-medium text-neutral-900">{value}</span>
        </div>
    );
}
