import { useEffect } from "react";

export default function useLockBodyScroll(locked) {
    useEffect(() => {
        if (!locked) return;

        const body = document.body;
        const html = document.documentElement;

        const scrollBarWidth = window.innerWidth - html.clientWidth;
        const prevOverflow = body.style.overflow;
        const prevPaddingRight = body.style.paddingRight;

        body.style.overflow = "hidden";
        if (scrollBarWidth > 0) {
            body.style.paddingRight = `${scrollBarWidth}px`;
        }

        return () => {
            body.style.overflow = prevOverflow;
            body.style.paddingRight = prevPaddingRight;
        };
    }, [locked]);
}
