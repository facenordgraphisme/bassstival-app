"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { listBookings, type Booking, BOOKING_STATUS_LABEL } from "@/lib/bookings";
import { listArtists, type Artist } from "@/lib/artists";
import Link from "next/link";

const STAGE_LABEL: Record<string, string> = {
  main: "Main Stage",
  second: "Alternative Stage",
  vip: "VIP",
};
const COLOR_BY_STATUS: Record<string, string> = {
  draft: "bg-gray-500/40",
  confirmed: "bg-green-500/60",
  played: "bg-blue-500/60",
  canceled: "bg-red-500/60",
};

const LEFT_GUTTER = 24;  // px pour l'initiale à gauche
const PX_PER_HOUR = 80;  // largeur d’une “colonne” heure

// Fenêtre journalière souhaitée : 10:00 -> 03:00 (J+1)
const START_HOUR = 10;
const END_HOUR_NEXT = 3;

function dateToISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export default function PlanningClient() {
  // ----- Sélecteur de date (jour du festival)
  const [isoDate, setIsoDate] = useState<string>(dateToISODate(new Date()));

  // Début = jour à 10:00 ; Fin = jour+1 à 03:00
  const dayStart = useMemo(() => {
    const d = new Date(isoDate + "T00:00:00");
    d.setHours(START_HOUR, 0, 0, 0);
    return d;
  }, [isoDate]);

  const dayEnd = useMemo(() => {
    const d = new Date(isoDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    d.setHours(END_HOUR_NEXT, 0, 0, 0);
    return d;
  }, [isoDate]);

  // Bookings filtrés sur la fenêtre 10:00 -> 03:00 (J+1)
  const { data: bookings } = useSWR<Booking[]>(
    ["bookings-planning", isoDate],
    () => listBookings({ from: dayStart.toISOString(), to: dayEnd.toISOString() }),
    { fallbackData: [] }
  );

  const { data: artists } = useSWR<Artist[]>("artists-all", () => listArtists(), { fallbackData: [] });

  const artistNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of artists ?? []) m.set(a.id, a.name);
    return m;
  }, [artists]);

  // Groupé par scène
  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings ?? []) {
      const stage = b.stage ?? "main";
      if (!map.has(stage)) map.set(stage, []);
      map.get(stage)!.push(b);
    }
    for (const arr of map.values()) arr.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    return Array.from(map.entries());
  }, [bookings]);

  // Grille horaire sur la fenêtre choisie
  const minMs = +dayStart;
  const maxMs = +dayEnd;
  const totalHours = Math.max(1, (maxMs - minMs) / (1000 * 60 * 60)); // attendu: 17h
  const pxPerMs = (PX_PER_HOUR * totalHours) / (maxMs - minMs || 1);
  const timelineWidth = LEFT_GUTTER + (maxMs - minMs) * pxPerMs;

  // Ticks de 10:00 → 23:00 puis 00:00 → 03:00
  const hoursTicks = useMemo(() => {
    const out: number[] = [];
    for (let h = START_HOUR; h < 24; h++) out.push(h);
    for (let h = 0; h <= END_HOUR_NEXT; h++) out.push(h);
    return out;
  }, []);

  const prettyDate = useMemo(() => {
    const d = new Date(isoDate + "T12:00:00");
    return d.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }, [isoDate]);

  const shiftDay = (delta: number) => {
    const d = new Date(isoDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setIsoDate(dateToISODate(d));
  };

  return (
    <div className="space-y-8">
      {/* Barre de filtres/choix de date */}
      <div className="card flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <div className="text-xs opacity-70 mb-1">Jour</div>
          <input
            type="date"
            className="input w-[14rem]"
            value={isoDate}
            onChange={(e) => setIsoDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => shiftDay(-1)}>← Jour précédent</button>
          <button className="btn-ghost" onClick={() => setIsoDate(dateToISODate(new Date()))}>Aujourd’hui</button>
          <button className="btn-ghost" onClick={() => shiftDay(1)}>Jour suivant →</button>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold">
          Planning • <span className="opacity-80">{prettyDate}</span>
        </h1>
        <div className="text-xs opacity-70">
          Fenêtre affichée : 10:00 → 03:00 (le lendemain), tout en restant sur la journée sélectionnée.
        </div>
      </div>

      {/* Timeline par scène */}
      <div className="space-y-12">
        {grouped.map(([stage, list]) => (
          <section key={stage} className="space-y-3">
            <h2 className="text-lg font-bold">{STAGE_LABEL[stage] ?? stage}</h2>

            <div className="relative overflow-x-auto border-t border-white/10">
              <div
                className="relative"
                style={{
                  minWidth: timelineWidth,
                  backgroundImage: `repeating-linear-gradient(
                    to right,
                    rgba(255,255,255,0.06) 0,
                    rgba(255,255,255,0.06) 1px,
                    transparent 1px,
                    transparent ${PX_PER_HOUR}px
                  )`,
                  backgroundPosition: `${LEFT_GUTTER}px 0`,
                }}
              >
                {/* En-tête heures */}
                <div className="flex text-xs opacity-70 mb-1" style={{ paddingLeft: LEFT_GUTTER }}>
                  {hoursTicks.map((h, i) => (
                    <div key={i} style={{ width: PX_PER_HOUR, textAlign: "center" }}>
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {/* Lignes */}
                <div className="space-y-2">
                  {list.map((b) => {
                    const a = +new Date(b.startAt);
                    const z = +new Date(b.endAt);
                    const clampedA = Math.max(a, minMs);
                    const clampedZ = Math.min(z, maxMs);
                    const left = LEFT_GUTTER + (clampedA - minMs) * pxPerMs;
                    const width = Math.max(2, (clampedZ - clampedA) * pxPerMs);

                    return (
                      <div key={b.id} className="relative h-10">
                        <div className="absolute left-0 w-[24px] text-[11px] pr-1 text-right opacity-80">
                          {artistNameById.get(b.artistId)?.[0] ?? "•"}
                        </div>

                        <Link
                          href={`/bookings/${b.id}`}
                          className={`absolute top-0 h-6 rounded ${COLOR_BY_STATUS[b.status]} text-[11px] text-white flex items-center justify-center focus:ring-2 ring-white/40`}
                          style={{ left, width }}
                          title={`${artistNameById.get(b.artistId) ?? "?"} • ${BOOKING_STATUS_LABEL[b.status]}`}
                        >
                          {artistNameById.get(b.artistId) ?? "?"}
                        </Link>
                      </div>
                    );
                  })}

                  {(list ?? []).length === 0 && (
                    <div className="text-sm opacity-70 px-1 py-2">
                      Aucun créneau pour cette scène sur cette plage horaire.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="text-sm opacity-70">Aucun booking sur cette plage horaire.</div>
        )}
      </div>
    </div>
  );
}
