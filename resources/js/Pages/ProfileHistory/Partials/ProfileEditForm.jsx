import { useForm } from "@inertiajs/react";
import Button from "@/Components/Button";
import AvatarEditor from "./AvatarEditor";

export default function ProfileEditForm({ profile, onCancel }) {
    const { data, setData, put, processing, errors } = useForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        email: profile.email || "",
        phone: profile.phone ? profile.phone.replace(/^\+62/, "") : "",
        gender: profile.gender || "silent",
        bio: profile.bio || "",
        birth_date: profile.birth_date || "",
    });

    function handleSubmit(e) {
        e.preventDefault();
        put("/profile-history", {
            preserveScroll: true,
            onSuccess: onCancel,
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            <AvatarEditor profile={profile} />

            <p className="mt-4 text-xs text-neutral-400">
                Klik ikon pena untuk mengubah foto profil
            </p>

            <div className="mt-5 space-y-4">
                <Field label="Nama Lengkap" error={errors.full_name}>
                    <input
                        type="text"
                        value={data.full_name}
                        onChange={(e) => setData("full_name", e.target.value)}
                        className={inputClass(errors.full_name)}
                    />
                </Field>

                <Field label="Username" error={errors.username}>
                    <input
                        type="text"
                        value={data.username}
                        onChange={(e) => setData("username", e.target.value)}
                        className={inputClass(errors.username)}
                    />
                </Field>

                <Field label="Jenis Kelamin" error={errors.gender}>
                    <select
                        value={data.gender}
                        onChange={(e) => setData("gender", e.target.value)}
                        className={inputClass(errors.gender)}
                    >
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                        <option value="silent">Tidak disebutkan</option>
                    </select>
                </Field>

                <Field label="Bio" error={errors.bio}>
                    <textarea
                        rows={3}
                        value={data.bio}
                        onChange={(e) => setData("bio", e.target.value)}
                        className={inputClass(errors.bio) + " resize-none"}
                    />
                </Field>

                <Field label="Email" error={errors.email}>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        className={inputClass(errors.email)}
                    />
                </Field>

                <Field label="Nomor Telepon" error={errors.phone}>
                    <div className="flex">
                        <span className="inline-flex items-center rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-sm text-neutral-500">
                            +62
                        </span>
                        <input
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData("phone", e.target.value)}
                            className={
                                inputClass(errors.phone) + " rounded-l-none"
                            }
                            placeholder="8123456789"
                        />
                    </div>
                </Field>

                <Field label="Tanggal Lahir" error={errors.birth_date}>
                    <input
                        type="date"
                        value={data.birth_date}
                        onChange={(e) => setData("birth_date", e.target.value)}
                        className={inputClass(errors.birth_date)}
                    />
                </Field>
            </div>

            <div className="mt-6 flex flex-col gap-2">
                <Button
                    type="primary"
                    variant="solid"
                    size="sm"
                    className="w-full"
                    disabled={processing}
                >
                    {processing ? "Menyimpan..." : "Simpan Profil"}
                </Button>
                <Button
                    type="neutral"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onCancel}
                >
                    Batal
                </Button>
            </div>
        </form>
    );
}

function inputClass(error) {
    return [
        "w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition-colors",
        "focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
        error ? "border-danger-400" : "border-neutral-300",
    ].join(" ");
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                {label}
            </label>
            {children}
            {error && (
                <p className="mt-1 text-xs text-danger-600">{error}</p>
            )}
        </div>
    );
}
