import Link from "next/link";
import { FadeUp } from "@/components/FX";
import { Users, CalendarClock, LayoutGrid, LucideView } from "lucide-react";
import BackButton from "@/components/BackButton";

function Tile({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card neon lift p-5 flex gap-4 items-center hover:scale-[1.01] transition"
    >
      <div className="p-3 rounded-xl bg-white/5">{icon}</div>
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="opacity-70 text-sm">{desc}</div>
      </div>
    </Link>
  );
}

export default function VolunteersHome() {
  return (
    <FadeUp className="space-y-8">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
          <h1
            className="text-3xl font-extrabold title-underline"
            style={{ fontFamily: "var(--font-title)" }}
          >
        Bénévoles
        </h1>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Tile
          href="/volunteers/list"
          title="Liste des bénévoles"
          desc="Ajouter, rechercher, filtrer par équipe."
          icon={<Users size={28} aria-hidden />}
        />
        <Tile
          href="/volunteers/shifts"
          title="Shifts"
          desc="Créneaux par équipe, création/édition."
          icon={<CalendarClock size={28} aria-hidden />}
        />
        <Tile
          href="/volunteers/planning"
          title="Planning"
          desc="Affectations et suivi des postes."
          icon={<LayoutGrid size={28} aria-hidden />}
        />
        <Tile
          href="/volunteers/monitoring"
          title="Temps réel"
          desc="Shifts en direct"
          icon={<LucideView size={28} aria-hidden />}
        />
      </div>
    </FadeUp>
  );
}
