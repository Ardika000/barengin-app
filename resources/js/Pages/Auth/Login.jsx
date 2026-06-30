import { useState } from "react";
import { Link, useForm } from "@inertiajs/react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Button from "@/Components/Button.jsx";
import MainLayout from "@/Layouts/MainLayout.jsx";
import Input from "@/Components/Input.jsx";
import Checkbox from "@/Components/Checkbox.jsx";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
    const [hidePassword, setHidePassword] = useState(true);

    const { data, setData, post, processing, errors } = useForm({
        login: "",
        password: "",
        remember: true,
    });

    const submit = (e) => {
        e.preventDefault();
        post("/login");
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

                        <h1 className="mt-2 text-center text-xl font-semibold tracking-tight text-neutral-700">
                            Selamat Datang
                        </h1>

                        <p className="mt-1 pb-8 text-center text-sm text-neutral-600 border-b border-neutral-400">
                            Login akun anda dan jelajahi hiburan di dunia
                        </p>

                        <form onSubmit={submit} className="mt-8 space-y-4">
                            <Input
                                id="login"
                                type="text"
                                label="Username or Email"
                                value={data.login}
                                onChange={(e) =>
                                    setData("login", e.target.value)
                                }
                                placeholder="Masukan Username atau Email"
                                error={errors.login}
                                size="md"
                            />

                            <Input
                                id="password"
                                type={hidePassword ? "password" : "text"}
                                label="Password"
                                value={data.password}
                                onChange={(e) =>
                                    setData("password", e.target.value)
                                }
                                placeholder="Masukan Password"
                                error={errors.password}
                                size="md"
                                rightAddon={
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setHidePassword((prev) => !prev)
                                        }
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                                        aria-label={
                                            hidePassword
                                                ? "Show password"
                                                : "Hide password"
                                        }
                                    >
                                        {hidePassword ? (
                                            <FaEyeSlash size={16} />
                                        ) : (
                                            <FaEye size={16} />
                                        )}
                                    </button>
                                }
                            />

                            <div className="flex items-center justify-between pt-1">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onChange={(v) => setData("remember", v)}
                                    label="Ingat saya 30 hari kedepan"
                                />

                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-semibold text-primary-700 underline hover:opacity-80"
                                >
                                    Lupa Password
                                </Link>
                            </div>

                            <Button
                                type="primary"
                                variant="solid"
                                className="w-full mt-2"
                                disabled={processing}
                            >
                                {processing ? "Loading..." : "Masuk"}
                            </Button>

                            <Button
                                type="neutral"
                                variant="outline"
                                className="w-full gap-3"
                                onClick={() =>
                                    (window.location.href =
                                        "/auth/google/redirect")
                                }
                                disabled={processing}
                            >
                                <FcGoogle size={20}/>
                                Masuk dengan Google
                            </Button>

                            <p className="pt-2 text-center text-sm text-neutral-700">
                                Belum mempunyai akun?{" "}
                                <Link
                                    href="/register"
                                    className="font-semibold underline hover:opacity-80"
                                >
                                    Daftar
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="sticky hidden lg:block max-h-screen top-0">
                    <img
                        src="/assets/auth/hero-login.png"
                        alt="Mountain"
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

Login.layout = (page) => <MainLayout>{page}</MainLayout>;
