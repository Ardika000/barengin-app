
const rupiah = (n) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

function interpolate(template, params) {
    let out = String(template ?? "");

    // Urut dari nama terpanjang, kalau tidak ":more" ikut termakan saat nambal ":m".
    const names = Object.keys(params ?? {}).sort((a, b) => b.length - a.length);

    for (const name of names) {
        out = out.split(`:${name}`).join(String(params[name] ?? ""));
    }

    return out;
}

export function formatNotification(t, notification) {
    const type = notification?.type ?? "";
    const data = notification?.data ?? {};

    const title = t(`notif.${type}.title`);

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
        follower: data.follower,
        quantity: data.quantity,
        amount: data.amount != null ? rupiah(data.amount) : "",
        balance: data.balance != null ? rupiah(data.balance) : "",
    };

    const perKind = type === "order.created" || type === "group.removed";
    const bodyKey = perKind
        ? `notif.${type}.body.${data.kind ?? "trip"}`
        : `notif.${type}.body`;

    return { title, body: interpolate(t(bodyKey), params) };
}

export function notificationIconKey(type) {
    if (type?.startsWith("pergi_bareng.")) return "pergi_bareng";
    if (type?.startsWith("group.")) return "group";
    if (type?.startsWith("order.")) return "order";
    if (type?.startsWith("payment.")) return "payment";
    if (type?.startsWith("split_bill.")) return "split_bill";
    if (type?.startsWith("jastip_request.")) return "jastip_request";
    if (type?.startsWith("selling.")) return "selling";
    if (type?.startsWith("wallet.")) return "wallet";
    if (type?.startsWith("forum.")) return "forum";
    if (type?.startsWith("activity.")) return "activity";
    return "default";
}
