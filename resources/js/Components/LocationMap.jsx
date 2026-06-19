import { useEffect, useState } from "react";

export default function LocationMap({
    query,
    height = 280,
}) {
    const [position, setPosition] = useState([-6.1751, 106.8272]);

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                        query
                    )}&limit=1`
                );

                const data = await response.json();

                if (data.length > 0) {
                    setPosition([
                        parseFloat(data[0].lat),
                        parseFloat(data[0].lon),
                    ]);
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchLocation();
    }, [query]);

    return (
        <iframe
            width="100%"
            height={height}
            className="rounded-xl border"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                position[1] - 0.05
            }%2C${position[0] - 0.05}%2C${
                position[1] + 0.05
            }%2C${position[0] + 0.05}&layer=mapnik&marker=${position[0]}%2C${position[1]}`}
        />
    );
}