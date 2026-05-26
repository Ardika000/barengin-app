import React, { useMemo } from "react";
import { Link, usePage } from "@inertiajs/react";
import { FiHome, FiSearch, FiPlus, FiUser } from "react-icons/fi";

function Tooltip({ label }) {
    return (
        <span
            className={[
                "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2",
                "whitespace-nowrap rounded-md bg-neutral-900 text-white text-xs",
                "px-2 py-1 opacity-0 group-hover:opacity-100 transition after:h-2 after:w-2 after:absolute after:left-1/2 after:-translate-x-1/2 after:top-full after:bg-neutral-900 after:rotate-45 after:-translate-y-1/2",
            ].join(" ")}
        >
            {label}
        </span>
    );
}

function NavIconLink({ icon, href = "#", active = false, label }) {
    return (
        <Link
            href={href}
            aria-label={label}
            className={[
                "relative group h-12 w-12 rounded-xl flex items-center justify-center transition",
                active
                    ? "bg-primary-700 text-white shadow-sm"
                    : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100",
            ].join(" ")}
        >
            <span className="text-xl">{icon}</span>
            {label ? <Tooltip label={label} /> : null}
        </Link>
    );
}

function NavIconButton({ icon, onClick, active = false, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={[
                "relative group h-12 w-12 rounded-xl flex items-center justify-center transition",
                active
                    ? "bg-primary-700 text-white shadow-sm"
                    : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100",
            ].join(" ")}
        >
            <span className="text-xl">{icon}</span>
            {label ? <Tooltip label={label} /> : null}
        </button>
    );
}

export default function ForumSideNav({
    onCreatePost,
    onFindPeople,
    isFindPeopleOpen = false,
    isCreatePostOpen = false,
}) {
    const { url } = usePage();

    const activeKey = useMemo(() => {
        const u = url ?? "";

        if (isFindPeopleOpen) return "search";
        if (isCreatePostOpen) return "create";

        if (u.startsWith("/forum/profile") || u.startsWith("/forum/users/")) {
            return "profile";
        }

        if (u.startsWith("/forum")) {
            return "home";
        }

        return "home";
    }, [url, isFindPeopleOpen, isCreatePostOpen]);

    return (
        <>
            {/* desktop left menu */}
            <div className="hidden lg:block fixed left-0 top-0 h-full w-28 bg-white border-r border-neutral-200">
                <div className="flex flex-col items-center gap-4 py-6 justify-center h-full">
                    <NavIconLink
                        icon={<FiHome />}
                        href="/forum"
                        label="Home"
                        active={activeKey === "home"}
                    />

                    <NavIconButton
                        icon={<FiSearch />}
                        label="Find People"
                        active={activeKey === "search"}
                        onClick={() => onFindPeople?.()}
                    />

                    <NavIconButton
                        icon={<FiPlus />}
                        label="Create"
                        active={activeKey === "create"}
                        onClick={() => onCreatePost?.()}
                    />

                    <NavIconLink
                        icon={<FiUser />}
                        href="/forum/profile"
                        label="Profile"
                        active={activeKey === "profile"}
                    />
                </div>
            </div>

            {/* mobile bottom nav */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200">
                <div className="px-4 py-3 flex items-center justify-around">
                    <NavIconLink
                        icon={<FiHome />}
                        href="/forum"
                        label="Home"
                        active={activeKey === "home"}
                    />

                    <NavIconButton
                        icon={<FiSearch />}
                        label="Find People"
                        active={activeKey === "search"}
                        onClick={() => onFindPeople?.()}
                    />

                    <NavIconButton
                        icon={<FiPlus />}
                        label="Create"
                        active={activeKey === "create"}
                        onClick={() => onCreatePost?.()}
                    />

                    <NavIconLink
                        icon={<FiUser />}
                        href="/forum/profile"
                        label="Profile"
                        active={activeKey === "profile"}
                    />
                </div>
            </div>
        </>
    );
}
