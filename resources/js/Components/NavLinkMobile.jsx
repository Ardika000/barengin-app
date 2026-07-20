import { Link, usePage } from "@inertiajs/react";
import { isNavActive } from "@/Components/NavLink.jsx";

export default function NavLinkMobile({ href, children, onClick }) {
    const { url } = usePage();
    const active = isNavActive(url, href);

    return (
        <Link
            href={href}
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            className={[
                "block px-3 py-3 rounded-md text-base font-medium transition-colors",
                active
                    ? "text-primary-700 bg-primary-50"
                    : "text-neutral-600 hover:text-primary-700 hover:bg-neutral-50",
            ].join(" ")}
        >
            {children}
        </Link>
    );
}
