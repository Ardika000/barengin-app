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
    const flash = event?.detail?.page?.props?.flash;
    if (!flash || !flash.message) return;
    const key = `${flash.type}|${flash.message}`;
    if (key === lastFlashKey) return; // hindari duplikat
    lastFlashKey = key;
    const fn = toast[flash.type] || toast.info;
    fn(flash.message);
});
