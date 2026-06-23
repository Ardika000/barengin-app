/**
 * Membuat file bukti transaksi (HTML mandiri) lalu mengunduhnya.
 * Logo Barengin di-embed sebagai data URI agar file tetap utuh saat dibuka offline.
 */
export async function downloadReceipt(transaction) {
    const d = transaction.detail;
    if (!d) return;

    const logo = await loadLogoDataUri();
    const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

    const itemsRows = d.items
        .map(
            (it) =>
                `<tr><td>${escapeHtml(it.name)}</td><td style="text-align:right">${it.slot} Slot</td></tr>`,
        )
        .join("");

    const feesRows = d.fees
        .map(
            (f) =>
                `<tr><td>${escapeHtml(f.label)}</td><td style="text-align:right">${rupiah(f.amount)}</td></tr>`,
        )
        .join("");

    const shippingBlock = d.shipping
        ? `<div class="section"><h3>Info Pengiriman</h3><p>${escapeHtml(d.shipping.address)}</p></div>`
        : "";

    const brand = logo
        ? `<img src="${logo}" alt="Barengin" style="height:38px" />`
        : `<div style="color:#0078cf;font-size:22px;font-weight:800;">Barengin</div>`;

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bukti Transaksi ${escapeHtml(d.order_no)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Poppins", Arial, Helvetica, sans-serif; color: #1f1f1f; margin: 0; padding: 32px; background: #f5f5f5; }
  .card { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #eeeeee; border-radius: 16px; padding: 28px; }
  .muted { color: #8e8e8e; }
  h3 { font-size: 15px; margin: 0 0 8px; color: #1f1f1f; }
  .row { display: flex; justify-content: space-between; font-size: 14px; margin: 4px 0; }
  .section { border-top: 1px dashed #eeeeee; padding-top: 16px; margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 4px 0; }
  .total { display: flex; justify-content: space-between; font-weight: 800; font-size: 16px; color: #1f1f1f; border-top: 1px solid #eeeeee; margin-top: 12px; padding-top: 12px; }
  .badge { display: inline-block; background: #d1ffda; color: #299b3f; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
</style>
</head>
<body>
  <div class="card">
    ${brand}
    <h4 class="bold" style="margin-top:6px">Bukti Transaksi</h4>

    <div style="margin:16px 0;">
      <span class="badge">${escapeHtml(d.status_heading)}</span>
    </div>

    <div class="row"><span class="muted">No. Pesanan</span><span>${escapeHtml(d.order_no)}</span></div>
    <div class="row"><span class="muted">Tanggal Pembelian</span><span>${escapeHtml(d.date_label)}</span></div>
    <div class="row"><span class="muted">Metode Pembayaran</span><span>${escapeHtml(d.payment_method || "-")}</span></div>

    <div class="section">
      <h3>Detail Pesanan</h3>
      <table>${itemsRows}</table>
    </div>

    ${shippingBlock}

    <div class="section">
      <h3>Rincian Pembayaran</h3>
      <table>${feesRows}</table>
      <div class="total"><span>Total Biaya</span><span>${rupiah(d.total)}</span></div>
    </div>

    <p class="muted" style="margin-top:24px; font-size:12px; text-align:center;">
      Terima kasih telah menggunakan Barengin.
    </p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bukti-${d.order_no}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function loadLogoDataUri() {
    try {
        const res = await fetch("/assets/barengin_logows.png");
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
