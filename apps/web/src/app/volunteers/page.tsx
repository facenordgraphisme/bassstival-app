// src/app/volunteers/page.tsx
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { FadeUp } from "@/components/FX";
import { MotionDiv } from "@/components/Motion";
import { Users, CalendarClock, LayoutGrid, Eye } from "lucide-react";

/* ——— Fond léger façon aurora ——— */
function AuroraThin() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-soft-light
                      [background-image:radial-gradient(#fff_1px,transparent_1px)]
                      [background-size:3px_3px]" />
      <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem]
                      bg-[radial-gradient(closest-side,_var(--cyan)/35,_transparent)]
                      blur-3xl animate-[spin_60s_linear_infinite]" />
      <div className="absolute -bottom-40 -right-40 h-[42rem] w-[42rem]
                      bg-[radial-gradient(closest-side,_var(--vio)/35,_transparent)]
                      blur-3xl animate-[spin_80s_linear_infinite]" />
    </div>
  );
}

/* ——— Tuile (glow + tilt) ——— */
/* ---------- Tile (same as home: conic glow + halo + lift) ---------- */
/* ---------- Tile (identique home, mais BLOCK + H-FULL pour clipper le glow) ---------- */
function Tile({
  href, title, desc, icon,
}: { href: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group block h-full relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md
                 shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)] transition-transform will-change-transform
                 hover:scale-[1.015] focus-visible:scale-[1.015] focus:outline-none"
      style={{ transform: "perspective(1200px) translateZ(0)" }}
    >
      {/* glow sweep piloté par le thème (clipé par overflow + radius) */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
          style={{
            background:
              "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 30%, transparent), color-mix(in srgb, var(--vio) 30%, transparent), color-mix(in srgb, var(--flame) 30%, transparent), color-mix(in srgb, var(--cyan) 30%, transparent))",
          }}
        />
      </div>

      {/* halo doux d’accent */}
      <div
        className="absolute -top-12 -left-12 h-40 w-40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
      />

      <div className="relative z-10 flex gap-4 items-start">
        <div className="p-3 rounded-xl bg-white/10 ring-1 ring-white/15">{icon}</div>
        <div>
          <div className="text-lg font-bold">{title}</div>
          <div className="opacity-70 text-sm">{desc}</div>
        </div>
      </div>
    </Link>
  );
}



/* ——— Page ——— */
export default function VolunteersHome() {
  return (
    <FadeUp className="relative space-y-8">
      <AuroraThin />

      {/* Header responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-3">
              <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
            <h1
              className="text-2xl md:text-3xl font-extrabold leading-tight break-words whitespace-normal title-underline"
              style={{ fontFamily: "var(--font-title)" }}
            >
              Bénévoles
            </h1>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs md:text-sm opacity-80">
              4 sections
            </span>
          </div>
          <p className="opacity-80 text-sm md:text-base leading-snug pt-2">
            Recrutement, gestion des équipes, <span className="mark-neon">shifts</span> et suivi en temps réel —
            tout pour orchestrer une team au top 🔥
          </p>
        </div>

        {/* zone CTA (laisse vide pour l’instant) */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end w-full sm:w-auto" />
      </div>

      {/* Grille 1/2/4 colonnes + hauteurs égales */}
      <MotionDiv
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10%" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* chaque enfant est wrappé pour l’anim, et la tuile a h-full */}
        <MotionDiv variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
          <Tile
            href="/volunteers/list"
            title="Liste des bénévoles"
            desc="Ajouter, rechercher, filtrer par équipe."
            icon={<Users size={28} aria-hidden />}
          />
        </MotionDiv>

        <MotionDiv variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
          <Tile
            href="/volunteers/shifts"
            title="Shifts"
            desc="Créneaux par équipe, création/édition."
            icon={<CalendarClock size={28} aria-hidden />}
          />
        </MotionDiv>

        <MotionDiv variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
          <Tile
            href="/volunteers/planning"
            title="Planning"
            desc="Affectations et suivi des postes."
            icon={<LayoutGrid size={28} aria-hidden />}
          />
        </MotionDiv>

        <MotionDiv variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
          <Tile
            href="/volunteers/monitoring"
            title="Temps réel"
            desc="Shifts en direct."
            icon={<Eye size={28} aria-hidden />}
          />
        </MotionDiv>
      </MotionDiv>

      <div className="hr-neon" />
    </FadeUp>
  );
}
