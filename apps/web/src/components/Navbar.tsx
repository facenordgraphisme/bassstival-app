"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut, signIn } from "next-auth/react";
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Users,
  Music3,
  Shield,
  ChevronDown,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Brand from "@/components/Brand";
import { canAccess, useRoles } from "@/lib/use-permissions";
import { motion, AnimatePresence } from "framer-motion";

function NavLink({
  href,
  children,
  icon,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-1 transition ${
        active
          ? "bg-white/10 text-white"
          : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const { data: session,status } = useSession();
  const { roles } = useRoles();
  const prevStatus = useRef(status);
const [greetKey, setGreetKey] = useState(0);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768 && open) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);


  useEffect(() => {
  // Quand on passe de loading/unauthenticated → authenticated, on bump la clé
  if (prevStatus.current !== "authenticated" && status === "authenticated") {
    setGreetKey((k) => k + 1);
  }
  prevStatus.current = status;
}, [status]);

  const canRoot = canAccess(roles, "root");
  const canTools = canAccess(roles, "tools");
  const canVolunteers = canAccess(roles, "volunteers");
  const canLineup = canAccess(roles, "lineup");
  const canAdmin = canAccess(roles, "admin");

  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-black/50 border-b border-white/10">
      <nav className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between">
        {/* Left - Brand */}
        <div
          className="flex items-center gap-3 font-black tracking-widest text-lg"
          style={{ fontFamily: "var(--font-title)" }}
        >
          <Brand />
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-3">
          {canRoot && (
            <NavLink href="/" icon={<LayoutDashboard size={16} />}>
              Dashboard
            </NavLink>
          )}

          {/* Dropdown for other sections */}
          <div className="relative">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span>Sections</span>
              <ChevronDown size={14} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-44 rounded-md bg-zinc-900 border border-white/10 shadow-lg p-1"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                {canTools && (
                  <NavLink href="/tools" icon={<ClipboardList size={14} />}>
                    Outils
                  </NavLink>
                )}
                {canVolunteers && (
                  <NavLink href="/volunteers" icon={<Users size={14} />}>
                    Bénévoles
                  </NavLink>
                )}
                {canLineup && (
                  <NavLink href="/lineup" icon={<Music3 size={14} />}>
                    Line Up
                  </NavLink>
                )}
                {canAdmin && (
                  <NavLink href="/admin/users" icon={<Shield size={14} />}>
                    Admin
                  </NavLink>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {status === "loading" ? (
            // on évite d’afficher quoi que ce soit (sinon l’anim se joue trop tôt)
            <span className="opacity-60 text-sm">…</span>
          ) : status === "authenticated" ? (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`greet-${greetKey}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="opacity-80 text-sm flex items-center gap-1"
                >
                  <span>Bienvenue,</span>
                  <span className="font-semibold text-white">
                    {session?.user?.name || session?.user?.email?.split("@")[0]}
                  </span>
                  <motion.span
                    aria-hidden
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 18, -8, 14, -4, 0] }}
                    transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                  >
                    👋
                  </motion.span>
                </motion.div>
              </AnimatePresence>
              <button
                className="px-3 py-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              className="px-3 py-1.5 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10"
              href="/login"
            >
              Se connecter
            </Link>
          )}
        </div>
        {/* Mobile toggler */}
        <button
          className="md:hidden px-2 py-1 rounded-md hover:bg-white/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir le menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/60 p-3 space-y-2">
          {/* ... tes liens ... */}
         {status === "authenticated" && (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`m-${session?.user?.name || session?.user?.email}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="text-sm text-white/80"
            >
              Bienvenue{" "}
              <span className="font-semibold">
                {session?.user?.name || session?.user?.email?.split("@")[0]}
              </span>{" "}
              <motion.span
                aria-hidden
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 18, -8, 14, -4, 0] }}
                transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                className="inline-block"
              >
                👋
              </motion.span>
            </motion.div>
          </AnimatePresence>
        )}

          {/* Auth actions */}
          {status === "authenticated" ? (
            <button
              className="btn-ghost w-full"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Déconnexion
            </button>
          ) : (
            <button className="btn-ghost w-full" onClick={() => signIn()}>
              Se connecter
            </button>
          )}
        </div>
      )}
    </header>
  );
}
