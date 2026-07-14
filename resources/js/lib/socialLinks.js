import {
    FaFacebookF,
    FaLinkedinIn,
    FaYoutube,
    FaInstagram,
} from "react-icons/fa";

/**
 * Tautan media sosial Barengin — sumber tunggal yang dipakai bersama oleh
 * Footer dan bagian Kontak di halaman utama. Ubah URL di sini saja jika akun
 * resmi sudah tersedia; untuk saat ini mengarah ke halaman utama tiap platform.
 * Semua tautan dibuka di tab baru (lihat pemakaian: target="_blank").
 */
export const socialLinks = [
    { label: "Facebook", href: "https://www.facebook.com", Icon: FaFacebookF },
    { label: "LinkedIn", href: "https://www.linkedin.com", Icon: FaLinkedinIn },
    { label: "YouTube", href: "https://www.youtube.com", Icon: FaYoutube },
    { label: "Instagram", href: "https://www.instagram.com", Icon: FaInstagram },
];
