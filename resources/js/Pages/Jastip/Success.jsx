import React from "react";
import { Head } from "@inertiajs/react";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import MainLayout from "@/Layouts/MainLayout";
import { useTranslation } from "@/lib/useTranslation";
import { BsCheckLg } from "react-icons/bs";
import { FiClock } from "react-icons/fi";

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function Success({ order }) {
    const { t } = useTranslation();
    const isPaid = order.status === "paid";

    return (
        <div className="flex min-h-screen flex-col items-center bg-neutral-50 pb-32 pt-16">
            <Head title="Pembayaran Jastip - Barengin" />
            <Container className="flex w-full max-w-2xl flex-col items-center px-4">
                {/* Status icon */}
                <div
                    className={`mb-6 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg ${
                        isPaid ? "bg-[#34C759] shadow-green-200" : "bg-amber-400 shadow-amber-100"
                    }`}
                >
                    {isPaid ? <BsCheckLg className="text-5xl" /> : <FiClock className="text-5xl" />}
                </div>

                <h1 className="mb-2 text-center text-3xl font-bold text-neutral-700">
                    {isPaid ? t("jastip.success.title") : t("jastip.success.pending_title")}
                </h1>
                <p className="mb-10 text-center text-lg text-neutral-600">
                    {isPaid ? t("jastip.success.subtitle") : t("jastip.success.pending_subtitle")}
                </p>

                {/* Transaction card */}
                <div className="mb-8 w-full max-w-[520px] rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm md:p-8">
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <p className="mb-1 text-sm text-neutral-500">{t("jastip.success.transaction_id")}</p>
                            <p className="text-xl font-bold tracking-wide text-neutral-700">{order.code}</p>
                        </div>
                        <div
                            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                                isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}
                        >
                            {isPaid ? t("jastip.success.paid") : t("jastip.success.pending_badge")}
                        </div>
                    </div>

                    <div className="divide-y divide-neutral-100">
                        {order.items.map((it, i) => (
                            <div key={i} className="flex items-center gap-4 py-4 first:pt-0">
                                <img
                                    src={it.image}
                                    alt={it.name}
                                    className="h-14 w-14 shrink-0 rounded-xl border border-neutral-100 object-cover"
                                    onError={(e) => { e.target.src = "/assets/default-image.png"; }}
                                />
                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-sm font-bold text-neutral-700">{it.name}</h3>
                                    {it.variant && <p className="text-xs text-neutral-400">{it.variant}</p>}
                                    <p className="text-sm font-bold text-primary-700">{rupiah(it.price)}</p>
                                </div>
                                <span className="text-lg font-bold text-neutral-700">{it.quantity}x</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex justify-between border-t border-neutral-100 pt-4">
                        <span className="font-bold text-neutral-700">{t("jastip.checkout.total")}</span>
                        <span className="text-lg font-bold text-neutral-800">{rupiah(order.total)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex w-full max-w-[520px] flex-col gap-4">
                    <Button
                        isButtonLink
                        href="/profile-history?tab=transactions"
                        type="primary"
                        size="md"
                        rounded
                        className="w-full font-bold text-white"
                    >
                        {t("jastip.success.detail_btn")}
                    </Button>
                    <Button
                        isButtonLink
                        href="/jastip"
                        variant="outline"
                        type="neutral"
                        size="md"
                        rounded
                        className="w-full bg-white font-bold text-neutral-700"
                    >
                        {t("jastip.success.skip")}
                    </Button>
                </div>
            </Container>
        </div>
    );
}

Success.layout = (page) => <MainLayout children={page} />;
