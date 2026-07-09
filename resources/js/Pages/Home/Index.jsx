import React from "react";
import MainLayout from "@/Layouts/MainLayout";

import HeroSection from "./Sections/HeroSection";
import AboutSection from "./Sections/AboutSection";
import PopularTripsSection from "./Sections/PopularTripsSection";
import JastipSection from "./Sections/JastipSection";
import GallerySection from "./Sections/GallerySection";
import ContactSection from "./Sections/ContactSection";

export default function Home({ galleryImages = [], popularTrips = [], latestJastip = [] }) {
    return (
        <>
            <HeroSection />
            <AboutSection />
            <PopularTripsSection trips={popularTrips} />
            <JastipSection products={latestJastip} />
            <GallerySection galleryImages={galleryImages} />
            <ContactSection />
        </>
    );
}

Home.layout = (page) => <MainLayout>{page}</MainLayout>;
