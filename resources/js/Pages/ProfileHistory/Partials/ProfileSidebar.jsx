import { FaEnvelope, FaPhoneAlt, FaRegCalendarAlt, FaFire } from "react-icons/fa";
import { MdVerified } from "react-icons/md";
import { usePage } from "@inertiajs/react";
import Button from "@/Components/Button";
import AvatarEditor from "./AvatarEditor";
import { useTranslation } from "@/lib/useTranslation";

export default function ProfileSidebar({ profile, onEdit }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const streak = auth?.user?.streak_count ?? 0;
    const streakBest = auth?.user?.streak_best ?? 0;

    return (
        <div className="flex flex-col">
            <AvatarEditor profile={profile} />

            <div className="mt-6">
                <h1 className="flex items-center gap-1.5 text-3xl font-bold text-neutral-900">
                    <span>{profile.full_name}</span>
                    {profile.verified && (
                        <MdVerified
                            className="size-6 shrink-0 text-primary-600"
                            title={t("ph.verified_account")}
                        />
                    )}
                </h1>
                <p className="mt-1 text-neutral-500">
                    {profile.username}
                    {profile.pronouns ? ` - ${profile.pronouns}` : ""}
                </p>
            </div>

            <div className="mt-4 flex items-center gap-5 text-sm">
                <span className="text-neutral-700">
                    <span className="font-bold text-neutral-900">
                        {profile.followers_count}
                    </span>{" "}
                    {t("forum.followers")}
                </span>
                <span className="text-neutral-700">
                    <span className="font-bold text-neutral-900">
                        {profile.following_count}
                    </span>{" "}
                    {t("forum.following")}
                </span>
            </div>

            {profile.bio && (
                <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                    {profile.bio}
                </p>
            )}

            <Button
                type="primary"
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="mt-5 w-full"
            >
                {t("ph.edit_profile")}
            </Button>

            {/* Streak Nyala */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                    <FaFire size={22} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-700/80">
                        {t("ph.streak_label")}
                    </p>
                    <p className="text-lg font-bold leading-tight text-neutral-700 mt-1">
                        {streak} {t("ph.streak_unit")}{" "}
                        <span className="text-sm font-medium text-neutral-500">
                            {t("ph.streak_streak")}
                        </span>
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                        {t("ph.streak_best")}{" "}
                        <span className="font-semibold text-neutral-600">
                            {streakBest} {t("ph.streak_unit")}
                        </span>
                    </p>
                </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-neutral-600">
                <li className="flex items-center gap-3">
                    <FaEnvelope className="h-4 w-4 shrink-0 text-neutral-400" />
                    <span className="truncate">{profile.email}</span>
                </li>
                {profile.phone && (
                    <li className="flex items-center gap-3">
                        <FaPhoneAlt className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span>{profile.phone}</span>
                    </li>
                )}
                {profile.birth_date_label && (
                    <li className="flex items-center gap-3">
                        <FaRegCalendarAlt className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span>{profile.birth_date_label}</span>
                    </li>
                )}
            </ul>
        </div>
    );
}
