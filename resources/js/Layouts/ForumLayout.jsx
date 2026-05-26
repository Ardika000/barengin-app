import React, { createContext, useContext, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";

import MainLayout from "@/Layouts/MainLayout";
import ForumSideNav from "@/Pages/Forum/Partials/ForumSideNav";
import CreatePostModal from "@/Pages/Forum/Partials/CreatePostModal";
import UserListModal from "@/Pages/Forum/Partials/UserListModal";

const ForumComposerContext = createContext(null);

export function useForumComposer() {
    const ctx = useContext(ForumComposerContext);
    if (!ctx) {
        throw new Error("useForumComposer must be used within <ForumLayout>.");
    }
    return ctx;
}

export default function ForumLayout({ children, tags = [], afterCreate }) {
    const user = usePage().props.auth?.user;

    const [openCreatePost, setOpenCreatePost] = useState(false);
    const [openPeople, setOpenPeople] = useState(false);

    const safeTags = useMemo(() => tags ?? [], [tags]);

    const composer = useMemo(
        () => ({
            open: () => setOpenCreatePost(true),
            close: () => setOpenCreatePost(false),
            isOpen: openCreatePost,
        }),
        [openCreatePost],
    );

    const submitCreatePost = (payload) => {
        const fd = new FormData();

        fd.append("content_html", payload.content_html ?? "");
        fd.append("allows_comment", payload.allows_comment ? "1" : "0");

        if (payload.location) fd.append("location", payload.location);

        if (payload.location_place) {
            fd.append("location_place", payload.location_place);
        }

        (payload.images ?? []).forEach((file) => fd.append("images[]", file));
        (payload.tag_names ?? []).forEach((t) => fd.append("tag_names[]", t));

        router.post("/forum/posts", fd, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setOpenCreatePost(false);
                afterCreate?.();
            },
        });
    };

    return (
        <MainLayout>
            <ForumComposerContext.Provider value={composer}>
                <div className="bg-white lg:pl-28">
                    <ForumSideNav
                        onFindPeople={() => setOpenPeople(true)}
                        onCreatePost={() => setOpenCreatePost(true)}
                        onFindPeople={() => setOpenPeople(true)}
                        isCreatePostOpen={openCreatePost}
                        isFindPeopleOpen={openPeople}
                    />

                    {children}

                    <div className="h-24 lg:hidden" />

                    <CreatePostModal
                        open={openCreatePost}
                        onClose={() => setOpenCreatePost(false)}
                        user={user}
                        tags={safeTags}
                        onSubmit={submitCreatePost}
                    />

                    <UserListModal
                        open={openPeople}
                        onClose={() => setOpenPeople(false)}
                    />
                </div>
            </ForumComposerContext.Provider>
        </MainLayout>
    );
}
