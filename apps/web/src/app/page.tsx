// src/app/page.tsx
import Link from "next/link";
import { FadeUp } from "@/components/FX";
import { ClipboardList, Users, Music3, Shield, CheckCircle, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { hasAnyRole, SECTION_PERMS } from "@/lib/auth-roles";
import { MotionDiv } from "@/components/Motion";

/* ---------- Tile (hover glow + tilt) ---------- */
function Tile({
  href, title, desc, icon,
}: { href: string; title: string; desc: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md
                 shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)] transition-transform will-change-transform
                 hover:scale-[1.015] focus-visible:scale-[1.015] focus:outline-none"
      style={{ transform: "perspective(1200px) translateZ(0)" }}
    >
      {/* glow sweep piloté par le thème */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
          style={{
            background:
              "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 30%, transparent), color-mix(in srgb, var(--vio) 30%, transparent), color-mix(in srgb, var(--flame) 30%, transparent), color-mix(in srgb, var(--cyan) 30%, transparent))",
          }}
        />
      </div>

      {/* halo doux accent (aussi thémé) */}
      <div
        className="absolute -top-12 -left-12 h-40 w-40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
      />

      <div className="relative z-10 flex gap-4 items-center">
        <div className="p-3 rounded-xl bg-white/10 ring-1 ring-white/15">{icon}</div>
        <div>
          <div className="text-lg font-bold">{title}</div>
          <div className="opacity-70 text-sm">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Background: deterministic stars + aurora pilotées par thème ---------- */
function Aurora() {
  function* lcg(seed = 42) { let s = seed; while (true) { s = (s*1664525+1013904223)%4294967296; yield s/4294967296; } }
  const rnd = lcg(1337);
  const stars = Array.from({ length: 90 }).map((_, i) => {
    const x = (rnd.next().value as number) * 100;
    const y = (rnd.next().value as number) * 100;
    const r = (rnd.next().value as number) * 0.6 + 0.1;
    return { i, x, y, r };
  });

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {/* grain */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-soft-light [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:3px_3px]" />
      {/* stars */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_30%,#000_40%,transparent_100%)]">
        <svg className="w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><radialGradient id="g" r="1"><stop offset="0" stopColor="white"/><stop offset="1" stopColor="white" stopOpacity="0"/></radialGradient></defs>
          {stars.map(({ i, x, y, r }) => (<circle key={i} cx={x} cy={y} r={r} fill="url(#g)" />))}
        </svg>
      </div>
      {/* aurora blobs -> variables de thème */}
      <div
        className="absolute -top-40 -left-40 h-[55rem] w-[55rem] blur-3xl animate-[spin_50s_linear_infinite]"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 35%, transparent), transparent)" }}
      />
      <div
        className="absolute -bottom-40 -right-40 h-[55rem] w-[55rem] blur-3xl animate-[spin_70s_linear_infinite]"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--vio) 35%, transparent), transparent)" }}
      />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] blur-3xl animate-[spin_90s_linear_infinite]"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--flame) 30%, transparent), transparent)" }}
      />
    </div>
  );
}

/* ---------- Page ---------- */
export default async function Page() {
  const session = await auth();
  const roles = (session?.user?.roles ?? []) as string[];

  const canTools = hasAnyRole(roles, SECTION_PERMS.tools);
  const canVolunteers = hasAnyRole(roles, SECTION_PERMS.volunteers);
  const canLineup = hasAnyRole(roles, SECTION_PERMS.lineup);
  const canAdmin = hasAnyRole(roles, SECTION_PERMS.admin);
  const canPolls = roles.includes("polls");

  return (
    <div className="relative">
      <Aurora />

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-6 pt-8 sm:pt-12">
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-10 backdrop-blur-md mt-4"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight title-underline"
              style={{ fontFamily: "var(--font-title)" }}
            >
              Bassstival
            </h1>

            <p className="mt-4 text-white/80 text-base sm:text-lg">
              Plateforme équipe —{" "}
              <span className="text-white">bookings, bénévoles, prêts, line-up & sondages</span>. Tout pour faire vibrer le public 🌀
            </p>

            {/* badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                <Sparkles size={14} /> Plateforme collaborative
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                Temps réel
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                Travail en équipe
              </span>
            </div>

            {/* égaliseur thémé */}
            <div className="mt-8 flex items-end justify-center gap-1 h-8">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-sm"
                  style={{
                    background: "linear-gradient(to top, var(--cyan), var(--vio), var(--flame))",
                    height: "50%",
                    animation: `eq 1.2s ease-in-out ${i * 0.07}s infinite`,
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes eq { 0%,100%{ transform: scaleY(0.4);} 50%{ transform: scaleY(1);} }
            `}</style>
          </div>
        </MotionDiv>
      </section>

      {/* TILES */}
      <FadeUp className="mx-auto max-w-6xl px-6 pb-12 pt-8 space-y-6">
        <h2 className="text-xl font-extrabold opacity-90" style={{ fontFamily: "var(--font-title)" }}>
          Tableau de bord
        </h2>

        <div className="relative">
          {/* voile/halo piloté par --vio */}
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl border border-white/10" />
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-20 blur-2xl"
            style={{ background: "radial-gradient(ellipse at center, var(--vio) 0%, transparent 60%)" }}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {canTools && <Tile href="/tools" title="Outils (Prêts)" desc="Créer & suivre les fiches de prêt, retours, états." icon={<ClipboardList size={28} aria-hidden />} />}
            {canVolunteers && <Tile href="/volunteers" title="Bénévoles" desc="Recrutement, shifts & affectations faciles." icon={<Users size={28} aria-hidden />} />}
            {canLineup && <Tile href="/lineup" title="Line-Up" desc="Bookings, planning, exports & impressions." icon={<Music3 size={28} aria-hidden />} />}
            {canAdmin && <Tile href="/admin/users" title="Admin" desc="Utilisateurs, rôles & sécurité." icon={<Shield size={28} aria-hidden />} />}
            {canPolls && <Tile href="/surveys" title="Sondages" desc="Propose, vote, analyse les résultats." icon={<CheckCircle size={28} aria-hidden />} />}
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
