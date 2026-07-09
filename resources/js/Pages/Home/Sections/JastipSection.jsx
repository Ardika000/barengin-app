import React from "react";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import SectionHeading from "../Partials/SectionHeading";
import JastipCard from "../Cards/JastipCard";
import { useTranslation } from "@/lib/useTranslation";

export default function JastipSection({ products }) {
    const { t } = useTranslation();
    return (
        <section className="py-12 pt-4">
            <Container>
                <SectionHeading
                    label={t("home.jastip.label")}
                    align="right"
                    className="mb-12"
                />

                <div className="flex flex-col text-center md:text-left md:flex-row justify-between items-center mb-10 gap-4 md:gap-7">
                    <div>
                        <h2 className="text-3xl font-medium leading-normal text-neutral-700">
                            {t("home.jastip.heading_1")}
                        </h2>
                        <h2 className="text-3xl font-medium leading-normal text-neutral-500">
                            {t("home.jastip.heading_2")}
                        </h2>
                    </div>

                    <div className="text-center md:text-right">
                        <p className="text-sm text-neutral-700 mb-4 max-w-[400px] ml-auto">
                            {t("home.jastip.subtitle")}
                        </p>
                        <Button
                            type="primary"
                            isButtonLink
                            href="/jastip"
                            className="px-6 py-2 rounded-full text-sm"
                        >
                            {t("common.explore_more")}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                    {products.map((p) => (
                        <JastipCard key={p.id} product={p} />
                    ))}
                </div>
            </Container>
        </section>
    );
}
