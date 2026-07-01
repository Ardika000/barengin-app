import { FaEnvelope, FaPhoneAlt, FaRegCalendarAlt, FaFire } from "react-icons/fa";
import { usePage } from "@inertiajs/react";
import Button from "@/Components/Button";
import AvatarEditor from "./AvatarEditor";

export default function ProfileSidebar({ profile, onEdit }) {
    const { auth } = usePage().props;
    const streak = auth?.user?.streak_count ?? 0;
    const streakBest = auth?.user?.streak_best ?? 0;

    return (
        <div className="flex flex-col">
            <AvatarEditor profile={profile} />

            <div className="mt-6">
                <h1 className="text-3xl font-bold text-neutral-900">
                    {profile.full_name}
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
                    Pengikut
                </span>
                <span className="text-neutral-700">
                    <span className="font-bold text-neutral-900">
                        {profile.following_count}
                    </span>{" "}
                    Mengikuti
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
                Edit Profile
            </Button>

            {/* Streak Nyala */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                    <FaFire size={22} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-700/80">
                        Nyala Harian
                    </p>
                    <p className="text-lg font-bold leading-tight text-neutral-900">
                        {streak} hari{" "}
                        <span className="text-sm font-medium text-neutral-500">
                            beruntun
                        </span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                        Rekor terbaikmu:{" "}
                        <span className="font-semibold text-neutral-700">
                            {streakBest} hari
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
