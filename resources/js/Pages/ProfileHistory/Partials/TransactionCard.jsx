import { useState } from "react";
import { FaSuitcaseRolling, FaUtensils, FaDownload } from "react-icons/fa";
import Button from "@/Components/Button";
import TransactionDetailModal from "./TransactionDetailModal";
import { downloadReceipt } from "./receipt";

const STATUS_CONFIG = {
    completed: {
        label: "Selesai",
        badge: "bg-success-100 text-success-700",
    },
    waiting_payment: {
        label: "Menunggu Pembayaran",
        badge: "bg-danger-100 text-danger-700",
    },
    in_progress: {
        label: "Dalam Proses",
        badge: "bg-warning-100 text-warning-700",
    },
};

export default function TransactionCard({ transaction, onPay, onReview }) {
    const {
        kind,
        type_label,
        date_label,
        item_name,
        image,
        slot,
        total,
        status,
        detail_url,
        snap_token,
    } = transaction;

    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.completed;
    const Icon = kind === "jastip" ? FaUtensils : FaSuitcaseRolling;

    const [showDetail, setShowDetail] = useState(false);

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                        <Icon className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="font-semibold text-neutral-900">
                            {type_label}
                        </p>
                        <p className="text-xs text-neutral-500">{date_label}</p>
                    </div>
                </div>

                <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.badge}`}
                >
                    {statusConfig.label}
                </span>
            </div>

            <hr className="my-4 border-neutral-100" />

            {/* Body */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <img
                            src={image}
                            alt={item_name}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            onError={(e) => {
                                e.target.src = "/assets/default-image.png";
                            }}
                        />
                        <div>
                            <p className="font-semibold text-neutral-900">
                                {item_name}
                            </p>
                            <p className="text-sm text-neutral-500">
                                {slot} Slot
                            </p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <p className="text-xs text-neutral-500">
                            Total Pembayaran
                        </p>
                        <p className="text-lg font-bold text-neutral-900">
                            Rp {Number(total || 0).toLocaleString("id-ID")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <TransactionActions
                        status={status}
                        snapToken={snap_token}
                        onPay={onPay}
                        onViewDetail={() => setShowDetail(true)}
                        onDownload={() => downloadReceipt(transaction)}
                    />
                </div>
            </div>

            {showDetail && (
                <TransactionDetailModal
                    transaction={transaction}
                    onClose={() => setShowDetail(false)}
                    onReview={
                        onReview
                            ? (target) => {
                                  setShowDetail(false);
                                  onReview(target);
                              }
                            : undefined
                    }
                />
            )}
        </div>
    );
}

function TransactionActions({ status, snapToken, onPay, onViewDetail, onDownload }) {
    if (status === "completed") {
        return (
            <>
                <Button
                    type="neutral"
                    variant="outline"
                    size="sm"
                    rounded={false}
                    className="rounded-lg"
                    onClick={onViewDetail}
                >
                    Lihat Detail
                </Button>
                <Button
                    type="primary"
                    variant="solid"
                    size="sm"
                    rounded={false}
                    className="gap-2 rounded-lg"
                    onClick={onDownload}
                >
                    <FaDownload className="h-3.5 w-3.5" />
                    Download Bukti
                </Button>
            </>
        );
    }

    if (status === "waiting_payment") {
        return (
            <Button
                type="danger"
                variant="solid"
                size="sm"
                rounded={false}
                className="rounded-lg"
                onClick={() => onPay?.(snapToken)}
                disabled={!snapToken}
            >
                Bayar Sekarang
            </Button>
        );
    }

    // in_progress
    return (
        <Button
            type="warning"
            variant="solid"
            size="sm"
            rounded={false}
            className="rounded-lg"
            onClick={onViewDetail}
        >
            Pantau Barang
        </Button>
    );
}
