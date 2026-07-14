import { useState } from "react";
import { Link, router } from "@inertiajs/react";
import axios from "axios";
import { toast } from "@/lib/toast";
import Button from "@/Components/Button";
import ConfirmModal from "@/Components/ConfirmModal";
import { useTranslation } from "@/lib/useTranslation";
import { FaPlaneDeparture, FaLocationDot, FaRegCalendar } from "react-icons/fa6";
import { FiAlertCircle } from "react-icons/fi";

const STATUS_BADGE = {
    pending: "bg-warning-100 text-warning-700",
    quoted: "bg-blue-100 text-primary-700",
    paid: "bg-success-100 text-success-700",
    rejected: "bg-danger-100 text-danger-700",
    cancelled: "bg-neutral-100 text-neutral-500",
};

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

// Kartu satu request titipan di tab "Titipan Saya". Saat statusnya `quoted`,
// menampilkan rincian penawaran + tombol bayar (Midtrans Snap via onPay).
export default function JastipRequestCard({ request, onPay }) {
    const { t } = useTranslation();
    const [cancelOpen, setCancelOpen] = useState(false);
    const [paying, setPaying] = useState(false);

    const canCancel = ["pending", "quoted"].includes(request.status);

    const handlePay = async () => {
        setPaying(true);
        try {
            const { data } = await axios.post(`/jastip/requests/${request.id}/pay`);
            if (!data.snap_token) {
                toast.error(data.error || t("jastip.request.pay_failed"));
                return;
            }
            onPay?.(data.snap_token);
        } catch (err) {
            toast.error(err.response?.data?.error || t("jastip.request.pay_failed"));
        } finally {
            setPaying(false);
        }
    };

    const confirmCancel = () =>
        router.post(`/jastip/requests/${request.id}/cancel`, {}, {
            preserveScroll: true,
            onSuccess: () => setCancelOpen(false),
        });

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <ConfirmModal
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                onConfirm={confirmCancel}
                icon={<FiAlertCircle size={26} />}
                iconClass="bg-red-100 text-red-500"
                title={t("jastip.request.cancel_title")}
                description={<>{t("jastip.request.cancel_desc_prefix")} <span className="font-semibold text-neutral-700">{request.item_name}</span>?</>}
                confirmLabel={t("jastip.request.cancel_confirm")}
                confirmType="danger"
            />

            {/* Header: jastiper + status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <img
                        src={request.jastiper.avatar}
                        alt={request.jastiper.name}
                        className="h-9 w-9 rounded-full border border-neutral-200 object-cover"
                        onError={(e) => (e.target.src = "/assets/default-profile.png")}
                    />
                    <div>
                        {request.jastiper.username ? (
                            <Link
                                href={`/forum/users/${request.jastiper.username}`}
                                className="font-semibold text-neutral-900 hover:text-primary-700 hover:underline"
                            >
                                {request.jastiper.name}
                            </Link>
                        ) : (
                            <p className="font-semibold text-neutral-900">{request.jastiper.name}</p>
                        )}
                        <p className="text-xs text-neutral-500">{request.created_label}</p>
                    </div>
                </div>
                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[request.status] || "bg-neutral-100 text-neutral-500"}`}>
                    {t(`jastip.request.status.${request.status}`, request.status)}
                </span>
            </div>

            <hr className="my-4 border-neutral-100" />

            {/* Barang + rute */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        {request.image && (
                            <img
                                src={request.image}
                                alt={request.item_name}
                                className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-cover"
                            />
                        )}
                        <div className="min-w-0">
                            <p className="font-semibold text-neutral-900">
                                {request.item_name}
                                <span className="ml-1.5 text-sm font-normal text-neutral-500">× {request.quantity}</span>
                            </p>
                            {request.description && (
                                <p className="truncate text-sm text-neutral-500" title={request.description}>{request.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600">
                        <span className="inline-flex items-center gap-1.5">
                            <FaPlaneDeparture className="text-neutral-400" size={11} />
                            {t("jastip.card.bought_in")} <b>{request.destination}</b>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <FaLocationDot className="text-primary-600" size={11} />
                            {t("jastip.card.pickup_at")} <b>{request.pickup_city}</b>
                        </span>
                        {request.deadline_label && (
                            <span className="inline-flex items-center gap-1.5">
                                <FaRegCalendar className="text-neutral-400" size={11} />
                                {t("jastip.request.deadline")} <b>{request.deadline_label}</b>
                            </span>
                        )}
                    </div>

                    {/* Rincian penawaran (muncul setelah jastiper menawar) */}
                    {request.quoted_total != null && (
                        <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                            <div className="flex justify-between text-neutral-600">
                                <span>{t("jastip.req.item_price_label")} × {request.quantity}</span>
                                <span>{rupiah(request.quoted_item_price * request.quantity)}</span>
                            </div>
                            <div className="mt-1 flex justify-between text-neutral-600">
                                <span>{t("jastip.req.fee_label")}</span>
                                <span>{rupiah(request.quoted_fee)}</span>
                            </div>
                            <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 font-bold text-neutral-900">
                                <span>{t("jastip.request.quote_total")}</span>
                                <span>{rupiah(request.quoted_total)}</span>
                            </div>
                        </div>
                    )}

                    {request.status === "pending" && request.budget != null && (
                        <p className="mt-3 text-sm text-neutral-500">
                            {t("jastip.request.form.budget")}: <b className="text-neutral-700">{rupiah(request.budget)}</b>
                        </p>
                    )}
                </div>

                {/* Aksi */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {request.status === "quoted" && (
                        <Button
                            type="primary"
                            size="sm"
                            rounded={false}
                            className="rounded-lg"
                            onClick={handlePay}
                            disabled={paying}
                        >
                            {paying ? t("jastip.request.pay_loading") : t("jastip.request.pay_now")}
                        </Button>
                    )}
                    {canCancel && (
                        <Button
                            type="danger"
                            variant="outline"
                            size="sm"
                            rounded={false}
                            className="rounded-lg"
                            onClick={() => setCancelOpen(true)}
                        >
                            {t("jastip.request.cancel_btn")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
