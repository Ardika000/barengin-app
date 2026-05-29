import React, { useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import MainLayout from "@/Layouts/MainLayout";
import Container from "@/Components/Container";
import Button from "@/Components/Button";
import Input from "@/Components/Input";

import { FaUserFriends, FaMinus, FaPlus, FaChevronLeft, FaShoppingCart } from "react-icons/fa";

export default function Join({ trip }) {
    const maxSisa = trip.capacity - trip.joined;
    const [count, setCount] = useState(1);
    const [validationErrors, setValidationErrors] = useState({}); 
    
    const { data, setData, post, processing, errors } = useForm({
        participants: [{ nama: "", tanggal_lahir: "", paspor: "", telepon: "", nik: "" }]
    });

    const handleCountChange = (newCount) => {
        if (newCount >= 1 && newCount <= maxSisa) {
            setCount(newCount);
            const newData = [...data.participants];
            if (newCount > newData.length) {
                newData.push({ nama: "", tanggal_lahir: "", paspor: "", telepon: "", nik: "" });
            } else {
                newData.pop();
            }
            setData("participants", newData);
        }
    };

    const validatePhoneNumber = (phone) => {
        if (!phone) return false;
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneRegex = /^(62)?(8)\d{9,13}$/;
        return phoneRegex.test(cleanPhone);
    };

    const handleInputChange = (index, field, value) => {
        const newData = [...data.participants];
        newData[index][field] = value;
        setData("participants", newData);

        if (field === 'telepon') {
            const newErrors = { ...validationErrors };
            if (value && !validatePhoneNumber(value)) {
                newErrors[`telepon-${index}`] = 'Isi nomor dengan format yang sesuai ! (cth: 821234567890)';
            } else {
                delete newErrors[`telepon-${index}`];
            }
            setValidationErrors(newErrors);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        
        let hasErrors = false;
        const newErrors = {};

        data.participants.forEach((participant, index) => {
            if (!participant.nama.trim()) {
                newErrors[`nama-${index}`] = 'Nama lengkap wajib diisi';
                hasErrors = true;
            }
            if (!participant.tanggal_lahir) {
                newErrors[`tanggal_lahir-${index}`] = 'Tanggal lahir wajib diisi';
                hasErrors = true;
            }
            if (!participant.telepon.trim()) {
                newErrors[`telepon-${index}`] = 'Nomor telepon wajib diisi';
                hasErrors = true;
            } else if (!validatePhoneNumber(participant.telepon)) {
                newErrors[`telepon-${index}`] = 'Isi dengan format nomor yang sesuai !';
                hasErrors = true;
            }
            if (!participant.nik.trim()) {
                newErrors[`nik-${index}`] = 'NIK wajib diisi (16 digit)';
                hasErrors = true;
            }
        });

        if (hasErrors) {
            setValidationErrors(newErrors);
            return;
        }

        post(`/pergi-bareng/${trip.id}/join`);
    };

    return (
        <MainLayout>
            <Head title="Detail Partisipan Pergi Bareng" />

            <Container className="py-8 max-w-5xl">
                <div className="mb-6">
                    <Link href={`/pergi-bareng/${trip.id}`} className="inline-flex items-center text-2xl font-bold text-neutral-900 hover:text-primary-700 gap-3 transition">
                        <FaChevronLeft /> Detail Parjalanan
                    </Link>
                    <p className="text-sm text-neutral-500 mt-1 ml-6">Masukan data partisipan demi keamanan anda</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        
                        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
                            <div className="flex items-center gap-4 mb-4">
                                <img src="/assets/terminal-cibubur.jpg" className="w-16 h-16 rounded-xl object-cover" alt="Trip" />
                                <div>
                                    <h3 className="font-bold text-neutral-900">{trip.title}</h3>
                                    <p className="text-sm text-primary-600 flex items-center gap-1 mt-1">
                                        <FaUserFriends /> {trip.joined} / {trip.capacity} telah bergabung
                                    </p>
                                </div>
                            </div>
                            
                            <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-sm">Total partisipan</p>
                                    <p className="text-xs text-neutral-500">Hanya tersisa {maxSisa} kuota lagi</p>
                                </div>
                                <div className="flex items-center gap-4 bg-neutral-50 rounded-full border border-neutral-200 px-2 py-1">
                                    <button 
                                        type="button" 
                                        onClick={() => handleCountChange(count - 1)} 
                                        className="w-8 h-8 flex items-center justify-center text-primary-700 hover:bg-neutral-200 rounded-full transition"
                                    >
                                        <FaMinus />
                                    </button>
                                    <span className="font-bold w-4 text-center">{count}</span>
                                    <button 
                                        type="button" 
                                        onClick={() => handleCountChange(count + 1)} 
                                        className="w-8 h-8 flex items-center justify-center text-white bg-primary-600 hover:bg-primary-700 rounded-full transition"
                                    >
                                        <FaPlus />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <form id="joinForm" onSubmit={submit} className="space-y-6">
                            {Array.from({ length: count }).map((_, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-6 relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-5">
                                        <h4 className="font-bold text-neutral-900">Info Partisipan {i + 1}</h4>
                                        <span className="text-xs font-semibold bg-success-50 text-success-700 px-3 py-1 rounded-md">Person {i + 1}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <Input 
                                                label="Nama Lengkap" 
                                                placeholder="Masukkan nama lengkap anda sesuai KTP" 
                                                value={data.participants[i].nama}
                                                onChange={(e) => handleInputChange(i, 'nama', e.target.value)}
                                                error={validationErrors[`nama-${i}`] || errors[`participants.${i}.nama`]} // <-- DIPERBAIKI
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <Input 
                                                type="date"
                                                label="Tanggal Lahir (Required)" 
                                                value={data.participants[i].tanggal_lahir}
                                                onChange={(e) => handleInputChange(i, 'tanggal_lahir', e.target.value)}
                                                error={validationErrors[`tanggal_lahir-${i}`] || errors[`participants.${i}.tanggal_lahir`]} // <-- DIPERBAIKI
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <Input 
                                                label="No. Paspor (Optional)" 
                                                placeholder="Nomor paspor resmi anda" 
                                                value={data.participants[i].paspor}
                                                onChange={(e) => handleInputChange(i, 'paspor', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Input 
                                                label="Nomor Telepon" 
                                                placeholder="821234567890" 
                                                leftAddon="+62"
                                                value={data.participants[i].telepon}
                                                onChange={(e) => handleInputChange(i, 'telepon', e.target.value)}
                                                error={validationErrors[`telepon-${i}`] || errors[`participants.${i}.telepon`]} // <-- DIPERBAIKI
                                                required
                                                inputMode="numeric"
                                            />
                                        </div>
                                        <div>
                                            <Input 
                                                label="NIK (Required)" 
                                                placeholder="Nomor Identitas (16 digit)" 
                                                value={data.participants[i].nik}
                                                onChange={(e) => handleInputChange(i, 'nik', e.target.value)}
                                                error={validationErrors[`nik-${i}`] || errors[`participants.${i}.nik`]} // <-- DIPERBAIKI
                                                required
                                                inputMode="numeric"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </form>

                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sticky top-24">
                            <h3 className="font-bold flex items-center gap-2 mb-4">
                                <FaShoppingCart className="text-primary-600" /> Detail Pembiayaan
                            </h3>
                            <ul className="text-sm text-neutral-700 space-y-2 mb-6">
                                <li>Pembayaran Tol</li>
                                <li>Pembayaran Bensin</li>
                            </ul>
                            
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex items-start gap-2 mb-6 border border-blue-100">
                                <FaShoppingCart className="mt-0.5 shrink-0 flex-shrink-0" />
                                <p>Estimasi bersifat fleksibel. Teknis pembayaran dan pembagian biaya diserahkan sepenuhnya kepada kesepakatan tiap pihak.</p>
                            </div>

                            <Button 
                                type="primary" 
                                className="w-full justify-center" 
                                onClick={submit}
                                disabled={processing}
                            >
                                Gabung Sekarang
                            </Button>
                        </div>
                    </div>

                </div>
            </Container>
        </MainLayout>
    );
}