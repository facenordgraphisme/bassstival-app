import Link from "next/link";
import { FadeUp } from "@/components/FX";
import { ClipboardList, Users, Music3, CalendarClock } from "lucide-react";

function Tile({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: React.ReactNode; }) {
  return (
    <Link href={href} className="card neon lift p-5 flex gap-4 items-center hover:scale-[1.01] transition">
      <div className="p-3 rounded-xl bg-white/5">{icon}</div>
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="opacity-70 text-sm">{desc}</div>
      </div>
    </Link>
  );
}

export default function Page() {
  return (
    <FadeUp className="space-y-8">
      <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
        Bassstival • Tableau de bord
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile
          href="/tools"
          title="Outils (Prêts)"
          desc="Créer et gérer les fiches de prêt, suivre les retours."
          icon={<ClipboardList size={28} aria-hidden />}
        />
        <Tile
          href="/volunteers"
          title="Bénévoles"
          desc="Gérer les bénévoles, shifts et affectations."
          icon={<Users size={28} aria-hidden />}
        />
        <Tile
          href="/lineup"
          title="Line Up"
          desc="Artistes, bookings, planning et impression."
          icon={<Music3 size={28} aria-hidden />}
        />
      </div>
    </FadeUp>
  );
}
