import type { ReactNode } from "react";
import "./globals.css";
import { Unbounded, Inter } from "next/font/google";
import { Toaster } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/components/Brand";
import Link from "next/link";

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-title" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Bassstival – Fiches de prêt",
  description: "Gestion des outils du festival",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${unbounded.variable} ${inter.variable}`}>
      <body className="bg-noise">
        <div className="triangles" />
        <header className="sticky top-0 z-20 backdrop-blur bg-black/40 border-b border-white/10">
          <nav className="mx-auto max-w-6xl flex items-center justify-between p-4">
            <div className="flex items-center gap-3 font-black tracking-widest text-xl" style={{ fontFamily: "var(--font-title)" }}>
                <Brand />
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link className="btn" href="/">Fiches ouvertes</Link>
              <Link className="btn" href="/loans/new">Nouvelle fiche</Link>
              <Link className="btn" href="/history">Historique</Link>
            </div>
          </nav>
        </header>

        <Toaster richColors position="bottom-right" closeButton />

        <main className="mx-auto max-w-6xl p-6 space-y-8" style={{ fontFamily: "var(--font-sans)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
