import React from "react";
import Input from "@/Components/Input";
import TagPillList from "./TagPillList";
import { useTranslation } from "@/lib/useTranslation";
import { FiChevronDown, FiSearch } from "react-icons/fi";

export default function ForumFilterAccordion({ tags = [], onTagClick }) {
    const { t } = useTranslation();
    return (
        <div className="lg:hidden mb-6">
            <details className="group rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-sm font-semibold text-neutral-800">
                    <span>{t("forum.filter_search")}</span>
                    <FiChevronDown className="text-lg transition-transform duration-200 group-open:rotate-180" />
                </summary>

                <div className="border-t border-neutral-200 p-4 space-y-4">
                    <Input
                        placeholder={t("lb.search_ph")}
                        leftIcon={<FiSearch />}
                    />

                    <TagPillList tags={tags} onTagClick={onTagClick} />
                </div>
            </details>
        </div>
    );
}
