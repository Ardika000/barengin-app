// Toast store sederhana (module-level) yang bisa dipakai dari mana saja —
// tanpa context/hook — jadi konsisten di SEMUA halaman.
let toasts = [];
const listeners = new Set();
let counter = 0;

function emit() {
    const snapshot = [...toasts];
    listeners.forEach((fn) => fn(snapshot));
}

export function subscribe(fn) {
    listeners.add(fn);
    fn([...toasts]);
    return () => listeners.delete(fn);
}

export function dismissToast(id) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

function push(type, message, opts = {}) {
    if (!message) return null;
    const id = ++counter;
    const duration = opts.duration ?? 4000;
    toasts = [...toasts, { id, type, message }];
    emit();
    if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
    }
    return id;
}

export const toast = {
    success: (message, opts) => push("success", message, opts),
    error: (message, opts) => push("error", message, opts),
    danger: (message, opts) => push("error", message, opts),
    warning: (message, opts) => push("warning", message, opts),
    info: (message, opts) => push("info", message, opts),
    show: (message, opts = {}) => push(opts.type || "info", message, opts),
};
