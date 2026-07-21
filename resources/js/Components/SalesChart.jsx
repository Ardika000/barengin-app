import React, { useId, useState } from "react";

// Grafik garis+area sederhana (SVG) untuk tren penjualan bulanan.
// data: [{ label: "Jan", value: 12 }, ...]
// unitLabel: teks satuan yang tampil di tooltip (mis. "terjual").
export default function SalesChart({ data = [], height = 260, unitLabel = "" }) {
    const gid = useId().replace(/:/g, "");
    const [hover, setHover] = useState(null); // index titik yang di-hover

    const w = 640;
    const h = height;
    const padX = 24;
    const padTop = 24;
    const padBottom = 34;

    const values = data.map((d) => Number(d.value) || 0);
    const max = Math.max(1, ...values);
    const total = values.reduce((a, b) => a + b, 0);
    const stepX = data.length > 1 ? (w - padX * 2) / (data.length - 1) : 0;
    const chartH = h - padTop - padBottom;

    const x = (i) => padX + i * stepX;
    const y = (v) => padTop + (1 - v / max) * chartH;

    const pts = data.map((d, i) => [x(i), y(Number(d.value) || 0)]);
    const linePath = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const areaPath = pts.length
        ? linePath + ` L ${x(data.length - 1).toFixed(1)} ${padTop + chartH} L ${x(0).toFixed(1)} ${padTop + chartH} Z`
        : "";

    // Warna biru (primary-700) untuk garis, titik, & bayangan area
    const BLUE = "#0078cf";

    // Garis grid + tick sumbu Y (5 baris, dari atas=max ke bawah=0)
    const gridFractions = [0, 0.25, 0.5, 0.75, 1];
    const gridLines = gridFractions.map((f) => ({
        yPx: padTop + f * chartH,
        value: Math.round(max * (1 - f)),
    }));

    // Posisi titik dalam persen (horizontal ter-stretch) & px (vertikal 1:1)
    const leftPct = (i) => (x(i) / w) * 100;

    return (
        <div className="flex w-full select-none">
            {/* Sumbu Y - label kuantitas */}
            <div className="relative shrink-0" style={{ width: 34, height }}>
                {gridLines.map((g, i) => (
                    <span
                        key={i}
                        className="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium text-neutral-400 tabular-nums"
                        style={{ top: g.yPx }}
                    >
                        {g.value.toLocaleString("id-ID")}
                    </span>
                ))}
            </div>

            {/* Area chart */}
            <div className="relative min-w-0 flex-1">
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
                    <defs>
                        <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={BLUE} stopOpacity="0.22" />
                            <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid */}
                    {gridLines.map((g, i) => (
                        <line key={i} x1={padX} y1={g.yPx} x2={w - padX} y2={g.yPx} stroke="#eef2f7" strokeWidth="1" />
                    ))}

                    {total > 0 && (
                        <g>
                            <path d={areaPath} fill={`url(#grad-${gid})`} />
                            <path d={linePath} fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p, i) => (
                                <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke={BLUE} strokeWidth="2.5" />
                            ))}
                        </g>
                    )}
                </svg>

                {/* Overlay interaktif: titik hit-area + tooltip (HTML agar tidak ikut ter-stretch) */}
                {total > 0 && (
                    <div className="absolute inset-0">
                        {data.map((d, i) => {
                            const val = Number(d.value) || 0;
                            const isHover = hover === i;
                            return (
                                <div
                                    key={i}
                                    className="absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: `${leftPct(i)}%`, top: y(val) }}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                >
                                    {/* Hit area (transparan) */}
                                    <div className="h-6 w-6 cursor-pointer rounded-full" />
                                    {/* Tooltip */}
                                    {isHover && (
                                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-primary-700 px-2.5 py-1.5 text-center shadow-lg">
                                            <div className="text-xs font-bold text-white tabular-nums">
                                                {val.toLocaleString("id-ID")} {unitLabel}
                                            </div>
                                            <div className="text-[10px] font-medium text-blue-100">{d.label}</div>
                                            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-primary-700" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Label bulan */}
                <div className="flex justify-between px-4">
                    {data.map((d, i) => (
                        <span key={i} className="text-xs font-medium text-neutral-400">{d.label}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}
