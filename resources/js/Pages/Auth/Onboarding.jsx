import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { FiChevronDown } from "react-icons/fi";
import Button from "@/Components/Button.jsx";
import Input from "@/Components/Input.jsx";
import Select from "@/Components/Select.jsx";
import MainLayout from "@/Layouts/MainLayout.jsx";
import { useTranslation } from "@/lib/useTranslation";

// Nomor HP Indonesia (bagian lokal setelah +62): mulai 8, total 9–13 digit.
// Selaras dengan regex backend OnboardingController: ^(?:\+62|62|0)?8\d{8,12}$.
const ID_PHONE_LOCAL = /^8\d{8,12}$/;

export default function Onboarding({ user }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        full_name: user?.full_name || "",
        phone: "",
        gender: "",
        birth_date: "",
    });
    const [phoneError, setPhoneError] = useState("");

    // Validasi format nomor HP lokal (abaikan spasi). Kosong = boleh (opsional).
    const validatePhone = (value) => {
        const digits = (value || "").replace(/\D/g, "");
        if (digits === "") return "";
        return ID_PHONE_LOCAL.test(digits) ? "" : t("auth.onboard.phone_invalid");
    };

    const submit = (e) => {
        e.preventDefault();
        const err = validatePhone(data.phone);
        setPhoneError(err);
        if (err) return;
        post("/onboarding");
    };

    const skip = (e) => {
        e.preventDefault();
        post("/onboarding/complete");
    };

    return (
        <div className="min-h-screen w-full bg-white">
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                {/* LEFT */}
                <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
                    <div className="w-full max-w-[480px]">
                        <a href="/" className="block">
                            <img
                                src="/assets/barengin_logows.png"
                                alt="barengin logo"
                                className="h-12 mx-auto"
                            />
                        </a>

                        <h1 className="mt-4 text-center text-xl font-semibold tracking-tight text-neutral-700">
                            {t("auth.onboard.title")}
                        </h1>

                        <p className="mt-1 pb-8 text-center text-sm text-neutral-600 border-b border-neutral-400">
                            {t("auth.onboard.subtitle")}
                        </p>

                        <form onSubmit={submit} className="mt-8 space-y-4">
                            <Input
                                id="full_name"
                                type="text"
                                label={t("auth.onboard.full_name")}
                                value={data.full_name}
                                onChange={(e) =>
                                    setData("full_name", e.target.value)
                                }
                                placeholder={t("auth.onboard.full_name_ph")}
                                error={errors.full_name}
                                size="md"
                            />

                            <Input
                                id="phone"
                                type="text"
                                inputMode="numeric"
                                label={t("auth.onboard.phone")}
                                leftAddon="+62"
                                value={data.phone}
                                onChange={(e) => {
                                    setData("phone", e.target.value);
                                    if (phoneError) setPhoneError(validatePhone(e.target.value));
                                }}
                                onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
                                placeholder="810 0000 0000"
                                error={errors.phone || phoneError}
                            />

                            <Select
                                id="gender"
                                label={t("auth.onboard.gender")}
                                value={data.gender}
                                onChange={(e) =>
                                    setData("gender", e.target.value)
                                }
                                error={errors.gender}
                            >
                                <option value="">{t("auth.onboard.gender_select")}</option>
                                <option value="male">{t("auth.onboard.male")}</option>
                                <option value="female">{t("auth.onboard.female")}</option>
                            </Select>

                            <Input
                                id="birth_date"
                                type="date"
                                label={t("auth.onboard.birth_date")}
                                value={data.birth_date}
                                onChange={(e) =>
                                    setData("birth_date", e.target.value)
                                }
                                error={errors.birth_date}
                                size="md"
                                inputClassName="text-neutral-700"
                            />

                            <Button
                                type="primary"
                                variant="solid"
                                className="w-full mt-2"
                                disabled={processing}
                            >
                                {processing ? t("common.processing") : t("auth.onboard.continue")}
                            </Button>

                            <Button
                                type="neutral"
                                variant="outline"
                                htmlType="button"
                                className="w-full"
                                onClick={skip}
                                disabled={processing}
                            >
                                {t("auth.onboard.skip")}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="sticky hidden lg:block max-h-screen top-0">
                    <img
                        src="/assets/auth/hero-onboarding.png"
                        alt="Onboarding Hero"
                        className="h-screen w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 bottom-0" />

                    <div className="absolute bottom-12 left-12 right-12 text-white">
                        <h2 className="text-3xl font-semibold leading-tight xl:text-4xl max-w-[680px]">
                            {t("auth.hero.title")}
                        </h2>
                        <p className="mt-4 max-w-[680px] text-base leading-relaxed text-white/95">
                            {t("auth.hero.subtitle")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

Onboarding.layout = (page) => <MainLayout>{page}</MainLayout>;
