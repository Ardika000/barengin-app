import { useEffect, useRef, useState } from "react";
import { FaCamera, FaTimes, FaRedo } from "react-icons/fa";
import Button from "@/Components/Button";

/**
 * Modal kamera berbasis getUserMedia.
 * Mengambil foto dari webcam lalu mengembalikannya sebagai File lewat onCapture.
 */
export default function CameraCaptureModal({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        let active = true;

        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: 1280, height: 720 },
                    audio: false,
                });

                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (e) {
                setError(
                    "Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.",
                );
            }
        }

        startCamera();

        return () => {
            active = false;
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }

    function handleCapture() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const size = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;

        canvas.width = 512;
        canvas.height = 512;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 512, 512);

        setPreview(canvas.toDataURL("image/jpeg", 0.9));
    }

    function handleRetake() {
        setPreview(null);
    }

    function handleUse() {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const file = new File([blob], `camera-${Date.now()}.jpg`, {
                    type: "image/jpeg",
                });
                stopCamera();
                onCapture(file);
            },
            "image/jpeg",
            0.9,
        );
    }

    function handleClose() {
        stopCamera();
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                        <FaCamera className="text-primary-700" />
                        Ambil Foto
                    </h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="Tutup"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="p-5">
                    {error ? (
                        <div className="rounded-xl bg-danger-50 px-4 py-6 text-center text-sm font-medium text-danger-700">
                            {error}
                        </div>
                    ) : (
                        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-neutral-900">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`h-full w-full object-cover ${
                                    preview ? "hidden" : "block"
                                }`}
                            />
                            {preview && (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="h-full w-full object-cover"
                                />
                            )}
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />

                    {!error && (
                        <div className="mt-5 flex items-center justify-center gap-3">
                            {!preview ? (
                                <Button
                                    type="primary"
                                    variant="solid"
                                    size="sm"
                                    onClick={handleCapture}
                                    className="gap-2"
                                >
                                    <FaCamera className="h-4 w-4" />
                                    Ambil Foto
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        type="neutral"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRetake}
                                        className="gap-2"
                                    >
                                        <FaRedo className="h-3.5 w-3.5" />
                                        Ulangi
                                    </Button>
                                    <Button
                                        type="primary"
                                        variant="solid"
                                        size="sm"
                                        onClick={handleUse}
                                    >
                                        Gunakan Foto
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
