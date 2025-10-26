"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, ClipboardList, Users, Music3 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/components/Brand";

function NavLink({ href, children, icon, onClick }: { href: string; children: React.ReactNode; icon?: React.ReactNode; onClick?: () => void; }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`btn-ghost inline-flex items-center gap-2 ${active ? "text-white" : "opacity-80 hover:opacity-100"}`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768 && open) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-black/40 border-b border-white/10">
      <nav className="mx-auto max-w-6xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-black tracking-widest text-xl" style={{ fontFamily: "var(--font-title)" }}>
            <Brand />
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink href="/" icon={<LayoutDashboard size={16} aria-hidden />}>Dashboard</NavLink>
            <NavLink href="/tools" icon={<ClipboardList size={16} aria-hidden />}>Outils</NavLink>
            <NavLink href="/volunteers" icon={<Users size={16} aria-hidden />}>Bénévoles</NavLink>
            <NavLink href="/lineup" icon={<Music3 size={16} aria-hidden />}>Line Up</NavLink>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
          </div>

          {/* Mobile toggler */}
          <button
            className="md:!hidden btn-ghost"
            onClick={() => setOpen((v) => !v)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          id="mobile-nav"
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="pt-3 pb-2 border-t border-white/10 grid gap-2">
            <NavLink href="/" icon={<LayoutDashboard size={16} />} onClick={() => setOpen(false)}>Dashboard</NavLink>
            <NavLink href="/tools" icon={<ClipboardList size={16} />} onClick={() => setOpen(false)}>Outils (Prêts)</NavLink>
            <NavLink href="/volunteers" icon={<Users size={16} />} onClick={() => setOpen(false)}>Bénévoles</NavLink>
            <NavLink href="/lineup" icon={<Music3 size={16} />} onClick={() => setOpen(false)}>Line Up</NavLink>

            <div className="flex items-center justify-between mt-2">
              <span className="text-sm opacity-70">Thème</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
