import { Link, usePage } from "@inertiajs/react";

// Menandai apakah `href` cocok dengan lokasi saat ini. Untuk "/" harus sama
// persis; selain itu cocok bila path sama atau berada di bawahnya (mis. /jastip
// aktif juga di /jastip/123) tanpa keliru mencocokkan /jastip-xyz.
export function isNavActive(url, href) {
    const path = url.split("?")[0].split("#")[0];
    if (href === "/") return path === "/";
    return path === href || path.startsWith(href + "/");
}

// Pisahkan href jadi { path, tab } — untuk item dropdown yang path-nya sama tapi
// dibedakan lewat ?tab= (mis. /profile-history vs /profile-history?tab=settings).
export function splitHref(href) {
    const [path, query] = String(href || "").split("?");
    return { path, tab: new URLSearchParams(query || "").get("tab") };
}

// Versi tab-aware untuk item dalam dropdown. `claimedTabs` = daftar tab yang
// dimiliki item lain di dropdown yang sama; item tanpa tab tidak ikut nyala saat
// salah satu tab milik item lain sedang aktif.
export function isDropdownItemActive(url, href, claimedTabs = []) {
    const path = url.split("?")[0].split("#")[0];
    const currentTab = new URLSearchParams(url.split("?")[1] || "").get("tab");
    const { path: targetPath, tab } = splitHref(href);
    const pathMatch =
        targetPath === "/"
            ? path === "/"
            : path === targetPath || path.startsWith(targetPath + "/");
    if (!pathMatch) return false;
    if (tab) return currentTab === tab;
    return !currentTab || !claimedTabs.includes(currentTab);
}

export default function NavLink({ href, children }) {
    const { url } = usePage();
    const active = isNavActive(url, href);

    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
                "font-medium transition-colors",
                active
                    ? "text-primary-700"
                    : "text-neutral-600 hover:text-primary-700",
            ].join(" ")}
        >
            {children}
        </Link>
    );
}
