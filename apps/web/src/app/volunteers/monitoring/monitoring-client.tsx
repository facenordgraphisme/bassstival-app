"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { listMonitoring, type MonitoringRow, type Team } from "@/lib/volunteers";
import Link from "next/link";

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function statusFor(now: number, start: string, end: string) {
  const s = +new Date(start);
  const e = +new Date(end);
  if (now < s) return { label: "À venir",  cls: "badge" };
  if (now > e) return { label: "Terminé",  cls: "badge badge-green" };
  return { label: "EN COURS", cls: "badge badge-red" };
}

export default function MonitoringClient({ initial }: { initial: MonitoringRow[] }) {
  const [team, setTeam] = useState<Team | "">("");
  const [from, setFrom] = useState<string>("");
  const [to,   setTo]   = useState<string>("");

  const { data, isLoading, mutate } = useSWR<MonitoringRow[]>(
    ["monitoring", team || "-", from || "-", to || "-"],
    () => listMonitoring({
      team: team || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to:   to   ? new Date(to).toISOString()   : undefined,
    }),
    { fallbackData: initial, refreshInterval: 5000, keepPreviousData: true }
  );

  const grouped = useMemo(() => {
    const map = new Map<string, MonitoringRow[]>();
    for (const r of (data ?? [])) {
      const k = dayKey(r.startAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    for (const [, arr] of map) arr.sort((a,b) => +new Date(a.startAt)-+new Date(b.startAt));
    return Array.from(map.entries());
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Équipe</label>
            <select className="input" value={team} onChange={e => setTeam(e.target.value as Team | "")}>
              <option value="">Toutes</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Du</label>
            <input className="input" type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Au</label>
            <input className="input" type="datetime-local" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          {(team || from || to) && (
            <button className="btn-ghost self-start sm:self-end" onClick={() => { setTeam(""); setFrom(""); setTo(""); }}>
              Réinitialiser
            </button>
          )}
        </div>
        <button className="btn-ghost" onClick={() => mutate()}>Rafraîchir</button>
      </div>

      {isLoading && <div className="text-sm opacity-70">Chargement…</div>}
      {!isLoading && grouped.length === 0 && <div className="text-sm opacity-70">Aucun shift.</div>}

      {grouped.map(([label, rows]) => (
        <section key={label} className="space-y-3">
          <h2 className="text-lg font-bold">{label}</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(r => {
              const now = Date.now();
              const st = statusFor(now, r.startAt, r.endAt);
              const progress = Math.min(100, Math.round((r.inCount / Math.max(1, r.capacity)) * 100));
              const assignedPct = Math.min(100, Math.round((r.assigned / Math.max(1, r.capacity)) * 100));
              return (
                <div key={r.id} className="card neon space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide opacity-70">{r.team}</div>
                      <div className="text-lg font-semibold">{r.title}</div>
                      <div className="text-sm opacity-80">
                        {new Date(r.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" — "}
                        {new Date(r.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {r.location ? ` • ${r.location}` : ""}
                      </div>
                    </div>
                    <span className={st.cls}>{st.label}</span>
                  </div>

                  <div className="text-sm opacity-80">
                    Assignés: <b>{r.assigned}</b> / {r.capacity} ({assignedPct}%)
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded">
                    <div className="h-2 rounded" style={{ width: `${assignedPct}%`, background: "linear-gradient(90deg, #8ef, #6cf)" }} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="card border border-white/10 p-2">
                      <div className="opacity-70 text-xs">Check-in</div>
                      <div className="font-bold">{r.inCount}</div>
                    </div>
                    <div className="card border border-white/10 p-2">
                      <div className="opacity-70 text-xs">Finis</div>
                      <div className="font-bold">{r.doneCount}</div>
                    </div>
                    <div className="card border border-white/10 p-2">
                      <div className="opacity-70 text-xs">No-show</div>
                      <div className="font-bold">{r.noShow}</div>
                    </div>
                    <Link href={`/volunteers/shifts#shift-${r.id}`} className="btn mt-2 w-full text-center">
                      Ouvrir
                    </Link>
                  </div>

                  {r.notes && <div className="text-xs opacity-70">{r.notes}</div>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
