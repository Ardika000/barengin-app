import React from "react";

export default function IconButton({
    label,
    onClick,
    children,
    disabled,
    className = "",
    type = "button",
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={[
                "relative group inline-flex items-center justify-center",
                "h-10 w-10 rounded-lg hover:bg-neutral-100 transition",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className,
            ].join(" ")}
            aria-label={label}
        >
            {children}

            {/* tooltip */}
            {label ? (
                <span
                    className={[
                        "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2",
                        "whitespace-nowrap rounded-md bg-neutral-900 text-white text-xs",
                        "px-2 py-1 opacity-0 group-hover:opacity-100 transition after:h-2 after:w-2 after:absolute after:left-1/2 after:-translate-x-1/2 after:top-full after:bg-neutral-900 after:rotate-45 after:-translate-y-1/2",
                    ].join(" ")}
                >
                    {label}
                </span>
            ) : null}
        </button>
    );
}
