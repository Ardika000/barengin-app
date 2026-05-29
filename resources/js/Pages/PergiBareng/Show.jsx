import React, { useState, useEffect }from "react";
import { FaChevronLeft } from "react-icons/fa";
import { Head, Link } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { 
    FaCalendarAlt, FaRegClock, FaUserFriends, FaCheckCircle, 
    FaMapMarkerAlt, FaCar, FaInfoCircle, FaStar
} from "react-icons/fa";

export default function Show({ trip }) {
    const [position, setPosition] = useState([-6.1751, 106.8272]); 

    useEffect(() => {
        if (!trip?.details?.titik_kumpul) return; 

        const fetchCoordinates = async () => {
            try {
                const query = encodeURIComponent(`${trip.details.titik_kumpul}, Indonesia`);
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
                );
                const data = await response.json();
                
                if (data && data.length > 0) {
                    setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                }
            } catch (error) {
                console.error("Gagal cari koordinat:", error);
            }
        };

        fetchCoordinates();
    }, [trip?.details?.titik_kumpul]);

    return (
        <MainLayout>
            <Head title={`Detail Perjalanan - ${trip.title}`} />
            
            <div className="bg-white border-b border-neutral-200 py-4">
                <Container>
                    <Link href="/pergi-bareng" className="inline-flex items-center text-2xl font-bold text-neutral-900 hover:text-primary-700 mb-2 gap-3 transition">
                        <FaChevronLeft className="text-xl" /> Kembali ke Daftar
                    </Link>
                </Container>
            </div> 

            <Container className="py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Kiri: Detail Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Card Header dengan Gambar */}
                        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col md:flex-row">
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-neutral-900 mb-4">{trip.title}</h1>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 mb-6">
                                        <div className="flex items-center gap-1.5"><FaCalendarAlt className="text-primary-600"/> {trip.date}</div>
                                        <div className="flex items-center gap-1.5"><FaRegClock className="text-primary-600"/> {trip.time}</div>
                                        <div className="flex items-center gap-1.5"><FaUserFriends className="text-primary-600"/> {trip.joined}/{trip.capacity} Kursi Terisi</div>
                                    </div>
                                </div>
                                
                                {/* Organizer Info */}
                                <div className="flex items-center gap-4">
                                    <img src={trip.organizer.avatar} alt={trip.organizer.name} className="w-12 h-12 rounded-full object-cover border border-neutral-200" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1 font-semibold text-neutral-900">
                                            {trip.organizer.name} {trip.organizer.verified && <FaCheckCircle className="text-primary-500 text-sm"/>}
                                        </div>
                                        <div className="text-xs text-neutral-500 flex items-center gap-1">
                                            <FaStar className="text-warning-500"/> {trip.organizer.rating} ({trip.organizer.reviews} ulasan)
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm">Chat Penyelenggara</Button>
                                </div>
                            </div>
                            
                            {/* Gambar Bus */}
                            <div className="w-full md:w-1/3 bg-neutral-100 min-h-[250px] md:min-h-[200px]">
                                <img 
                                    src={trip.img_name ? `/storage/${trip.img_name}` : '/assets/terminal-cibubur.jpg'} 
                                    alt="Bus" 
                                    className="w-full h-full object-cover" 
                                />
                            </div>
                        </div>

                        {/* Deskripsi */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <span className="p-1.5 bg-neutral-100 rounded-md"><FaInfoCircle className="text-neutral-600 text-sm"/></span>
                                Deskripsi Perjalanan
                            </h3>
                            <p className="text-neutral-600 text-sm leading-relaxed mb-4">{trip.description}</p>
                            
                            <h4 className="font-semibold text-sm mb-2">Detail Perjalanan:</h4>
                            <ul className="space-y-3 mt-3">
                                <li className="flex items-start gap-3 text-sm">
                                    <FaMapMarkerAlt className="text-primary-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">Titik Kumpul</span> {trip.details.titik_kumpul}</div>
                                </li>
                                <li className="flex items-start gap-3 text-sm">
                                    <FaMapMarkerAlt className="text-success-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">Titik Tujuan</span> {trip.details.titik_tujuan}</div>
                                </li>
                                <li className="flex items-start gap-3 text-sm">
                                    <FaCar className="text-primary-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">Transportasi</span> {trip.details.transportasi}</div>
                                </li>
                                <li className="flex items-start gap-3 text-sm">
                                    <FaRegClock className="text-primary-600 mt-1 flex-shrink-0"/>
                                    <div><span className="text-neutral-500 block text-xs">Jam Kumpul</span> {trip.details.jam_kumpul}</div>
                                </li>
                            </ul>
                        </div>

                        {/* Teman Pergi Bareng */}
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <span className="p-1.5 bg-neutral-100 rounded-md"><FaUserFriends className="text-neutral-600 text-sm"/></span>
                                    Teman Pergi Bareng
                                </h3>
                                <span className="text-sm font-semibold">{trip.joined}/{trip.capacity} Orang</span>
                            </div>

                            <div className="space-y-3">
                                {/* Organizer */}
                                <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-xl bg-neutral-50">
                                    <div className="flex items-center gap-3 flex-1">
                                        <img src={trip.organizer.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold flex items-center gap-1">{trip.organizer.name} <FaCheckCircle className="text-primary-500 text-xs"/></p>
                                            <p className="text-xs text-neutral-500">Penyelenggara</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                        <div className="text-xs text-neutral-600 flex items-center gap-0.5 whitespace-nowrap">
                                            <FaStar className="text-warning-500"/> {trip.organizer.rating}
                                        </div>
                                    </div>
                                    <Button size="xs" variant="outline" className="ml-2">Follow</Button>
                                </div>
                                
                                {/* Participants */}
                                {trip.participants.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition">
                                        <div className="flex items-center gap-3 flex-1">
                                            <img src={p.avatar} className="w-10 h-10 rounded-full object-cover" alt="Avatar"/>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold flex items-center gap-1">{p.name} {p.verified && <FaCheckCircle className="text-primary-500 text-xs"/>}</p>
                                                <p className="text-xs text-neutral-500">
                                                    {p.age ? `Usia ${p.age} Tahun` : 'Umur tidak tersedia'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <div className="text-xs text-neutral-600 flex items-center gap-0.5 whitespace-nowrap">
                                                <FaStar className="text-warning-500"/> {p.rating.toFixed(1)}
                                            </div>
                                        </div>
                                        <Button size="xs" variant="outline" className="ml-2">View Profile</Button>
                                    </div>
                                ))}

                                {/* Empty Seats */}
                                {[...Array(Math.max(0, trip.capacity - trip.joined))].map((_, i) => (
                                    <div key={`empty-${i}`} className="flex items-center gap-4 p-3 border border-dashed border-neutral-300 rounded-xl bg-neutral-50/50">
                                        <div className="w-10 h-10 rounded-full border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-sm font-medium">{trip.joined + i + 1}</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-neutral-600">Kursi Tersedia</p>
                                            <p className="text-xs text-neutral-400">Belum ada yang bergabung</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Kanan: Sidebar Aksi */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                                {/* Map */}
                                <div className="h-40 bg-neutral-200 relative z-0">
                                    <MapContainer 
                                        key={`${position[0]}-${position[1]}`} 
                                        center={position} 
                                        zoom={15} 
                                        scrollWheelZoom={false} 
                                        className="w-full h-full z-0"
                                    >
                                        <TileLayer
                                            attribution='© OpenStreetMap'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <Marker position={position}>
                                            <Popup>
                                                <b className="font-bold">Titik Kumpul:</b> <br /> 
                                                {trip?.details?.titik_kumpul || "Lokasi belum ditentukan"}
                                            </Popup>
                                        </Marker>
                                    </MapContainer>

                                    <Button 
                                        size="sm" 
                                        variant="solid" 
                                        className="absolute bottom-3 right-3 z-[1000] bg-primary-600 text-white shadow-md hover:bg-primary-700"
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip?.details?.titik_kumpul)}`, '_blank')}
                                    >
                                        Buka di Google Maps
                                    </Button>
                                </div>
                                <div className="p-5">
                                    <h4 className="font-bold text-sm mb-3">Estimasi Pembiayaan</h4>
                                    <div className="space-y-2 text-sm text-neutral-600 mb-4">
                                        <div className="flex items-center gap-2"><FaCar /> Pembayaran Tol</div>
                                        <div className="flex items-center gap-2"><FaCar /> Pembayaran Bensin</div>
                                    </div>
                                    <div className="bg-warning-50 text-warning-700 p-3 rounded-lg text-xs flex items-start gap-2 mb-4 border border-warning-100">
                                        <FaInfoCircle className="mt-0.5 shrink-0 flex-shrink-0" />
                                        <p>Estimasi bersifat fleksibel. Teknis pembayaran dan pembagian biaya diserahkan sepenuhnya kepada kesepakatan tiap pihak.</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tombol Aksi */}
                            <div className="bg-white rounded-2xl border border-neutral-200 p-4">
                                <p className="text-xs text-neutral-500 mb-1">Ikut pergi bareng sekarang</p>
                                <p className="text-sm font-bold mb-4">{trip.title}</p>
                                <Button isButtonLink href={`/pergi-bareng/${trip.id}/join`} type="primary" className="w-full">
                                    Ikut Sekarang &rarr;
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </MainLayout>
    );
}
