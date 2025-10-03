"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"rose" | "violet">("rose");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(theme === "rose" ? "violet" : "rose");

  return (
    <button
      onClick={toggle}
      aria-label="Changer le thème"
      title={theme === "rose" ? "Passer en violet" : "Passer en rose"}
      className="inline-flex items-center justify-center rounded-xl p-2 border border-white/15
                 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]
                 hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]
                 text-[var(--accent)] shadow-md transition"
    >
      {/* petite pastille/“palette” qui prend la couleur du thème */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-10 10c0 3 2.5 3 4 3h1a2 2 0 1 1 0 4h-1a6 6 0 0 0 6 3 10 10 0 0 0 0-20Zm-4.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5-3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/>
      </svg>
    </button>
  );
}
