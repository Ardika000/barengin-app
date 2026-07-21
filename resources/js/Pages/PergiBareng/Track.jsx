import React from "react";
import LiveTrackMap from "@/Components/LiveTrackMap";
import { useTranslation } from "@/lib/useTranslation";

// Pantau perjalanan pergi bareng: titik kumpul -> tujuan.
export default function Track({ trip }) {
    const { t } = useTranslation();

    return (
        <LiveTrackMap
            title={trip.name}
            pageTitle={t("track.page_title", "Pantau Perjalanan")}
            originText={trip.departure_loc}
            destinationText={trip.destination_loc}
            originLabel={t("track.origin", "Titik Kumpul")}
            destinationLabel={t("track.destination", "Tujuan")}
        />
    );
}
