import { useEffect, useRef } from "react";
import { Link, usePage } from "@inertiajs/react";
import { FaChevronDown } from "react-icons/fa";
import { isDropdownItemActive, splitHref } from "@/Components/NavLink.jsx";

export default function NavDropdown({
    label,
    items = [],
    isOpen,
    onToggle,
    onClose = () => {},
    onNavigate = () => {},
    align = "left",
    className = "",

    // Sorot label saat salah satu rute anaknya sedang aktif.
    isActive = false,

    // Custom trigger (e.g. avatar)
    trigger = null,
    showChevron = true,

    // Consistent sizing
    menuWidthClass = "w-80",

    // NEW: consistent separators
    withDividers = true,
}) {
    const rootRef = useRef(null);

    const { url } = usePage();
    // Tab yang secara eksplisit dimiliki item lain (mis. "settings"). Item tanpa
    // tab tidak boleh ikut nyala saat salah satu tab milik item lain sedang aktif.
    const claimedTabs = items
        .map((item) => splitHref(item.href).tab)
        .filter(Boolean);

    const isItemActive = (item) =>
        item.as !== "button" && // aksi (Keluar), bukan tujuan
        isDropdownItemActive(url, item.href, claimedTabs);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e) => {
            const el = rootRef.current;
            if (!el) return;
            if (!el.contains(e.target)) onClose();
        };

        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    const MenuItem = ({ item }) => {
        const Icon = item.icon;
        const active = isItemActive(item);

        const rowClass =
            "w-full flex items-center gap-3 px-5 py-4 text-left text-base font-medium transition-colors " +
            (active
                ? "bg-primary-50 text-primary-700"
                : "text-neutral-600 hover:bg-primary-50 hover:text-primary-700");

        // POST / button-like (Logout)
        if (item.as === "button") {
            return (
                <Link
                    href={item.href}
                    method={item.method || "post"}
                    as="button"
                    onClick={() => {
                        onNavigate();
                        onClose();
                        item.onClick?.();
                    }}
                    className={rowClass + ' cursor-pointer'}
                >
                    {Icon ? (
                        <Icon className="w-5 h-5 text-current shrink-0" />
                    ) : null}
                    <span>{item.label}</span>
                </Link>
            );
        }

        // Normal link
        return (
            <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                    onNavigate();
                    onClose();
                    item.onClick?.();
                }}
                className={rowClass}
            >
                {Icon ? (
                    <Icon className="w-5 h-5 text-current shrink-0" />
                ) : null}
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <div ref={rootRef} className={["relative", className].join(" ")}>
            {/* Trigger */}
            {trigger ? (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    className="focus:outline-none rounded-full focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
                >
                    {trigger}
                </button>
            ) : (
                <button
                    type="button"
                    className={[
                        "cursor-pointer font-medium transition-colors flex items-center gap-2 focus:outline-none",
                        isOpen || isActive
                            ? "text-primary-700"
                            : "text-neutral-600 hover:text-primary-700",
                    ].join(" ")}
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                >
                    {label}
                    {showChevron && (
                        <FaChevronDown
                            className={[
                                "text-current transition-transform duration-200",
                                isOpen ? "rotate-180" : "",
                            ].join(" ")}
                        />
                    )}
                </button>
            )}

            {/* Menu */}
            {isOpen && (
                <div
                    className={[
                        "absolute mt-3 rounded-xl shadow-lg bg-white border border-neutral-100 z-50 overflow-hidden",
                        menuWidthClass,
                        align === "right" ? "right-0" : "left-0",
                    ].join(" ")}
                    role="menu"
                >
                    <div>
                        {items.map((item, idx) => (
                            <div
                                key={
                                    item.key ||
                                    item.href ||
                                    `${item.label}-${idx}`
                                }
                            >
                                <MenuItem item={item} />

                                {/* Divider between items */}
                                {withDividers && idx !== items.length - 1 && (
                                    <div className="h-px bg-neutral-200" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
