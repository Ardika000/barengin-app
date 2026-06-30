import React, { useState } from "react";
import Container from "@/Components/Container";
import HeroSearchCard from "../Partials/HeroSearchCard";

export default function HeroSection() {
    const [activeTab, setActiveTab] = useState("trip");

    return (
        <>
            {/* Hero */}
            <header
                className="pt-24 pb-30 md:pt-40 md:pb-40 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.4)), url('/assets/home/hero-bg.jpg')",
                }}
            >
                <Container className="text-center text-white">
                    <h1 className="text-4xl md:text-6xl font-semibold mb-4">
                        Eksplor Tempat di sekitar Anda
                    </h1>
                    <p className="text-base md:text-lg mb-0 max-w-3xl mx-auto font-light">
                        Ambil jeda dari stres kehidupan sehari-hari, rencanakan
                        perjalanan, dan jelajahi destinasi favoritmu.
                    </p>
                </Container>
            </header>

            <section className="-mt-16 md:-mt-20">
                <Container>
                    <HeroSearchCard
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                    />
                </Container>
            </section>
        </>
    );
}
