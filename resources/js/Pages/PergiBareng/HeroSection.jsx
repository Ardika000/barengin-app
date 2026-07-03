import React from "react";
import Container from "@/Components/Container";
import { useTranslation } from "@/lib/useTranslation";

export default function HeroSection({ title, subtitle }) {
    const { t } = useTranslation();
    const heroTitle = title ?? t("pb.hero.title");
    const heroSubtitle = subtitle ?? t("pb.hero.subtitle");
    return (
        <header
            className="pt-24 pb-30 md:pt-40 md:pb-40 bg-cover bg-center"
            style={{
                backgroundImage:
                    "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.4)), url('/assets/pergi-bareng/PergiBarengHeader.avif')",
            }}
        >
            <Container className="text-center text-white">
                <h1 className="text-4xl md:text-6xl font-semibold mb-4">
                    {heroTitle}
                </h1>
                <p className="text-base md:text-lg mb-0 max-w-3xl mx-auto font-light">
                    {heroSubtitle}
                </p>
            </Container>
        </header>
    );
}