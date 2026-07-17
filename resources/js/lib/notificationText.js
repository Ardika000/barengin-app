// Perakit kalimat notifikasi.
//
// Backend sengaja hanya menyimpan `type` + `data` (parameter), bukan kalimat
// jadi — kalimatnya dirakit di sini lewat t() supaya notifikasi lama ikut
// berubah bahasa saat pengguna mengganti bahasa.
//
// Interpolasi memakai idiom yang sudah dipakai di codebase: t(...).replace(":x", ...)

const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

function interpolate(template, params) {
    let out = String(template ?? "");

    // Urut dari nama terpanjang: tanpa ini ":more" akan ikut termakan saat
    // menambal ":m", dan pola serupa pada parameter lain.
    const names = Object.keys(params ?? {}).sort((a, b) => b.length - a.length);

    for (const name of names) {
        out = out.split(`:${name}`).join(String(params[name] ?? ""));
    }

    return out;
}

/**
 * @returns {{title: string, body: string}}
 */
export function formatNotification(t, notification) {
    const type = notification?.type ?? "";
    const data = notification?.data ?? {};

    const title = t(`notif.${type}.title`);

    // Nama produk jastip: keranjang bisa berisi banyak item, backend mengirim
    // item pertama + jumlah sisanya agar kalimatnya bisa dirakit per bahasa.
    const more = Number(data.more ?? 0);
    const name =
        more > 0
            ? interpolate(t("notif.order.item_more"), { name: data.name, more })
            : data.name;

    const params = {
        name,
        title: data.title,
        payer: data.payer,
        requester: data.requester,
        quantity: data.quantity,
        amount: data.amount != null ? rupiah(data.amount) : "",
    };

    // order.created punya kalimat berbeda per jenis pesanan.
    const bodyKey =
        type === "order.created"
            ? `notif.order.created.body.${data.kind ?? "trip"}`
            : `notif.${type}.body`;

    return { title, body: interpolate(t(bodyKey), params) };
}

/** Kunci ikon per tipe — dipetakan ke komponen ikon di sisi pemakai. */
export function notificationIconKey(type) {
    if (type?.startsWith("pergi_bareng.")) return "pergi_bareng";
    if (type?.startsWith("group.")) return "group";
    if (type?.startsWith("order.")) return "order";
    if (type?.startsWith("payment.")) return "payment";
    if (type?.startsWith("split_bill.")) return "split_bill";
    if (type?.startsWith("jastip_request.")) return "jastip_request";
    if (type?.startsWith("selling.")) return "selling";
    return "default";
}
