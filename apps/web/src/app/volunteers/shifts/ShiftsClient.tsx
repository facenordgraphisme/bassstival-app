"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { listShifts, createShift, deleteShift } from "@/lib/api";
import type { Shift } from "@/lib/volunteers";
import { Plus, Trash2, Calendar, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import AssignmentsPanel from "./AssignmentsPanel";
import { Team, TEAM_KEYS, TEAM_LABEL } from "@/lib/teams";

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

/* ---------- helpers UI: surface cohérente avec les autres pages ---------- */
const tileBase =
  "group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-white/5 " +
  "backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)] " +
  "transition-[transform,box-shadow,border-color,background] duration-300 will-change-transform " +
  "hover:scale-[1.015] hover:bg-white/[0.07] " +
  "hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)] " +
  "focus-within:ring-2 focus-within:ring-[var(--accent)]/40 p-4 sm:p-5";

function TileDecor() {
  return (
    <>
      {/* halo conique piloté par le thème */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
          style={{
            background:
              "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 28%, transparent), color-mix(in srgb, var(--vio) 28%, transparent), color-mix(in srgb, var(--flame) 22%, transparent), color-mix(in srgb, var(--cyan) 28%, transparent))",
          }}
        />
      </span>
      {/* fin anneau subtil */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-[color-mix(in_srgb,var(--vio)_20%,transparent)] opacity-40 pointer-events-none group-hover:opacity-60"
      />
    </>
  );
}

/* ---------- dates ---------- */
function fromLocalDatetimeValue(val: string) {
  // '2025-07-12T18:00' -> ISO
  return new Date(val).toISOString();
}

export default function ShiftsClient({ initial }: { initial: Shift[] }) {
  const [team, setTeam] = useState<Team | "">("");
  const [from, setFrom] = useState<string>(""); // datetime-local
  const [to, setTo] = useState<string>("");     // datetime-local
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    team: Team | "";
    title: string;
    startAt: string; // datetime-local
    endAt: string;   // datetime-local
    capacity: number;
    location: string;
    notes: string;
  }>({
    team: "",
    title: "",
    startAt: "",
    endAt: "",
    capacity: 1,
    location: "",
    notes: "",
  });

  const { data, mutate, isLoading } = useSWR<Shift[]>(
    ["volunteers", "shifts", team || "-", from || "-", to || "-"],
    () =>
      listShifts({
        team: team || undefined,
        from: from ? fromLocalDatetimeValue(from) : undefined,
        to: to ? fromLocalDatetimeValue(to) : undefined,
      }),
    { fallbackData: initial, keepPreviousData: true }
  );

  const grouped = useMemo(() => {
    const rows = (data || []).slice().sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const byDay = new Map<string, Shift[]>();
    for (const s of rows) {
      const d = new Date(s.startAt);
      const key = d.toLocaleDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(s);
    }
    return Array.from(byDay.entries()); // [ [dateLabel, shifts[]], ... ]
  }, [data]);

  const onCreate = async () => {
    if (!form.team || !form.title || !form.startAt || !form.endAt) {
      toast.error("Team, titre et horaires requis");
      return;
    }
    const s = new Date(form.startAt);
    const e = new Date(form.endAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
      toast.error("Plage horaire invalide (fin après début)");
      return;
    }

    const t = toast.loading("Création du shift…");
    try {
      await createShift({
        team: form.team,
        title: form.title.trim(),
        startAt: fromLocalDatetimeValue(form.startAt),
        endAt: fromLocalDatetimeValue(form.endAt),
        capacity: Number(form.capacity) || 1,
        location: form.location?.trim() || null,
        notes: form.notes?.trim() || null,
      });
      toast.success("Shift créé ✅", { id: t });
      setShowForm(false);
      setForm({ team: "", title: "", startAt: "", endAt: "", capacity: 1, location: "", notes: "" });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur création";
      toast.error(msg, { id: t });
    }
  };

  const onDelete = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteShift(id);
      toast.success("Shift supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur suppression";
      toast.error(msg, { id: t });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Équipe</label>
            <select className="input" value={team} onChange={(e) => setTeam(e.target.value as Team | "")}>
              <option value="">Toutes</option>
              {TEAM_KEYS.map((t) => (
                <option key={t} value={t}>{TEAM_LABEL[t]}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Du</label>
            <input className="input" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div className="flex flex-col">
            <label className="text-xs opacity-70 mb-1">Au</label>
            <input className="input" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          {(from || to || team) && (
            <button className="btn-ghost self-start sm:self-end" onClick={() => { setTeam(""); setFrom(""); setTo(""); }}>
              Réinitialiser
            </button>
          )}
        </div>

        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouveau shift
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="card space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs opacity-70 mb-1 block">Équipe</label>
              <select
                className="input w-full"
                value={form.team}
                onChange={(e) => setForm((f) => ({ ...f, team: e.target.value as Team }))}
              >
                <option value="">— Choisir —</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs opacity-70 mb-1 block">Titre</label>
              <input
                className="input w-full"
                placeholder="Service Bar 18-21"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs opacity-70 mb-1 block">Début</label>
              <input
                className="input w-full"
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs opacity-70 mb-1 block">Fin</label>
              <input
                className="input w-full"
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs opacity-70 mb-1 block">Capacité</label>
              <input
                className="input w-full"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              />
            </div>

            <div>
              <label className="text-xs opacity-70 mb-1 block">Lieu</label>
              <input
                className="input w-full"
                placeholder="Bar central"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs opacity-70 mb-1 block">Notes</label>
              <textarea
                className="input w-full h-20"
                placeholder="Détails / consignes…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn" onClick={onCreate}>Créer</button>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-8">
        {isLoading && <div className="opacity-70 text-sm">Chargement…</div>}
        {grouped.length === 0 && !isLoading && <div className="opacity-70 text-sm">Aucun shift.</div>}

        {grouped.map(([dayLabel, rows]) => (
          <section key={dayLabel} className="space-y-3">
            <h2 className="text-lg font-bold">{dayLabel}</h2>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((s) => {
                const isOpen = openId === s.id;
                return (
                  <div key={s.id} id={`shift-${s.id}`} className={tileBase}>
                    <TileDecor />

                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-wide opacity-70">{TEAM_LABEL[s.team]}</div>
                        <div className="flex items-center gap-1">
                          <button className="btn-ghost" onClick={() => setOpenId(isOpen ? null : s.id)}>
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Gérer
                          </button>
                          <button className="btn-ghost" onClick={() => onDelete(s.id)} title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="text-lg font-semibold">{s.title}</div>

                      <div className="text-sm flex items-center gap-2 opacity-80">
                        <Calendar size={16} />
                        <span>
                          {new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" — "}
                          {new Date(s.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="text-sm flex items-center gap-2 opacity-80">
                        <MapPin size={16} />
                        <span>{s.location || "—"}</span>
                      </div>

                      <div className="text-sm opacity-80">
                        Capacité: <strong>{s.capacity}</strong>
                      </div>

                      {s.notes && <div className="text-xs opacity-70">{s.notes}</div>}

                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <AssignmentsPanel shiftId={s.id} team={s.team} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
