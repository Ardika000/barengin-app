import React from "react";

export default function Container({ as: Component = "div", className = "", children, ...props }) {
    return (
        <Component
            className={[
                "max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8",
                className,
            ].join(" ")}
            {...props}
        >
            {children}
        </Component>
    );
}