import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    FiChevronLeft,
    FiChevronRight,
    FiMaximize,
    FiMinus,
    FiPlus,
    FiX,
} from "react-icons/fi";
import useLockBodyScroll from "@/Hooks/useLockBodyScroll";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;

export default function ImageLightbox({
    images = [],
    index = 0,
    open = false,
    onClose,
    alt = "image",
}) {
    const list = Array.isArray(images) ? images.filter(Boolean) : [];
    const [current, setCurrent] = useState(index);

    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const imgWrapRef = useRef(null);

    useLockBodyScroll(open);

    const clamp = (v) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

    const resetZoom = useCallback(() => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    }, []);

    useEffect(() => {
        if (open) setCurrent(Math.min(Math.max(0, index), Math.max(0, list.length - 1)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, index]);

    useEffect(() => {
        resetZoom();
    }, [current, open, resetZoom]);

    const hasMany = list.length > 1;

    const goPrev = useCallback(
        (e) => {
            e?.stopPropagation();
            setCurrent((c) => (c - 1 + list.length) % list.length);
        },
        [list.length],
    );

    const goNext = useCallback(
        (e) => {
            e?.stopPropagation();
            setCurrent((c) => (c + 1) % list.length);
        },
        [list.length],
    );

    const zoomIn = useCallback((e) => {
        e?.stopPropagation();
        setScale((s) => clamp(s + STEP));
    }, []);

    const zoomOut = useCallback((e) => {
        e?.stopPropagation();
        setScale((s) => {
            const next = clamp(s - STEP);
            if (next === 1) setOffset({ x: 0, y: 0 });
            return next;
        });
    }, []);

    const toggleZoom = useCallback((e) => {
        e?.stopPropagation();
        setScale((s) => {
            if (s > 1) {
                setOffset({ x: 0, y: 0 });
                return 1;
            }
            return 2;
        });
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
            else if (e.key === "ArrowLeft" && hasMany) goPrev();
            else if (e.key === "ArrowRight" && hasMany) goNext();
            else if (e.key === "+" || e.key === "=") zoomIn();
            else if (e.key === "-" || e.key === "_") zoomOut();
            else if (e.key === "0") resetZoom();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, hasMany, goPrev, goNext, onClose, zoomIn, zoomOut, resetZoom]);

    // Listener wheel harus non-pasif supaya preventDefault jalan.
    useEffect(() => {
        const el = imgWrapRef.current;
        if (!el || !open) return;
        const onWheel = (e) => {
            e.preventDefault();
            const dir = e.deltaY < 0 ? STEP : -STEP;
            setScale((s) => {
                const next = clamp(s + dir);
                if (next === 1) setOffset({ x: 0, y: 0 });
                return next;
            });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [open]);

    const onDragStart = (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = { startX: e.clientX - offset.x, startY: e.clientY - offset.y };
        setDragging(true);
    };

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e) => {
            if (!dragRef.current) return;
            setOffset({
                x: e.clientX - dragRef.current.startX,
                y: e.clientY - dragRef.current.startY,
            });
        };
        const onUp = () => {
            dragRef.current = null;
            setDragging(false);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [dragging]);

    if (!open || list.length === 0) return null;

    const zoomed = scale > 1;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4"
            onClick={() => onClose?.()}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full bg-white/10 p-1 text-white"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={zoomOut}
                    disabled={scale <= MIN_SCALE}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Perkecil"
                    title="Perkecil (−)"
                >
                    <FiMinus className="h-5 w-5" />
                </button>
                <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    type="button"
                    onClick={zoomIn}
                    disabled={scale >= MAX_SCALE}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Perbesar"
                    title="Perbesar (+)"
                >
                    <FiPlus className="h-5 w-5" />
                </button>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        resetZoom();
                    }}
                    disabled={!zoomed}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Ukuran semula"
                    title="Ukuran semula (0)"
                >
                    <FiMaximize className="h-4 w-4" />
                </button>
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                }}
                className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Tutup"
            >
                <FiX className="h-5 w-5" />
            </button>

            {hasMany && (
                <>
                    <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Sebelumnya"
                    >
                        <FiChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                        aria-label="Berikutnya"
                    >
                        <FiChevronRight className="h-6 w-6" />
                    </button>
                </>
            )}

            <div
                ref={imgWrapRef}
                className="flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={list[current]}
                    alt={alt}
                    draggable={false}
                    onDoubleClick={toggleZoom}
                    onMouseDown={onDragStart}
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        transition: dragging ? "none" : "transform 0.15s ease-out",
                        cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
                    }}
                    className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl select-none"
                />
            </div>

            {hasMany && (
                <div
                    className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white"
                    onClick={(e) => e.stopPropagation()}
                >
                    {current + 1} / {list.length}
                </div>
            )}
        </div>
    );
}
