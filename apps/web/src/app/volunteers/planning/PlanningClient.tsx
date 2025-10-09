"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Printer, RefreshCw, Calendar, MapPin, Users } from "lucide-react";
import {
  listMonitoring, // on ne l'utilise pas ici, mais dispo si tu veux des compteurs
  listVolunteers,
  getShiftAssignments,
  type Team,
  type Shift,
  type ShiftAssignments,
} from "@/lib/volunteers";
import { listShifts } from "@/lib/api"; // déjà existant côté loans/shifts

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

// Helpers date
function toDayStart(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function toDayEnd(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

// Obtenir les noms jolis
function fullName(a?: { firstName?: string | null; lastName?: string | null }) {
  return [a?.firstName, a?.lastName].filter(Boolean).join(" ");
}

export default function PlanningClient() {
  // Par défaut : aujourd’hui
  const [day, setDay] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [team, setTeam] = useState<Team | "">("");

  // Charger les shifts du jour/équipe
  const { data: shifts, isLoading, mutate } = useSWR<Shift[]>(
    ["planning", team || "-", day],
    () =>
      listShifts({
        team: team || undefined,
        from: toDayStart(day),
        to: toDayEnd(day),
      }),
    { keepPreviousData: true }
  );

  // Charger les assignments pour chaque shift (en parallèle)
  const [assignMap, setAssignMap] = useState<Record<string, ShiftAssignments>>({});
  const [loadingAssign, setLoadingAssign] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!shifts) return;
      setLoadingAssign(true);
      try {
        // Eviter de recharger ce qu'on a déjà
        const idsToFetch = shifts
          .map(s => s.id)
          .filter(id => !assignMap[id]); // si déjà chargé, skip

        if (idsToFetch.length === 0) {
          setLoadingAssign(false);
          return;
        }

        const pairs = await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const data = await getShiftAssignments(id);
              return [id, data] as const;
            } catch (e) {
              return [id, null] as const;
            }
          })
        );

        if (!cancelled) {
          const next = { ...assignMap };
          for (const [id, data] of pairs) {
            if (data) next[id] = data;
          }
          setAssignMap(next);
        }
      } finally {
        if (!cancelled) setLoadingAssign(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [shifts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Groupage par créneau horaire (heure de début, option simple et lisible)
  const groups = useMemo(() => {
    const map = new Map<string, Shift[]>();
    (shifts || [])
      .slice()
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
      .forEach(s => {
        const d = new Date(s.startAt);
        const key = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // ex: 18:00
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      });
    return Array.from(map.entries()); // [ [ "18:00", Shift[] ], ... ]
  }, [shifts]);

  // Export CSV (utilise l’endpoint existant)
  const onExport = () => {
    const base = process.env.NEXT_PUBLIC_API_URL!;
    const usp = new URLSearchParams();
    if (team) usp.set("team", team);
    usp.set("from", toDayStart(day));
    usp.set("to", toDayEnd(day));
    window.open(`${base}/volunteers/export/csv?${usp.toString()}`, "_blank");
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filtres + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Date</label>
            <input
              type="date"
              className="input"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Équipe</label>
            <select
              className="input min-w-40"
              value={team}
              onChange={(e) => setTeam(e.target.value as Team | "")}
            >
              <option value="">Toutes</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {(team) && (
            <button className="btn-ghost self-start sm:self-end" onClick={() => setTeam("")}>
              Réinitialiser
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => mutate()}>
            <RefreshCw size={16} className="mr-2" />
            Rafraîchir
          </button>
          <button className="btn" onClick={onExport}>
            <Download size={16} className="mr-2" />
            Export CSV
          </button>
          <button className="btn" onClick={onPrint}>
            <Printer size={16} className="mr-2" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Etat chargement */}
      {(isLoading || loadingAssign) && (
        <div className="text-sm opacity-70">Chargement…</div>
      )}

      {/* Vide */}
      {!isLoading && (shifts || []).length === 0 && (
        <div className="text-sm opacity-70">Aucun shift pour cette journée / équipe.</div>
      )}

      {/* “Calendrier” du jour : sections par heure de début */}
      <div className="space-y-8 print:space-y-4">
        {groups.map(([hour, rows]) => (
          <section key={hour} className="space-y-3 break-inside-avoid">
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold">{hour}</div>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 print:grid-cols-2">
              {rows.map((s) => {
                const ass = assignMap[s.id];
                const volunteers = (ass?.assignments || []).map(a => fullName(a)).filter(Boolean);

                return (
                  <div key={s.id} className="card neon space-y-2 print:shadow-none print:border print:border-white/20">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs uppercase tracking-wide opacity-70">{s.team}</div>
                        <div className="text-lg font-semibold">{s.title}</div>
                        <div className="text-sm opacity-80 flex items-center gap-2">
                          <Calendar size={16} />
                          <span>
                            {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" — "}
                            {new Date(s.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {s.location && (
                          <div className="text-sm opacity-80 flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{s.location}</span>
                          </div>
                        )}
                        <div className="text-sm opacity-80 flex items-center gap-2">
                          <Users size={16} />
                          <span>Capacité: <b>{s.capacity}</b></span>
                          <span className="opacity-70">•</span>
                          <span>Assignés: <b>{ass?.used ?? 0}</b></span>
                        </div>
                      </div>

                      <Link href={`/volunteers/shifts#shift-${s.id}`} className="btn-ghost">
                        Ouvrir
                      </Link>
                    </div>

                    <div className="hr-neon" />

                    <div className="space-y-1">
                      <div className="text-xs opacity-70">Bénévoles assignés :</div>
                      {volunteers.length === 0 ? (
                        <div className="text-sm opacity-70">— Aucun</div>
                      ) : (
                        <ul className="text-sm list-disc pl-5">
                          {volunteers.map((name, i) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {s.notes && <div className="text-xs opacity-70">{s.notes}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Styles print rapides */}
      <style jsx global>{`
        @media print {
          header, nav, .btn, .btn-ghost, .neon-switch, .input, .input-wrap { display: none !important; }
          .title-underline::after { display: none !important; }
          main { padding: 0 !important; }
          .card { break-inside: avoid; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
