import React, { useMemo, useState } from "react";
import TagPill from "./TagPill";

export default function TagPillList({
    tags = [],
    onTagClick,
    initialCount = 10,
    step = 10,
    fontSize="xs",
}) {
    const [visibleCount, setVisibleCount] = useState(initialCount);

    const canExpand = tags.length > visibleCount;
    const isExpandedFully = visibleCount >= tags.length;

    const visibleTags = useMemo(
        () => tags.slice(0, Math.min(visibleCount, tags.length)),
        [tags, visibleCount],
    );

    const remaining = Math.max(tags.length - visibleCount, 0);

    return (
        <div className="flex flex-wrap gap-3">

            {visibleTags.map((t) => (
                <TagPill key={t} tag={t} onClick={() => onTagClick?.(t)} fontSize={fontSize} cursor="pointer" />
            ))}

            {tags.length > initialCount ? (
                <button
                    type="button"
                    onClick={() => {
                        if (isExpandedFully) {
                            setVisibleCount(initialCount);
                        } else {
                            setVisibleCount((c) =>
                                Math.min(c + step, tags.length),
                            );
                        }
                    }}
                    className={[
                        "inline-flex items-center gap-2",
                        "rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5",
                        `text-${fontSize} font-semibold text-neutral-700`,
                        "hover:bg-neutral-50 transition",
                        "whitespace-nowrap",
                    ].join(" ")}
                >
                    {isExpandedFully ? (
                        "Tutup"
                    ) : (
                        <>
                            <span className="text-neutral-500">+</span>
                            <span>
                                {remaining > step ? step : remaining} Lihat lagi
                            </span>
                        </>
                    )}
                </button>
            ) : null}
        </div>
    );
}
