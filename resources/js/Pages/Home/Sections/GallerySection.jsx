import React from "react";
import { router } from "@inertiajs/react";
import Container from "@/Components/Container";
import SectionHeading from "../Partials/SectionHeading";
import GalleryGrid from "../Partials/GalleryGrid";

const FALLBACK_IMAGE = "/assets/home/gallery.jpg";

export default function GallerySection({ galleryImages = [] }) {
    // Susunan span per tile (mobile grid-cols-6, desktop grid-cols-12)
    const spanClasses = [
        "col-span-3 md:col-span-3",
        "col-span-3 md:col-span-2",
        "col-span-2 md:col-span-3",
        "col-span-2 md:col-span-4",
        "col-span-2 md:col-span-6",
        "col-span-3 md:col-span-4",
        "col-span-3 md:col-span-2",
    ];

    // Gambar acak dari forum; jika kosong pakai fallback, dan diulang agar
    // semua tile selalu terisi meski jumlah gambar forum sedikit.
    const pool = galleryImages.length > 0 ? galleryImages : [FALLBACK_IMAGE];

    const items = spanClasses.map((spanClass, i) => ({
        id: i + 1,
        src: pool[i % pool.length],
        spanClass,
    }));

    return (
        <section className="py-12 text-center mt-8 pt-4">
            <Container>
                <SectionHeading
                    label="Galeri"
                    align="center"
                    className="mb-12"
                />

                <h2 className="text-3xl font-medium mb-10 text-neutral-700 leading-normal">
                    Temukan Bentang Alam,{" "}
                    <span className="text-neutral-500">
                        Budaya, dan
                        <br /> Momen-Momen dalam Foto
                    </span>
                </h2>

                <div className="mb-8">
                    <GalleryGrid
                        items={items}
                        ctaLabel="Lihat Lebih Banyak"
                        onCtaClick={() => router.visit("/forum")}
                    />
                </div>

                <p className="text-sm text-neutral-700 max-w-2xl mx-auto">
                    Masuki dunia melalui galeri kurasi kami, yang mengabadikan
                    keindahan, budaya, dan momen tak terlupakan dari perjalanan
                    kami di seluruh negeri.
                </p>
            </Container>
        </section>
    );
}
