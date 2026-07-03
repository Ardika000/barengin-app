import './bootstrap';
import { createInertiaApp, router } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import Toaster from '@/Components/Toaster'
import { toast } from '@/lib/toast'

createInertiaApp({
    resolve: name => {
        const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true })
        return pages[`./Pages/${name}.jsx`]
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <App {...props} />
                <Toaster />
            </>
        )
    },
})

// Jembatan flash Laravel -> toast (otomatis untuk SEMUA halaman & aksi)
let lastFlashKey = null;
router.on('success', (event) => {
    const page = event?.detail?.page;
    const flash = page?.props?.flash;
    if (!flash || !flash.message) return;
    // Halaman auth menampilkan pesan sebagai alert box di atas form (bukan toast),
    // karena toast sulit terlihat pada layout dua kolom (form kiri, gambar kanan).
    if (typeof page.component === 'string' && page.component.startsWith('Auth/')) return;
    const key = `${flash.type}|${flash.message}`;
    if (key === lastFlashKey) return; // hindari duplikat
    lastFlashKey = key;
    const fn = toast[flash.type] || toast.info;
    fn(flash.message);
});
