import { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { FaCamera, FaUpload, FaTrashAlt, FaPen } from "react-icons/fa";
import CameraCaptureModal from "./CameraCaptureModal";

/**
 * Avatar bulat dengan tombol "edit" untuk:
 * - Ambil Foto (kamera / fallback file capture di mobile)
 * - Unggah dari Perangkat
 * - Hapus Foto
 */
export default function AvatarEditor({ profile, editable = true }) {
    const [open, setOpen] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [localPreview, setLocalPreview] = useState(null);

    const menuRef = useRef(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function canUseCamera() {
        return (
            typeof navigator !== "undefined" &&
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia
        );
    }

    function uploadFile(file) {
        if (!file) return;

        setLocalPreview(URL.createObjectURL(file));
        setUploading(true);

        const formData = new FormData();
        formData.append("profile_image", file);

        router.post("/profile-history/image", formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setUploading(false);
                setLocalPreview(null);
            },
        });
    }

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        e.target.value = "";
        setOpen(false);
        uploadFile(file);
    }

    function handleTakePhoto() {
        setOpen(false);
        if (canUseCamera()) {
            setShowCamera(true);
        } else {
            cameraInputRef.current?.click();
        }
    }

    function handleCameraCapture(file) {
        setShowCamera(false);
        uploadFile(file);
    }

    function handleRemove() {
        setOpen(false);
        if (
            window.confirm("Yakin ingin menghapus foto profil Anda?")
        ) {
            router.delete("/profile-history/image", { preserveScroll: true });
        }
    }

    const avatarSrc = localPreview || profile.avatar;

    return (
        <div className="relative w-fit" ref={menuRef}>
            <div className="relative h-48 w-48 overflow-hidden rounded-full ring-1 ring-neutral-200">
                <img
                    src={avatarSrc}
                    alt={profile.full_name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.target.src = "/assets/default-profile.png";
                    }}
                />
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                )}
            </div>

            {editable && (
                <>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-700 text-white ring-4 ring-white transition-transform hover:scale-105"
                        aria-label="Edit foto profil"
                    >
                        <FaPen className="h-3.5 w-3.5" />
                    </button>

                    {open && (
                        <div className="absolute bottom-0 left-full z-20 ml-2 w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-md">
                            <MenuItem
                                icon={<FaCamera className="h-4 w-4" />}
                                label="Ambil Foto"
                                onClick={handleTakePhoto}
                            />
                            <MenuItem
                                icon={<FaUpload className="h-4 w-4" />}
                                label="Unggah dari Perangkat"
                                onClick={() => fileInputRef.current?.click()}
                            />
                            {profile.has_custom_avatar && (
                                <MenuItem
                                    icon={<FaTrashAlt className="h-4 w-4" />}
                                    label="Hapus Foto"
                                    danger
                                    onClick={handleRemove}
                                />
                            )}
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleFileChange}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        hidden
                        onChange={handleFileChange}
                    />
                </>
            )}

            {showCamera && (
                <CameraCaptureModal
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
}

function MenuItem({ icon, label, onClick, danger = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                danger
                    ? "text-danger-700 hover:bg-danger-50"
                    : "text-neutral-700 hover:bg-neutral-50"
            }`}
        >
            <span className={danger ? "text-danger-600" : "text-primary-700"}>
                {icon}
            </span>
            {label}
        </button>
    );
}
