"use client";

import Link from "next/link";
import Image from "next/image";

export default function Brand() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-3 whitespace-nowrap"
    >
      {/* Logo image */}
      <span className="relative inline-grid place-items-center">
        <Image
          src="/assets/lolo.png"
          alt="Logo Bassstival"
          width={80}
          height={80}
          className="
            rounded-xl bg-black/30 backdrop-blur
            shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
             duration-700
            
            group-hover:bg-black/35 group-hover:-translate-y-0.5
          "
          priority
        />
      </span>

      {/* Wordmark sur 1 ligne */}
      <span
        className="font-extrabold leading-none tracking-tight"
        style={{ fontFamily: "var(--font-title)" }}
      >
        {/* BASS en dégradé thémé */}
        <span
          className="align-middle transition-[background-position] duration-700
                    [background-position:0%] group-hover:[background-position:100%]"
          style={{
            background: "linear-gradient(90deg, var(--cyan), var(--vio), var(--flame))",
            backgroundSize: "300% 100%",
            WebkitBackgroundClip: "text",     // <— force le clipping
            backgroundClip: "text",
            color: "transparent",             // <— rend le texte transparent
            display: "inline-block",          // <— évite les bizarreries inline
            lineHeight: 1,
            fontSize: "clamp(1.1rem, 0.9rem + 1.4vw, 1.4rem)",
            fontWeight: 800,
          }}
        >
          BASS
        </span>

        {/* espace fin non-break + S'TIVAL en accent */}
        <span className="align-middle">&nbsp;</span>

        <span
          className="align-middle"
          style={{
            color: "var(--accent)",
            fontSize: "clamp(1.1rem, 0.9rem + 1.4vw, 1.4rem)",
          }}
        >
          S&apos;TIVAL
        </span>
      </span>
    </Link>
  );
}
