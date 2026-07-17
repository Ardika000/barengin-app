import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { router } from "@inertiajs/react";
import Button from "@/Components/Button";
import { MdReceiptLong } from "react-icons/md";
import { FiX } from "react-icons/fi";
import { useTranslation } from "@/lib/useTranslation";

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

/**
 * Modal "Bagi Tagihan" untuk penyelenggara pergi bareng yang sudah selesai.
 *
 * Alur: penyelenggara memasukkan total → nominal dibagi rata per kepala
 * (mengikuti `quantity` tiap anggota) → tiap baris masih bisa diubah manual.
 * Penyelenggara ikut dihitung saat membagi tetapi tidak ditagih, karena dialah
 * yang menalangi biayanya.
 */
export default function SplitBillModal({ trip, open, onClose }) {
    const { t } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState([]);
    const [totalPeople, setTotalPeople] = useState(1);
    const [title, setTitle] = useState("");
    const [note, setNote] = useState("");
    const [total, setTotal] = useState("");
    // Nominal per anggota; null berarti "ikut pembagian rata".
    const [overrides, setOverrides] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !trip?.id) return;

        setLoading(true);
        setError(null);
        setOverrides({});
        setTotal("");
        setNote("");
        setTitle(trip.name ? `Patungan ${trip.name}` : "");

        axios
            .get(`/admin/pergi-bareng/${trip.id}/split-bill`)
            .then(({ data }) => {
                setMembers(data.members ?? []);
                setTotalPeople(data.total_people ?? 1);
            })
            .catch(() =>
                setError(
                    t("split_bill.load_failed", "Gagal memuat daftar anggota."),
                ),
            )
            .finally(() => setLoading(false));
    }, [open, trip?.id]);

    // Pembagian rata per kepala: anggota yang membawa 2 orang membayar 2 bagian.
    const suggested = useMemo(() => {
        const totalNum = Number(total) || 0;
        const perHead = totalPeople > 0 ? totalNum / totalPeople : 0;

        return members.reduce((acc, m) => {
            acc[m.id] = Math.round(perHead * (m.quantity || 1));
            return acc;
        }, {});
    }, [total, totalPeople, members]);

    const amountFor = (id) =>
        overrides[id] !== undefined && overrides[id] !== null
            ? Number(overrides[id]) || 0
            : suggested[id] ?? 0;

    const billed = members.reduce((sum, m) => sum + amountFor(m.id), 0);

    const submit = () => {
        setError(null);

        const shares = members
            .map((m) => ({ user_id: m.id, amount: amountFor(m.id) }))
            .filter((s) => s.amount > 0);

        if (!title.trim()) {
            setError(t("split_bill.title_required", "Judul tagihan wajib diisi."));
            return;
        }

        if (!shares.length) {
            setError(
                t("split_bill.amount_required", "Isi total tagihan lebih dulu."),
            );
            return;
        }

        setSaving(true);
        router.post(
            `/admin/pergi-bareng/${trip.id}/split-bill`,
            { title: title.trim(), note: note.trim() || null, shares },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: () =>
                    setError(t("split_bill.save_failed", "Gagal membuat tagihan.")),
                onFinish: () => setSaving(false),
            },
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-100 p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <MdReceiptLong size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-700">
                                {t("split_bill.modal_title", "Bagi Tagihan")}
                            </h3>
                            <p className="text-xs text-neutral-500">{trip?.name}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100"
                        aria-label={t("common.cancel", "Batal")}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
                    {loading ? (
                        <p className="py-8 text-center text-sm text-neutral-400">
                            {t("common.loading", "Memuat...")}
                        </p>
                    ) : members.length === 0 ? (
                        <p className="py-8 text-center text-sm text-neutral-400">
                            {t(
                                "split_bill.no_members",
                                "Belum ada anggota yang bisa ditagih.",
                            )}
                        </p>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                                    {t("split_bill.field_title", "Judul tagihan")}
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t(
                                        "split_bill.field_title_ph",
                                        "Misal: Bensin & tol",
                                    )}
                                    className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-700"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                                    {t("split_bill.field_total", "Total biaya")}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={total}
                                    onChange={(e) => {
                                        setTotal(e.target.value);
                                        // Total baru → kembalikan semua baris ke
                                        // pembagian rata, jangan pertahankan
                                        // nominal manual dari total sebelumnya.
                                        setOverrides({});
                                    }}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-700"
                                />
                                <p className="mt-1 text-[11px] text-neutral-400">
                                    {t(
                                        "split_bill.split_hint",
                                        "Dibagi rata untuk",
                                    )}{" "}
                                    {totalPeople}{" "}
                                    {t("split_bill.people", "orang")} (
                                    {t(
                                        "split_bill.creator_included",
                                        "termasuk kamu, bagianmu tidak ditagih",
                                    )}
                                    )
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-neutral-600">
                                    {t("split_bill.field_note", "Catatan")}{" "}
                                    <span className="font-normal text-neutral-400">
                                        ({t("common.optional", "opsional")})
                                    </span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full resize-none rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary-700"
                                />
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold text-neutral-600">
                                    {t("split_bill.per_member", "Nominal per anggota")}
                                </p>
                                <div className="space-y-2">
                                    {members.map((m) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center gap-3 rounded-xl border border-neutral-200 p-2.5"
                                        >
                                            <img
                                                src={m.avatar}
                                                alt=""
                                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-neutral-700">
                                                    {m.name}
                                                </p>
                                                {m.quantity > 1 ? (
                                                    <p className="text-[11px] text-neutral-400">
                                                        {m.quantity}{" "}
                                                        {t("split_bill.people", "orang")}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={amountFor(m.id)}
                                                onChange={(e) =>
                                                    setOverrides((o) => ({
                                                        ...o,
                                                        [m.id]: e.target.value,
                                                    }))
                                                }
                                                className="w-32 rounded-lg border border-neutral-300 px-3 py-1.5 text-right text-sm outline-none transition focus:border-primary-700"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                                <span className="text-sm text-neutral-600">
                                    {t("split_bill.billed_total", "Total ditagih")}
                                </span>
                                <span className="text-base font-bold text-neutral-800">
                                    {rupiah(billed)}
                                </span>
                            </div>

                            {error ? (
                                <p className="text-xs text-red-600">{error}</p>
                            ) : null}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50 p-4">
                    <Button type="neutral" onClick={onClose} size="sm">
                        {t("common.cancel", "Batal")}
                    </Button>
                    <Button
                        onClick={submit}
                        size="sm"
                        disabled={saving || loading || members.length === 0}
                    >
                        {saving
                            ? t("split_bill.processing", "Memproses...")
                            : t("split_bill.send", "Kirim ke grup")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
