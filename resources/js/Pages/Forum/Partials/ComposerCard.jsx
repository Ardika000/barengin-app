import React from "react";
import Button from "@/Components/Button";
import { useTranslation } from "@/lib/useTranslation";

export default function ComposerCard({ avatar, onOpen }) {
    const { t } = useTranslation();
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
            <div className="p-5">
                <div className="flex items-center gap-4">
                    <img
                        src={avatar}
                        alt="User avatar"
                        className="h-10 w-10 rounded-full object-cover"
                    />

                    <div className="flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={onOpen}
                            className="flex-1 text-left p-0 text-neutral-500 cursor-text w-full flex items-center"
                        >
                            {t("forum.whats_new")}
                        </button>

                        {/* mobile */}
                        <div className="mt-4 sm:hidden">
                            <Button
                                onClick={onOpen}
                                type="neutral"
                                variant="outline"
                                rounded={true}
                                className="w-full h-12"
                            >
                                {t("forum.post")}
                            </Button>
                        </div>
                    </div>

                    {/* desktop */}
                    <div className="hidden sm:block">
                        <Button
                            onClick={onOpen}
                            type="neutral"
                            variant="outline"
                            rounded={true}
                            className="px-10"
                        >
                            {t("forum.post")}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border-t border-neutral-200" />
        </div>
    );
}
