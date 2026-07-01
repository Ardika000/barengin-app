import React from "react";
import MainLayout from "@/Layouts/MainLayout";

import HeroSection from "./Sections/HeroSection";
import AboutSection from "./Sections/AboutSection";
import PopularTripsSection from "./Sections/PopularTripsSection";
import JastipSection from "./Sections/JastipSection";
import GallerySection from "./Sections/GallerySection";
import ContactSection from "./Sections/ContactSection";

export default function Home({ galleryImages = [] }) {
    const popularTrips = [
        {
            id: 1,
            title: "Malang, Jawa Timur",
            duration: "3 Hari, 2 Malam",
            rating: "4,9",
            image: "/assets/home/trip-card-image.jpg",
        },
        {
            id: 2,
            title: "Pati, Jawa Tengah",
            duration: "3 Hari, 2 Malam",
            rating: "4,9",
            image: "/assets/home/trip-card-image.jpg",
        },
        {
            id: 3,
            title: "Bali",
            duration: "3 Hari, 2 Malam",
            rating: "4,9",
            image: "/assets/home/trip-card-image.jpg",
        },
        {
            id: 4,
            title: "Pontianak, Kalbar",
            duration: "3 Hari, 2 Malam",
            rating: "4,8",
            image: "/assets/home/trip-card-image.jpg",
        },
    ];

    const jastipProducts = [
        {
            id: 1,
            name: "Kacang Mente Rostcas",
            price: "Rp67.000",
            from: "Surabaya",
            to: "Bogor",
            author: "Edwin Hendly",
            rating: "4,9",
            tag: "Berlangsung hingga 3 Okt 2025",
            tagColor: "bg-primary-600",
            image: "/assets/home/jastip/kacang-rostcas.jpg",
        },
        {
            id: 2,
            name: "Celana SONDOG 3/4 Betis",
            price: "Rp30.000",
            from: "Jakarta",
            to: "Bogor",
            author: "Edwin Hendly",
            rating: "4,9",
            tag: "Akan Buka 1 Okt 2025",
            tagColor: "bg-danger-600",
            image: "/assets/home/jastip/celana-sontog.jpg",
        },
        {
            id: 3,
            name: "Kacang Mente Rostcas",
            price: "Rp67.000",
            from: "Surabaya",
            to: "Bogor",
            author: "Edwin Hendly",
            rating: "4,9",
            tag: "Berlangsung hingga 3 Okt 2025",
            tagColor: "bg-primary-600",
            image: "/assets/home/jastip/kacang-rostcas.jpg",
        },
        {
            id: 4,
            name: "Celana SONDOG 3/4 Betis",
            price: "Rp30.000",
            from: "Jakarta",
            to: "Bogor",
            author: "Edwin Hendly",
            rating: "4,9",
            tag: "Akan Buka 1 Okt 2025",
            tagColor: "bg-danger-600",
            image: "/assets/home/jastip/celana-sontog.jpg",
        },
    ];

    return (
        <>
            <HeroSection />
            <AboutSection />
            <PopularTripsSection trips={popularTrips} />
            <JastipSection products={jastipProducts} />
            <GallerySection galleryImages={galleryImages} />
            <ContactSection />
        </>
    );
}

Home.layout = (page) => <MainLayout>{page}</MainLayout>;
