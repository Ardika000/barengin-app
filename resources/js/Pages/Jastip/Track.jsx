import React from "react";
import LiveTrackMap from "@/Components/LiveTrackMap";
import { useTranslation } from "@/lib/useTranslation";

// Pantau pengambilan jastip: lokasi belanja jastiper -> titik ambil barang.
export default function Track({ item }) {
    const { t } = useTranslation();

    return (
        <LiveTrackMap
            title={item.name}
            pageTitle={t("track.jastip_page_title", "Pantau Pengambilan")}
            originText={item.purchase_loc}
            destinationText={item.pickup_loc}
            originLabel={t("track.jastip_origin", "Lokasi Belanja")}
            destinationLabel={t("track.jastip_destination", "Titik Ambil")}
        />
    );
}
