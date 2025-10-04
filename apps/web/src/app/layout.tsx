import type { ReactNode } from "react";
import "./globals.css";
import { Unbounded, Inter } from "next/font/google";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-title" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Bassstival – App",
  description: "Gestion du festival",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${unbounded.variable} ${inter.variable}`}>
      <body className="bg-noise" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="triangles" />
        <Navbar />
        <Toaster richColors position="bottom-right" closeButton />
        <main className="mx-auto max-w-6xl p-6 space-y-8">
          {children}
        </main>
      </body>
    </html>
  );
}
