import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import DynamicPageTransition from "@/components/animations/DynamicPageTransition";

// Load Inter font for clean, premium developer-portfolio styling
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HireOps | Agentic AI Hiring Platform",
  description: "Enterprise-grade, robust, and highly aesthetic AI-driven B2B SaaS hiring platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${inter.variable} font-sans bg-neutral-950 text-neutral-50 antialiased min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200`}
      >
        {/* Deep Dark Mode Background with subtle Glassmorphism ambient glows */}
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-neutral-950">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
        </div>

        <main className="relative flex flex-col min-h-screen z-0 overflow-x-hidden">
          {/* PageTransition Wrapper applies AnimatePresence for layout shifts */}
          {/* Loaded dynamically with ssr: false to prevent hydration mismatches from Framer Motion */}
          <DynamicPageTransition>
            {children}
          </DynamicPageTransition>
        </main>
      </body>
    </html>
  );
}
