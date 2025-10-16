// app/volunteers/planning/PlanningGridClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Download, Printer, RefreshCw } from "lucide-react";
import type { Team, Shift, ShiftAssignments } from "@/lib/volunteers";
import { getShiftAssignments } from "@/lib/volunteers";
import { listShifts } from "@/lib/api";

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

/** Helpers temps */
function parseISOSafe(s: string) { const d = new Date(s); return isNaN(+d) ? null : d; }
function minutesSince(a: Date, b: Date) { return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000)); }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

/** Format HH:MM */
function fmtHM(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Lane packing (naïf & efficace)
 * trie par start, assigne un lane (colonne) pour éviter les chevauchements visuels
 */
function packLanes<T extends { startAt: string; endAt: string }>(rows: T[]) {
  const items = rows
    .map((r) => ({ ...r, _start: +new Date(r.startAt), _end: +new Date(r.endAt) }))
    .sort((a, b) => a._start - b._start);

  const lanes: { end: number }[] = [];
  const placed: (T & { lane: number })[] = [];

  for (const it of items) {
    let laneIndex = 0;
    while (laneIndex < lanes.length && lanes[laneIndex].end > it._start) {
      laneIndex++;
    }
    if (laneIndex === lanes.length) lanes.push({ end: it._end });
    else lanes[laneIndex].end = Math.max(lanes[laneIndex].end, it._end);

    placed.push({ ...(it as T), lane: laneIndex });
  }

  const laneCount = lanes.length;
  return { placed, laneCount };
}

export default function PlanningGridClient() {
  // Filtres
  const [day, setDay] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [team, setTeam] = useState<Team | "">("");

  // Range horaire (personnalisable)
  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(2); // jusqu’à 02:00 le lendemain

  // Construit la fenêtre temporelle (ex: 08:00 → +1j 02:00)
  const dayStart = useMemo(() => {
    const d = new Date(day);
    d.setHours(startHour, 0, 0, 0);
    return d;
  }, [day, startHour]);

  const dayEnd = useMemo(() => {
    const d = new Date(day);
    const eh = endHour;
    if (endHour <= startHour) {
      // endHour “le lendemain”
      d.setDate(d.getDate() + 1);
    }
    d.setHours(eh, 0, 0, 0);
    return d;
  }, [day, startHour, endHour]);

  // Charge shifts pour la fenêtre
  const { data: shifts, isLoading, mutate } = useSWR<Shift[]>(
    ["planning-grid", team || "-", day, startHour, endHour],
    () =>
      listShifts({
        team: team || undefined,
        from: dayStart.toISOString(),
        to: dayEnd.toISOString(),
      }),
    { keepPreviousData: true }
  );

  // Charge assignments pour chaque shift
  const [assignMap, setAssignMap] = useState<Record<string, ShiftAssignments>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!shifts || shifts.length === 0) { setAssignMap({}); return; }

      const ids = shifts.map(s => s.id);
      const missing = ids.filter(id => !assignMap[id]);

      if (missing.length === 0) return;
      try {
        const pairs = await Promise.all(
          missing.map(async (id) => {
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
      } catch {
        // noop
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts]);

  // Prépare les blocs positionnés
  const { placed, laneCount } = useMemo(() => {
    const rows = (shifts || []).filter(s => {
      const st = parseISOSafe(s.startAt);
      const en = parseISOSafe(s.endAt);
      if (!st || !en) return false;
      return en > dayStart && st < dayEnd; // overlap avec fenêtre
    });
    return packLanes(rows);
  }, [shifts, dayStart, dayEnd]);

  // Timeline (graduations heures)
  const hoursLabels = useMemo(() => {
    const labels: Date[] = [];
    const cur = new Date(dayStart);
    while (cur <= dayEnd) {
      labels.push(new Date(cur));
      cur.setHours(cur.getHours() + 1);
    }
    return labels;
  }, [dayStart, dayEnd]);

  // Mise à l’échelle : 1 min = X px
  const PX_PER_MIN = 1.2; // ajuste pour compacité
  const totalMinutes = minutesSince(dayStart, dayEnd);
  const gridHeight = Math.max(300, Math.round(totalMinutes * PX_PER_MIN));

  const onExport = () => {
    const base = process.env.NEXT_PUBLIC_API_URL!;
    const usp = new URLSearchParams();
    if (team) usp.set("team", team);
    usp.set("from", dayStart.toISOString());
    usp.set("to", dayEnd.toISOString());
    window.open(`${base}/volunteers/export/csv?${usp.toString()}`, "_blank");
  };

  const onPrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Filtres & actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Date</label>
            <input type="date" className="input" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>

          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Équipe</label>
            <select className="input min-w-40" value={team} onChange={(e) => setTeam(e.target.value as Team | "")}>
              <option value="">Toutes</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col">
              <label className="text-xs opacity-70 mb-1">Début (heure)</label>
              <input
                className="input w-28"
                type="number"
                min={0} max={23}
                value={startHour}
                onChange={(e) => setStartHour(clamp(+e.target.value || 0, 0, 23))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs opacity-70 mb-1">Fin (heure)</label>
              <input
                className="input w-28"
                type="number"
                min={0} max={23}
                value={endHour}
                onChange={(e) => setEndHour(clamp(+e.target.value || 0, 0, 23))}
              />
              <div className="text-[11px] opacity-60 mt-1">
                (si &lt; début → le lendemain)
              </div>
            </div>
          </div>

          {(team) && (
            <button className="btn-ghost self-start sm:self-end" onClick={() => setTeam("")}>
              Réinitialiser
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => mutate()}>
            <RefreshCw size={16} className="mr-2" /> Rafraîchir
          </button>
          <button className="btn" onClick={onExport}>
            <Download size={16} className="mr-2" /> Export CSV
          </button>
          <button className="btn" onClick={onPrint}>
            <Printer size={16} className="mr-2" /> Imprimer
          </button>
        </div>
      </div>

      {isLoading && <div className="text-sm opacity-70">Chargement…</div>}
      {!isLoading && (shifts || []).length === 0 && (
        <div className="text-sm opacity-70">Aucun shift dans la fenêtre.</div>
      )}

      {/* Time grid */}
      {(shifts || []).length > 0 && (
  <div className="card neon p-0 overflow-hidden">
    <div className="relative" style={{ height: gridHeight }}>
      {/* 1) Colonne des heures */}
      <div className="absolute top-0 left-0 h-full" style={{ width: 80 }}>
        {hoursLabels.map((h, i) => {
          const top = Math.round(minutesSince(dayStart, h) * PX_PER_MIN);
          return (
            <div key={i} className="absolute left-0 right-0" style={{ top }}>
              <div className="text-xs px-2 py-0.5">{fmtHM(h)}</div>
              <div className="h-px w-full bg-white/10" />
            </div>
          );
        })}
        {/* Bordure verticale séparatrice */}
        <div className="absolute top-0 right-0 h-full w-px bg-white/10" />
      </div>

      {/* 2) Zone des lanes (décalée de 80px) */}
      <div className="absolute top-0 right-0 h-full" style={{ left: 80 }}>
        {/* Lignes horaires en arrière-plan des lanes */}
        {hoursLabels.map((h, i) => {
          const top = Math.round(minutesSince(dayStart, h) * PX_PER_MIN);
          return (
            <div key={i} className="absolute left-0 right-0 h-px bg-white/5" style={{ top }} />
          );
        })}

        {/* Blocs positionnés */}
        {placed.map((s) => {
          const st = new Date(s.startAt);
          const en = new Date(s.endAt);
          const top = Math.round(minutesSince(dayStart, st) * PX_PER_MIN);
          const height = Math.max(24, Math.round(minutesSince(st, en) * PX_PER_MIN));

          const laneWidthPct = 100 / Math.max(1, laneCount);
          const leftPct = s.lane * laneWidthPct;

          const ass = assignMap[s.id];
          const used = ass?.used ?? 0;
          const cap = ass?.capacity ?? s.capacity ?? 0;
          const names = (ass?.assignments || [])
            .map(a => [a.firstName, a.lastName].filter(Boolean).join(" "))
            .filter(Boolean);

          return (
            <div
              key={s.id}
              className="absolute px-2 py-1 rounded-lg shadow-lg border border-white/15"
              style={{
                top,
                height,
                left: `${leftPct}%`,
                width: `calc(${laneWidthPct}% - 8px)`, // petit gutter
                marginLeft: 4,                         // évite de coller à la séparation
                background: "linear-gradient(180deg, rgba(150,200,255,0.16), rgba(100,160,240,0.10))",
                backdropFilter: "blur(1px)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide opacity-70">{s.team}</div>
                  <div className="text-sm font-semibold truncate">{s.title}</div>
                  <div className="text-[12px] opacity-80">
                    {fmtHM(st)} — {fmtHM(en)}{s.location ? ` • ${s.location}` : ""}
                  </div>
                </div>
                <a href={`/volunteers/shifts#shift-${s.id}`} className="badge">Ouvrir</a>
              </div>

              <div className="text-[12px] opacity-80 mt-1">
                Assignés: <b>{used}</b> / {cap}
              </div>

              {names.length > 0 && (
                <div className="mt-1">
                  <div className="text-[11px] opacity-70">Bénévoles :</div>
                  <div className="text-[12px] leading-tight line-clamp-3">
                    {names.join(", ")}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
)}

      {/* Styles print */}
      <style jsx global>{`
        @media print {
          header, nav, .btn, .btn-ghost, .input, .badge, select { display: none !important; }
          main { padding: 0 !important; }
          body { background: #fff !important; }
          .card { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
