// app/lineup/page.tsx
import Link from "next/link";
import { FadeUp } from "@/components/FX";
import BackButton from "@/components/BackButton";
import { Music3, CalendarClock, LayoutGrid, Printer } from "lucide-react";

function Tile({
  href, title, desc, icon,
}: { href: string; title: string; desc: string; icon: React.ReactNode }) {
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

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export default function LineupHome() {
  return (
    <FadeUp className="space-y-8">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1
          className="text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Artistes & Line-up
        </h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Tile
          href="/artists"
          title="Liste des artistes"
          desc="Prospects, contacts, fiches & infos."
          icon={<Music3 size={28} aria-hidden />}
        />
        <Tile
          href="/bookings"
          title="Créneaux"
          desc="Créneaux et scènes par artiste."
          icon={<CalendarClock size={28} aria-hidden />}
        />
        <Tile
          href="/bookings/planning"
          title="Planning"
          desc="Vue timeline par scène."
          icon={<LayoutGrid size={28} aria-hidden />}
        />
      </div>
    </FadeUp>
  );
}
