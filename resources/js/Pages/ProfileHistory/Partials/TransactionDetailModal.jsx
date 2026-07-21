import { useState } from "react";
import { Link } from "@inertiajs/react";
import { FaTimes, FaChevronRight } from "react-icons/fa";
import Button from "@/Components/Button";
import ImageLightbox from "@/Components/ImageLightbox";
import { useTranslation } from "@/lib/useTranslation";

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

// Heading status dilokalkan dari status transaksi (bukan teks server).
const STATUS_LABEL = {
    completed: "ph.status_completed",
    waiting_payment: "ph.status_waiting",
    in_progress: "ph.status_progress",
    refunded: "ph.status_refunded",
};

const STATUS_TONE = {
    completed: "bg-success-100 text-success-700",
    waiting_payment: "bg-warning-100 text-warning-700",
    in_progress: "bg-warning-100 text-warning-700",
    refunded: "bg-neutral-100 text-neutral-600",
};

/** Judul seksi: kecil & kalem, jadi isinya yang menonjol - bukan labelnya. */
function SectionTitle({ children }) {
    return (
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {children}
        </h4>
    );
}

/**
 * Bungkus tautan opsional. Sengaja tanpa efek hover - tautan di modal ini hanya
 * perlu bisa diklik, bukan menarik perhatian dari isi transaksinya.
 */
function MaybeLink({ href, className, children }) {
    if (!href) {
        return <span className={className}>{children}</span>;
    }

    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    );
}

export default function TransactionDetailModal({ transaction, onClose, onReview }) {
    const { t } = useTranslation();
    const d = transaction.detail;
    const [lightbox, setLightbox] = useState({ open: false, index: 0 });
    if (!d) return null;

    // Semua gambar item (mendukung pesanan dengan banyak barang) untuk lightbox.
    const itemImages = (d.items ?? []).map((it) => it.image).filter(Boolean);

    const canReview =
        transaction.status === "completed" &&
        transaction.review_target &&
        onReview;

    const statusLabel = STATUS_LABEL[transaction.status]
        ? t(STATUS_LABEL[transaction.status])
        : d.status_heading;

    return (
        <>
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
                    <h2 className="text-lg font-semibold text-neutral-900">
                        {t("ph.detail_title")}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                        aria-label={t("ph.close")}
                    >
                        <FaTimes className="h-4 w-4" />
                    </button>
                </div>

                <div className="divide-y divide-neutral-100 px-6">
                    {/* Status + aksi */}
                    <div className="flex items-start justify-between gap-4 py-6">
                        <div className="min-w-0">
                            <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    STATUS_TONE[transaction.status] ??
                                    "bg-neutral-100 text-neutral-600"
                                }`}
                            >
                                {statusLabel}
                            </span>

                            <dl className="mt-4 space-y-2 text-sm">
                                <DetailRow
                                    label={t("ph.detail_order_no")}
                                    value={d.order_no}
                                />
                                <DetailRow
                                    label={t("ph.detail_purchase_date")}
                                    value={d.date_label}
                                />
                            </dl>
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
                                        {t("ph.detail_buy_again")}
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
                                        {t("ph.give_review")}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Detail Pesanan */}
                    <div className="py-6">
                        <SectionTitle>{t("ph.detail_order_detail")}</SectionTitle>

                        {d.seller && (
                            <MaybeLink
                                href={d.seller.url}
                                className="mb-4 flex items-center gap-2.5 text-sm text-neutral-700"
                            >
                                <img
                                    src={d.seller.avatar}
                                    alt={d.seller.name}
                                    className="h-7 w-7 rounded-full object-cover"
                                    onError={(e) => {
                                        e.target.src =
                                            "/assets/default-profile.png";
                                    }}
                                />
                                <span className="min-w-0 truncate font-medium">
                                    {d.seller.name}
                                </span>
                                {d.seller.url && (
                                    <FaChevronRight className="h-2.5 w-2.5 shrink-0 text-neutral-400" />
                                )}
                            </MaybeLink>
                        )}

                        <div className="space-y-4">
                            {d.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-4"
                                >
                                    {/* Gambar membuka lightbox; namanya menuju
                                        halaman detail - dua aksi yang berbeda. */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setLightbox({ open: true, index: idx })
                                        }
                                        className="shrink-0 overflow-hidden rounded-lg"
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="h-14 w-14 cursor-zoom-in object-cover"
                                            onError={(e) => {
                                                e.target.src =
                                                    "/assets/default-image.png";
                                            }}
                                        />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <MaybeLink
                                            href={item.url}
                                            className="flex items-center gap-1.5 text-[15px] font-medium text-neutral-900"
                                        >
                                            <span className="min-w-0 truncate">
                                                {item.name}
                                            </span>
                                            {item.url && (
                                                <FaChevronRight className="h-2.5 w-2.5 shrink-0 text-neutral-400" />
                                            )}
                                        </MaybeLink>
                                        <p className="mt-0.5 text-sm text-neutral-500">
                                            {item.slot} {t("ph.slot")}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Pengiriman (jastip) */}
                    {d.shipping && (
                        <div className="py-6">
                            <SectionTitle>
                                {t("ph.detail_shipping_info")}
                            </SectionTitle>
                            <div className="flex gap-3 text-sm">
                                <span className="w-20 shrink-0 text-neutral-500">
                                    {t("ph.detail_address")}
                                </span>
                                <span className="text-neutral-800">
                                    {d.shipping.address}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Rincian Pembayaran */}
                    <div className="py-6">
                        <SectionTitle>
                            {t("ph.detail_payment_detail")}
                        </SectionTitle>

                        <div className="space-y-2.5 text-sm">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-neutral-500">
                                    {t("ph.detail_payment_method")}
                                </span>
                                <span className="font-medium text-neutral-900">
                                    {d.payment_method}
                                </span>
                            </div>

                            {d.fees.map((fee, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between gap-4"
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

                        <div className="mt-4 flex items-center justify-between gap-4 border-t border-neutral-200 pt-4">
                            <span className="text-sm font-medium text-neutral-600">
                                {t("ph.detail_total")}
                            </span>
                            <span className="text-lg font-semibold text-neutral-900">
                                {rupiah(d.total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <ImageLightbox
            images={itemImages}
            index={lightbox.index}
            open={lightbox.open}
            onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        />
        </>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-8">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="font-medium text-neutral-900">{value}</dd>
        </div>
    );
}
