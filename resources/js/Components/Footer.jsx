import React from "react";
import Container from "@/Components/Container";
import { useTranslation } from "@/lib/useTranslation";
import { socialLinks } from "@/lib/socialLinks";

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="bg-white pt-16 mt-auto w-full flex flex-col border-t border-neutral-300">
            {/* Top */}
            <Container className="flex flex-col items-center text-center pb-12">
                <img
                    src="/assets/barengin_logows.png"
                    className="h-20 w-auto"
                    alt="Barengin"
                />

                <h2 className="text-2xl font-semibold mt-4 text-neutral-900">
                    {t("footer.tagline")}
                </h2>

                <p className="text-neutral-600 mt-4 max-w-2xl leading-relaxed">
                    {t("footer.desc")}
                </p>

                <div className="flex gap-4 mt-8">
                    {socialLinks.map(({ label, href, Icon }) => (
                        <a
                            key={label}
                            href={href}
                            aria-label={label}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800 hover:bg-neutral-200 transition"
                        >
                            <Icon className="text-lg" />
                        </a>
                    ))}
                </div>
            </Container>

            {/* Bottom bar */}
            <div className="bg-primary-700 text-white py-2 w-full">
                <Container className="py-0 flex flex-col md:flex-row justify-between items-center text-sm font-medium">
                    <a
                        href="/privacy-policy"
                        className="hover:text-primary-100 transition mb-2 md:mb-0"
                    >
                        {t("footer.privacy")}
                    </a>
                    <span>
                        &copy;{new Date().getFullYear()} {t("footer.rights")}
                    </span>
                </Container>
            </div>
        </footer>
    );
}
