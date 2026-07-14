import { Link } from "@inertiajs/react";
export default function NavLinkMobile({ href, children, onClick }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="block px-3 py-3 rounded-md text-base font-medium text-neutral-600 hover:text-primary-700 hover:bg-neutral-50 transition-colors"
        >
            {children}
        </Link>
    );
}
