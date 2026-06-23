import { FaEnvelope, FaPhoneAlt, FaRegCalendarAlt } from "react-icons/fa";
import Button from "@/Components/Button";
import AvatarEditor from "./AvatarEditor";

export default function ProfileSidebar({ profile, onEdit }) {
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
