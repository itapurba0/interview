"use client";

import dynamic from "next/dynamic";

const DynamicPageTransition = dynamic(
    () => import("@/components/animations/PageTransition"),
    {
        ssr: false,
        loading: () => <div className="flex flex-col min-h-screen w-full" />
    }
);

export default DynamicPageTransition;
