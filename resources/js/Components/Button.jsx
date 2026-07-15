import { Link } from "@inertiajs/react";

export default function Button({
    isButtonLink = false,
    href = "",
    type = "primary", // primary | danger | success | warning | neutral
    variant = "solid", // solid | outline | soft | ghost
    size = "md", // xs | sm | md
    rounded = true, // keep your old API
    className = "",
    onClick = () => {},
    htmlType, // native button type: "button" | "submit" | "reset".
    //          Default undefined preserves the browser default (submit inside a form).
    children,
    ...props
}) {
    const sizeClass =
        size === "xs" ? "px-3.5 py-1.5 text-xs" : size === "sm" ? "px-5 py-2.5 text-sm" : "px-7 py-3 text-sm";

    const roundedClass = rounded ? "rounded-full" : "";

    // Static maps (best for Tailwind compilation)
    const solid = {
        primary: "bg-primary-700 text-white",
        danger: "bg-danger-700 text-white",
        success: "bg-success-700 text-white",
        warning: "bg-warning-700 text-white",
        neutral: "bg-neutral-700 text-white",
    };

    const outline = {
        primary: "bg-white text-primary-700 border border-primary-700",
        danger: "bg-white text-danger-700 border border-danger-700",
        success: "bg-white text-success-700 border border-success-700",
        warning: "bg-white text-warning-700 border border-warning-700",
        neutral: "bg-white text-neutral-700 border border-neutral-400",
    };

    const soft = {
        primary: "bg-primary-50 text-primary-700",
        danger: "bg-danger-50 text-danger-700",
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        neutral: "bg-neutral-100 text-neutral-700",
    };

    const ghost = {
        primary: "bg-transparent text-primary-700",
        danger: "bg-transparent text-danger-700",
        success: "bg-transparent text-success-700",
        warning: "bg-transparent text-warning-700",
        neutral: "bg-transparent text-neutral-700",
    };

    const variantMap = { solid, outline, soft, ghost };
    const colorMap = variantMap[variant] || solid;

    const classes = [
        "inline-flex items-center justify-center font-medium cursor-pointer",
        "transition-opacity duration-200 hover:opacity-80", // <- your hover rule
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2",
        sizeClass,
        roundedClass,
        colorMap[type] || colorMap.primary,
        className,
    ].join(" ");

    if (isButtonLink) {
        return (
            <Link href={href} className={classes} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button type={htmlType} onClick={onClick} className={classes} {...props}>
            {children}
        </button>
    );
}
