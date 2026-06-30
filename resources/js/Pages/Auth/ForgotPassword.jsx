import { Link, useForm } from "@inertiajs/react";
import Button from "@/Components/Button.jsx";
import Input from "@/Components/Input.jsx";
import MainLayout from "@/Layouts/MainLayout.jsx";
import { FaArrowLeft } from "react-icons/fa";

export default function ForgotPassword() {
    const { data, setData, post, processing, errors } = useForm({
        email: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/forgot-password");
    };

    const resend = (e) => {
        e.preventDefault();
        post("/forgot-password/resend");
    };

    return (
        <div className="min-h-screen w-full bg-white">
            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
                {/* LEFT */}
                <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
                    <div className="w-full max-w-[480px]">
                        <Link href="/" className="block">
                            <img
                                src="/assets/barengin_logows.png"
                                alt="barengin logo"
                                className="h-12 mx-auto"
                            />
                        </Link>

                        <h1 className="mt-4 text-center text-xl font-semibold tracking-tight text-neutral-700">
                            Lupa Password?
                        </h1>

                        <p className="mt-2 text-center text-sm text-neutral-600">
                            Jangan khawatir, kami akan mengirimkanmu sebuah link
                            untuk mereset passwordmu.
                        </p>

                        <form onSubmit={submit} className="mt-8 space-y-4">
                            <Input
                                id="email"
                                type="email"
                                label="Email"
                                value={data.email}
                                onChange={(e) =>
                                    setData("email", e.target.value)
                                }
                                placeholder="Masukan Email"
                                error={errors.email}
                                size="md"
                            />

                            <Button
                                type="primary"
                                variant="solid"
                                className="w-full mt-2"
                                disabled={processing}
                            >
                                {processing
                                    ? "Loading..."
                                    : "Kirim link reset password"}
                            </Button>

                            {/* bottom actions */}
                            <div className="flex items-center justify-between pt-2">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                                >
                                    <FaArrowLeft />
                                    Kembali Login
                                </Link>

                                <Button
                                    type="primary"
                                    variant="ghost"
                                    size="sm"
                                    className="px-0 py-0 text-sm font-semibold"
                                    onClick={resend}
                                    disabled={processing}
                                >
                                    Kirim Ulang
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="sticky hidden lg:block max-h-screen top-0">
                    <img
                        src="/assets/auth/hero-forgot-password.png"
                        alt="Forgot Password Hero"
                        className="h-screen w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/25 bottom-0" />

                    <div className="absolute bottom-12 left-12 right-12 text-white">
                        <h2 className="text-3xl font-semibold leading-tight xl:text-4xl max-w-[680px]">
                            Jalan Jalan sejenak, biar hati ikut pulang
                        </h2>
                        <p className="mt-4 max-w-[680px] text-base leading-relaxed text-white/95">
                            Rasakan serunya petualangan tanpa batas dengan
                            berbagai pilihan destinasi dan aktivitas, mulai dari
                            alam bebas hingga wisata kota yang penuh warna.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

ForgotPassword.layout = (page) => <MainLayout>{page}</MainLayout>;
