import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    FiBold,
    FiHash,
    FiImage,
    FiItalic,
    FiMapPin,
    FiX,
} from "react-icons/fi";

import IconButton from "./IconButton";
import TagPill from "./TagPill";
import Toggle from "@/Components/Toggle";
import Button from "@/Components/Button";
import LocationSearchModal from "@/Pages/Forum/Partials/LocationSearchModal";
import useLockBodyScroll from "@/Hooks/useLockBodyScroll";
import { useTranslation } from "@/lib/useTranslation";

function PreviewMedia({ images, onRemove }) {
    const { t } = useTranslation();
    if (!images?.length) return null;

    const RemoveBtn = ({ id }) => (
        <button
            type="button"
            onClick={() => onRemove?.(id)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/70"
            aria-label={t("forum.create.remove_image")}
        >
            <FiX className="w-4 h-4" />
        </button>
    );

    if (images.length === 1) {
        const img = images[0];
        return (
            <div className="mt-2 mb-3 relative">
                <img
                    src={img.preview}
                    alt="preview"
                    className="w-full h-40 md:h-64 object-cover rounded-2xl"
                />
                <RemoveBtn id={img.id} />
            </div>
        );
    }

    return (
        <div className="mt-2 mb-3">
            <div className="flex gap-3 overflow-x-auto pb-1 pr-1 snap-x snap-mandatory scrollbar-slim">
                {images.map((img, idx) => (
                    <div
                        key={img.id}
                        className="relative snap-start shrink-0 overflow-hidden rounded-2xl bg-neutral-100 w-64 sm:w-72 md:w-80"
                    >
                        <img
                            src={img.preview}
                            alt={`preview ${idx + 1}`}
                            className="h-40 w-full object-cover md:h-48"
                            loading="lazy"
                        />
                        <RemoveBtn id={img.id} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function getPlainTextFromHtml(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim();
}

function normalizeTagName(name) {
    return String(name ?? "")
        .replace(/^#/, "")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}

// Batas selaras dengan validasi backend PostController@store.
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB / gambar

export default function CreatePostModal({
    open,
    onClose,
    user,
    onSubmit,
    tags = [],
    errors = {},
    processing = false,
}) {
    const { t } = useTranslation();
    useLockBodyScroll(open);
    // Error dipisah per input agar pesannya muncul tepat di bawah kolom yang
    // bermasalah — konsisten dengan prop `error` pada <Input> di form lain.
    const [contentError, setContentError] = useState("");
    const [imageError, setImageError] = useState("");
    const [view, setView] = useState("editor"); // "editor" | "location"
    const [disableComments, setDisableComments] = useState(false);

    const [locationLabel, setLocationLabel] = useState("");
    const [locationPlace, setLocationPlace] = useState(null);

    const [images, setImages] = useState([]);
    const [contentHtml, setContentHtml] = useState("");

    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);

    const [chipTags, setChipTags] = useState([]);
    const [tagBoxOpen, setTagBoxOpen] = useState(false);
    const [tagQuery, setTagQuery] = useState("");

    const fileInputRef = useRef(null);
    const editorRef = useRef(null);
    const tagInputRef = useRef(null);
    const tagBoxRef = useRef(null);
    const [suggestionStyle, setSuggestionStyle] = useState({});

    // Error server (validasi backend) disalurkan ke kolom yang bersangkutan.
    const serverContentError = errors?.content_html ?? "";
    const serverImageError = useMemo(() => {
        const imgKey = Object.keys(errors ?? {}).find((k) => k.startsWith("images"));
        return imgKey ? errors[imgKey] : "";
    }, [errors]);

    // Validasi klien lebih dulu, lalu error server untuk kolom yang sama.
    const displayContentError = contentError || serverContentError;
    const displayImageError = imageError || serverImageError;

    // Validasi saat kirim. Ukuran & jumlah gambar sudah dijaga di handleFiles,
    // jadi di sini cukup memastikan konten teks terisi — teks WAJIB, gambar
    // hanya pelengkap (selaras dengan `content_html => required` di PostController).
    const validateBeforeSubmit = () => {
        const text = getPlainTextFromHtml(contentHtml);
        if (text.length === 0) {
            setContentError(t("forum.create.err_empty"));
            return false;
        }
        setContentError("");
        return true;
    };

    const tagNames = useMemo(
        () =>
            (tags ?? [])
                .map((t) => normalizeTagName(t.tag_name))
                .filter(Boolean),
        [tags],
    );

    const SUGGESTION_LIMIT = 3;

    const filteredTagSuggestions = useMemo(() => {
        const q = normalizeTagName(tagQuery).toLowerCase();
        if (!tagBoxOpen) return [];

        if (!q) return tagNames.slice(0, SUGGESTION_LIMIT);

        return tagNames
            .filter((t) => t.toLowerCase().includes(q))
            .slice(0, SUGGESTION_LIMIT);
    }, [tagBoxOpen, tagQuery, tagNames]);

    const syncFormatState = () => {
        try {
            setIsBold(Boolean(document.queryCommandState("bold")));
            setIsItalic(Boolean(document.queryCommandState("italic")));
        } catch {}
    };

    const syncHtmlFromDom = () => {
        setContentHtml(editorRef.current?.innerHTML ?? "");
    };

    const hydrateDomFromState = () => {
        if (!editorRef.current) return;
        const current = editorRef.current.innerHTML ?? "";
        if (current !== (contentHtml ?? "")) {
            editorRef.current.innerHTML = contentHtml ?? "";
        }
    };

    useEffect(() => {
        if (!open) return;
        setTimeout(() => {
            hydrateDomFromState();
            editorRef.current?.focus();
            syncFormatState();
        }, 0);
    }, [open]);

    useEffect(() => {
        if (!open || view !== "editor") return;

        const onSel = () => syncFormatState();
        document.addEventListener("selectionchange", onSel);
        return () => document.removeEventListener("selectionchange", onSel);
    }, [open, view]);

    useEffect(() => {
        if (!tagBoxOpen) return;

        const handleClickOutside = (e) => {
            if (tagBoxRef.current && !tagBoxRef.current.contains(e.target)) {
                setTagBoxOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [tagBoxOpen]);

    useEffect(() => {
        if (!tagBoxOpen) return;

        const input = tagInputRef.current;
        if (!input) return;
        const rect = input.getBoundingClientRect();

        setSuggestionStyle({
            position: "fixed",
            left: `${rect.left}px`,
            top: `${rect.bottom + 8}px`,
            width: `${rect.width}px`,
            zIndex: 99999,
        });
    }, [tagBoxOpen]);

    const exec = (cmd) => {
        editorRef.current?.focus();
        document.execCommand(cmd);
        syncHtmlFromDom();
        syncFormatState();
    };

    const handlePickImages = () => fileInputRef.current?.click();

    /**
     * Gambar yang melanggar batas TIDAK ikut masuk ke form — ditolak di sini,
     * bukan dibiarkan lalu gagal saat submit. Yang lolos tetap dilampirkan.
     */
    const handleFiles = (files) => {
        const picked = Array.from(files ?? []);
        if (!picked.length) return;

        const tooBig = picked.filter((f) => f.size > MAX_IMAGE_BYTES);
        const accepted = picked.filter((f) => f.size <= MAX_IMAGE_BYTES);

        const room = Math.max(0, MAX_IMAGES - images.length);
        const fitting = accepted.slice(0, room);

        const messages = [];
        if (tooBig.length) {
            messages.push(
                t("forum.create.err_too_big_files").replace(
                    ":files",
                    tooBig.map((f) => f.name).join(", "),
                ),
            );
        }
        if (accepted.length > room) {
            messages.push(t("forum.create.err_too_many"));
        }
        setImageError(messages.join(" "));

        if (fitting.length) {
            setImages((prev) => [
                ...(prev ?? []),
                ...fitting.map((f) => ({
                    id: `${f.name}_${f.size}_${f.lastModified}_${Math.random()}`,
                    file: f,
                    preview: URL.createObjectURL(f),
                })),
            ]);
        }
    };

    const removeImage = (id) => {
        setImages((prev) => {
            const img = (prev ?? []).find((x) => x.id === id);
            if (img?.preview) {
                try {
                    URL.revokeObjectURL(img.preview);
                } catch {}
            }
            return (prev ?? []).filter((x) => x.id !== id);
        });
    };

    const addChipTag = (name) => {
        const normalized = normalizeTagName(name);
        if (!normalized) return;

        setChipTags((prev) => {
            const exists = (prev ?? []).some(
                (t) => t.toLowerCase() === normalized.toLowerCase(),
            );
            if (exists) return prev ?? [];
            return [...(prev ?? []), normalized];
        });

        setTagQuery("");
        setTagBoxOpen(false);
        setTimeout(() => tagInputRef.current?.focus(), 0);
    };

    const removeChipTag = (name) => {
        setChipTags((prev) =>
            (prev ?? []).filter(
                (t) => t.toLowerCase() !== String(name).toLowerCase(),
            ),
        );
    };

    // Reset seluruh isi editor (dipakai saat modal benar-benar ditutup).
    const resetState = () => {
        images.forEach((x) => {
            try {
                URL.revokeObjectURL(x.preview);
            } catch {}
        });

        setView("editor");
        setDisableComments(false);
        setLocationLabel("");
        setLocationPlace(null);

        setImages([]);
        setContentHtml("");
        setIsBold(false);
        setIsItalic(false);

        setChipTags([]);
        setTagBoxOpen(false);
        setTagQuery("");
        setContentError("");
        setImageError("");

        if (editorRef.current) editorRef.current.innerHTML = "";
    };

    // Tutup manual (tombol X / klik backdrop): serahkan ke parent, biarkan
    // effect di bawah yang mereset isi saat `open` menjadi false. Isi TIDAK
    // direset saat submit gagal (modal tetap terbuka) sehingga input aman.
    const requestClose = () => onClose?.();

    // Reset isi hanya ketika modal benar-benar tertutup (sukses / dibatalkan).
    useEffect(() => {
        if (!open) resetState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999]">
            <div
                className="absolute inset-0 flex items-center justify-center p-4 bg-black/40"
                onClick={(e) => {
                    e.stopPropagation();
                    if (e.target === e.currentTarget) requestClose();
                }}
            >
                <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
                    {/* header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
                        <div className="font-semibold">
                            {view === "editor" ? t("forum.create.title") : t("forum.create.location_title")}
                        </div>
                        <button
                            type="button"
                            onClick={requestClose}
                            className="inline-flex items-center gap-2 text-neutral-700 hover:text-neutral-900"
                        >
                            <FiX />
                            {t("common.cancel")}
                        </button>
                    </div>

                    <div className="flex-1 min-h-0">
                        {view === "editor" ? (
                            <div className="px-6 py-5 h-full overflow-y-auto">
                                <div className="flex gap-4">
                                    <img
                                        src={
                                            user?.public_profile_image ??
                                            "/assets/default-profile.png"
                                        }
                                        alt="avatar"
                                        className="h-12 w-12 rounded-full object-cover"
                                    />

                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-neutral-900">
                                            {user?.full_name ?? t("forum.create.you")}
                                        </div>

                                        {locationLabel ? (
                                            <div className="text-xs text-neutral-500 my-0.5">
                                                <FiMapPin className="inline mr-1" />
                                                {locationLabel}
                                            </div>
                                        ) : null}

                                        <div
                                            ref={editorRef}
                                            contentEditable
                                            suppressContentEditableWarning
                                            className={[
                                                "w-full outline-none",
                                                "text-neutral-700",
                                                "whitespace-pre-wrap break-words",
                                                "min-h-[32px]",
                                                "max-h-30 md:max-h-32 overflow-y-auto",
                                                "py-1 text-sm",
                                            ].join(" ")}
                                            data-placeholder={t("forum.whats_new")}
                                            onInput={() => {
                                                syncHtmlFromDom();
                                                syncFormatState();
                                                if (contentError) setContentError("");
                                            }}
                                            onKeyUp={syncFormatState}
                                            onMouseUp={syncFormatState}
                                            onPaste={(e) => {
                                                e.preventDefault();
                                                const text =
                                                    e.clipboardData.getData(
                                                        "text/plain",
                                                    );
                                                document.execCommand(
                                                    "insertText",
                                                    false,
                                                    text,
                                                );
                                                syncHtmlFromDom();
                                                syncFormatState();
                                            }}
                                        />

                                        <style>{`
                                          [contenteditable][data-placeholder]:empty:before {
                                            content: attr(data-placeholder);
                                            color: #a3a3a3;
                                          }
                                        `}</style>

                                        {displayContentError ? (
                                            <p className="mt-1 mb-2 text-sm text-red-500">
                                                {displayContentError}
                                            </p>
                                        ) : null}

                                        <PreviewMedia
                                            images={images}
                                            onRemove={removeImage}
                                        />

                                        {displayImageError ? (
                                            <p className="mt-1 mb-2 text-sm text-red-500">
                                                {displayImageError}
                                            </p>
                                        ) : null}

                                        {chipTags.length ? (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {chipTags.map((t) => (
                                                    <TagPill
                                                        cursor="default"
                                                        key={t}
                                                        tag={t}
                                                        onRemove={() =>
                                                            removeChipTag(t)
                                                        }
                                                        fontSize="xs"
                                                    />
                                                ))}
                                            </div>
                                        ) : null}

                                        <div
                                            className="relative"
                                            ref={tagBoxRef}
                                        >
                                            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                                                <FiHash className="text-neutral-500" />
                                                <input
                                                    ref={tagInputRef}
                                                    value={tagQuery}
                                                    onChange={(e) => {
                                                        setTagQuery(
                                                            e.target.value.toLowerCase(),
                                                        );
                                                        if (!tagBoxOpen) {
                                                            const input =
                                                                tagInputRef.current;
                                                            if (input) {
                                                                const rect =
                                                                    input.getBoundingClientRect();
                                                                setSuggestionStyle(
                                                                    {
                                                                        position:
                                                                            "fixed",
                                                                        left: `${rect.left}px`,
                                                                        top: `${rect.bottom + 8}px`,
                                                                        width: `${rect.width}px`,
                                                                        zIndex: 99999,
                                                                    },
                                                                );
                                                            }
                                                            setTagBoxOpen(true);
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        const input =
                                                            tagInputRef.current;
                                                        if (input) {
                                                            const rect =
                                                                input.getBoundingClientRect();
                                                            setSuggestionStyle({
                                                                position:
                                                                    "fixed",
                                                                left: `${rect.left}px`,
                                                                top: `${rect.bottom + 8}px`,
                                                                width: `${rect.width}px`,
                                                                zIndex: 99999,
                                                            });
                                                        }
                                                        setTagBoxOpen(true);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            addChipTag(
                                                                tagQuery,
                                                            );
                                                        }
                                                        if (
                                                            e.key === "Escape"
                                                        ) {
                                                            setTagBoxOpen(
                                                                false,
                                                            );
                                                        }
                                                    }}
                                                    className="w-full outline-none text-sm"
                                                    placeholder={t("forum.create.add_tag_ph")}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        addChipTag(tagQuery)
                                                    }
                                                    className="text-xs font-semibold text-primary-700 hover:opacity-80"
                                                >
                                                    {t("forum.create.tag_add")}
                                                </button>
                                            </div>

                                            {tagBoxOpen ? (
                                                <div
                                                    style={suggestionStyle}
                                                    className="max-w-xs rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden max-h-40 z-[99999]"
                                                >
                                                    <div className="max-h-40 overflow-y-auto">
                                                        {filteredTagSuggestions.map(
                                                            (t) => (
                                                                <button
                                                                    key={t}
                                                                    type="button"
                                                                    onMouseDown={(
                                                                        e,
                                                                    ) =>
                                                                        e.preventDefault()
                                                                    }
                                                                    onClick={() =>
                                                                        addChipTag(
                                                                            t,
                                                                        )
                                                                    }
                                                                    className="w-full text-left px-2 py-2 hover:bg-neutral-50 text-xs"
                                                                >
                                                                    #{t}
                                                                </button>
                                                            ),
                                                        )}

                                                        {normalizeTagName(
                                                            tagQuery,
                                                        ) ? (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(
                                                                    e,
                                                                ) =>
                                                                    e.preventDefault()
                                                                }
                                                                onClick={() =>
                                                                    addChipTag(
                                                                        tagQuery,
                                                                    )
                                                                }
                                                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-xs font-medium text-primary-700 border-t border-neutral-100"
                                                            >
                                                                {t("forum.create.create_tag")} “#
                                                                {normalizeTagName(
                                                                    tagQuery,
                                                                )}
                                                                ”
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* Toolbar */}
                                        <div className="mt-4 flex items-center gap-2 text-neutral-700">
                                            <IconButton
                                                label={t("forum.create.upload_image")}
                                                onClick={handlePickImages}
                                            >
                                                <FiImage className="text-xl" />
                                            </IconButton>

                                            <IconButton
                                                label={t("forum.create.location_title")}
                                                onClick={() => {
                                                    syncHtmlFromDom();
                                                    setTagBoxOpen(false);
                                                    setView("location");
                                                }}
                                            >
                                                <FiMapPin className="text-xl" />
                                            </IconButton>

                                            <IconButton
                                                label={t("forum.create.italic")}
                                                onClick={() => exec("italic")}
                                                className={
                                                    isItalic
                                                        ? "bg-neutral-900 text-white hover:bg-neutral-900"
                                                        : ""
                                                }
                                            >
                                                <FiItalic className="text-xl" />
                                            </IconButton>

                                            <IconButton
                                                label={t("forum.create.bold")}
                                                onClick={() => exec("bold")}
                                                className={
                                                    isBold
                                                        ? "bg-neutral-900 text-white hover:bg-neutral-900"
                                                        : ""
                                                }
                                            >
                                                <FiBold className="text-xl" />
                                            </IconButton>

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    handleFiles(e.target.files);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <LocationSearchModal
                                onBack={() => {
                                    setView("editor");
                                    setTimeout(() => {
                                        hydrateDomFromState();
                                        editorRef.current?.focus();
                                        syncFormatState();
                                    }, 0);
                                }}
                                onSelectLocation={(place) => {
                                    setLocationPlace(place);
                                    setLocationLabel(
                                        place?.display_name ??
                                            place?.name ??
                                            "",
                                    );
                                    setView("editor");
                                    setTimeout(() => {
                                        hydrateDomFromState();
                                        editorRef.current?.focus();
                                        syncFormatState();
                                    }, 0);
                                }}
                            />
                        )}
                    </div>

                    {/* footer */}
                    {view === "editor" ? (
                        <div className="border-t border-neutral-200 shrink-0">
                            <div className="px-6 py-4 flex items-center justify-between">
                                <Toggle
                                    id="disable-comments"
                                    name="disable-comments"
                                    checked={disableComments}
                                    onChange={(next) => setDisableComments(next)}
                                    label={t("forum.create.disable_comments")}
                                />

                                <Button
                                    htmlType="button"
                                    onClick={() => {
                                        if (processing) return;

                                        if (!validateBeforeSubmit()) return;

                                        const content_text =
                                            getPlainTextFromHtml(contentHtml);

                                        // Kirim ke parent. Modal TIDAK ditutup di sini —
                                        // parent menutup saat sukses; saat gagal modal tetap
                                        // terbuka dan error server ditampilkan.
                                        onSubmit?.({
                                            content_html: contentHtml,
                                            content_text,
                                            location: locationLabel,
                                            location_place: locationPlace
                                                ? JSON.stringify({
                                                      provider: "osm",
                                                      id: locationPlace.id,
                                                      display_name:
                                                          locationPlace.display_name ??
                                                          locationLabel,
                                                      name:
                                                          locationPlace.name ??
                                                          null,
                                                      lat:
                                                          locationPlace.lat ?? null,
                                                      lng:
                                                          locationPlace.lng ?? null,
                                                      address:
                                                          locationPlace.address ??
                                                          null,
                                                      raw:
                                                          locationPlace.raw ?? null,
                                                  })
                                                : null,
                                            allows_comment: !disableComments,
                                            images: images.map((x) => x.file),
                                            tag_names: chipTags,
                                        });
                                    }}
                                    type="neutral"
                                    variant="outline"
                                    rounded
                                    className={[
                                        "px-10",
                                        processing ? "opacity-60 cursor-wait pointer-events-none" : "",
                                    ].join(" ")}
                                >
                                    {processing ? t("common.processing") : t("forum.post")}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
