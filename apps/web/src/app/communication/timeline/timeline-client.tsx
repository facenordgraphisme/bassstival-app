"use client";


import useSWR from "swr";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { toast } from "sonner";
import {
  listEvents, createEvent, patchEvent, removeEvent,
  CHANNEL_LABELS, STATUS_LABELS,
  type CommEvent, type CommChannel, type CommStatus
} from "@/lib/communication";
import { Search, Plus, Trash2, AlertCircle } from "lucide-react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion"; // 👈 plus de useScroll
import ChannelMultiSelect from "@/components/ChannelMultiSelect";

/* ---------- UI helpers ---------- */
function ChannelBadges({ channels }: { channels: CommChannel[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {channels.map((c) => (
        <span key={c} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs">
          {CHANNEL_LABELS[c]}
        </span>
      ))}
    </div>
  );
}

function MonthLabel({ label }: { label: string }) {
  return (
    <li className="list-none relative flex justify-center my-2">
      <div
        className="
          sticky top-2 z-20
          rounded-full border border-white/10 bg-black/60 backdrop-blur
          px-3 py-1 text-xs uppercase tracking-wide opacity-90
          shadow-[0_10px_25px_-15px_rgba(0,0,0,.6)]
        "
        style={{ fontFamily: "var(--font-title)" }}
      >
        {label}
      </div>
    </li>
  );
}

/* ---------- Timeline Item (alterné) ---------- */
/* ---------- Timeline Item (alterné) ---------- */
/* ---------- Timeline Item (final) ---------- */
function TimelineItem({ e, side }: { e: CommEvent; side: "left" | "right" }) {
  const now = Date.now();
  const late =
    !!e.scheduledAt &&
    new Date(e.scheduledAt).getTime() < now &&
    e.status !== "published" &&
    e.status !== "canceled";

  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-18% 0% -18% 0%" });

  return (
    <li
      className="
        grid md:grid-cols-[1fr_1.25rem_1fr]
        items-start   /* ✅ aligne les rangées en haut */
        list-none
      "
    >
      {/* rail gauche (placeur) */}
      <div className={`md:pr-6 ${side === "left" ? "" : "md:opacity-0 md:pointer-events-none"}`} />

      {/* ✅ colonne Axe — dot parfaitement centré verticalement par rapport à la carte */}
      <div className="relative md:col-start-2 flex justify-center">
        <span
          aria-hidden
          className={`
            absolute z-20 h-3 w-3 rounded-full ring-4 ring-black
            ${late ? "bg-red-500" : "bg-white"}
          `}
          style={{
            top: "calc(50% - 0.375rem)", // 50% de la hauteur du conteneur, corrigé du rayon
            transform: "translateY(-50%)",
          }}
        />
      </div>

      {/* rail droit (placeur) */}
      <div className={`md:pl-6 ${side === "right" ? "" : "md:opacity-0 md:pointer-events-none"}`} />

      {/* carte */}
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-22% 0px -22% 0px" }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`
          relative max-w-xl md:row-start-1
          ${side === "left" ? "md:col-start-1 md:justify-self-end" : "md:col-start-3 md:justify-self-start"}
          group isolate overflow-hidden rounded-2xl
          border border-white/10 bg-white/5 backdrop-blur-md
          shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
          transition-[transform,background,border-color] duration-300
          hover:-translate-y-0.5 hover:bg-white/[0.07]
          hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
          p-4 md:p-5
        `}
        style={{ transform: inView ? undefined : "scale(0.97)" }}
      >
        {/* Auras */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[28%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(28rem 28rem at 30% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[30%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 delay-75 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(26rem 26rem at 80% 50%, color-mix(in srgb, var(--vio) 18%, transparent), transparent 60%)",
          }}
        />

        {/* contenu */}
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-lg truncate" title={e.title}>
                {e.title}
              </div>
              <div className="text-xs opacity-75">
                {e.scheduledAt ? new Date(e.scheduledAt).toLocaleString() : "Non planifié"} • {STATUS_LABELS[e.status]}
                {late && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300">
                    <AlertCircle size={12} /> En retard
                  </span>
                )}
              </div>
            </div>
            <button
              className="btn-ghost"
              title="Supprimer"
              onClick={async () => {
                const t = toast.loading("Suppression…");
                try {
                  await removeEvent(e.id);
                  toast.success("Supprimé", { id: t });
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Erreur", { id: t });
                }
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="mt-2">
            <ChannelBadges channels={e.channels} />
          </div>

          <div className="mt-3">
            <select
              className="input !py-1 !px-2 text-sm"
              defaultValue={e.status}
              onChange={async (ev) => {
                const t = toast.loading("Mise à jour…");
                try {
                  await patchEvent(e.id, { status: ev.target.value as CommStatus });
                  toast.success("Statut mis à jour", { id: t });
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "Erreur", { id: t });
                }
              }}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>
    </li>
  );
}



/* ---------- Page ---------- */
export default function TimelineClient() {
  const [q, setQ] = useState("");
  const [filterChannels, setFilterChannels] = useState<CommChannel[]>([]);
  const [filterStatus, setFilterStatus] = useState<"" | CommStatus>("");

  // events à venir
  const { data, mutate, isLoading } = useSWR<{ data: CommEvent[] }>(
    ["comm-events", [...filterChannels].sort().join(","), filterStatus],
    () =>
      listEvents({
        includePast: false,
        channels: filterChannels.length ? filterChannels : undefined,
        status: filterStatus || undefined,
      }),
    { keepPreviousData: true, fallbackData: { data: [] } }
  );

  // retard
  const { data: overdueData } = useSWR<{ data: CommEvent[] }>(
    ["comm-events-overdue", "includePast"],
    () => listEvents({ includePast: true }),
    { keepPreviousData: true, fallbackData: { data: [] } }
  );

  const overdue = useMemo(() => {
    const now = Date.now();
    return (overdueData?.data ?? [])
      .filter(
        (e) =>
          e.scheduledAt &&
          new Date(e.scheduledAt).getTime() < now &&
          e.status !== "published" &&
          e.status !== "canceled"
      )
      .slice(-10);
  }, [overdueData]);

  // const rows = data?.data ?? [];

  // filtre texte + tri
  const filtered = useMemo(() => {
    const rows = (data?.data ?? []) as CommEvent[];
    const s = q.trim().toLowerCase();
    const base = s
      ? rows.filter((r) =>
          [r.title, r.body ?? "", r.hashtags ?? ""].join(" ").toLowerCase().includes(s)
        )
      : rows;

    return [...base].sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
      return ta - tb;
    });
  }, [data, q]);
  // Groupes par mois
  const groups = useMemo(() => {
    const g: { month: string; items: CommEvent[] }[] = [];
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    let currentKey = "";
    for (const e of filtered) {
      const key = e.scheduledAt ? e.scheduledAt.slice(0, 7) : "no-date"; // YYYY-MM
      if (key !== currentKey) {
        currentKey = key;
        g.push({
          month: e.scheduledAt ? fmt(new Date(e.scheduledAt)) : "Sans date",
          items: [e],
        });
      } else {
        g[g.length - 1].items.push(e);
      }
    }
    return g;
  }, [filtered]);

  /* ---------- Création rapide ---------- */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{
    title: string;
    channels: CommChannel[];
    status: CommStatus;
    scheduled_at: string;
  }>({ title: "", channels: ["facebook_post"], status: "idea", scheduled_at: "" });

  const onCreate = async () => {
    if (!createForm.title.trim()) return toast.error("Le titre est requis");
    if (createForm.channels.length === 0) return toast.error("Choisir au moins un canal");
    const t = toast.loading("Création…");
    try {
      await createEvent({
        title: createForm.title.trim(),
        channels: createForm.channels,
        status: createForm.status,
        scheduled_at: createForm.scheduled_at
          ? new Date(createForm.scheduled_at).toISOString()
          : undefined,
      });
      toast.success("Événement créé", { id: t });
      setCreateForm({ title: "", channels: ["facebook_post"], status: "idea", scheduled_at: "" });
      setShowCreate(false);
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur création", { id: t });
    }
  };

/* ---------- Axe coloré au scroll (hooks tjs appelés) ---------- */
const scrollRef = useRef<HTMLDivElement>(null);

// 0..1 motion value
const rawProgress = useMotionValue(0);

// Réglages
const SPEED = 1.15;          // 👈 barre un peu plus rapide que le scroll (1 = même vitesse)
const START_OFFSET = 0.20;    // 👈 commence quand le haut du bloc arrive à 80% du viewport
const END_OFFSET   = 0.20;    // 👈 finit quand le bas du bloc est à 20% du viewport

// lissage
const smooth = useSpring(rawProgress, { stiffness: 60, damping: 24, mass: 0.6 });
// -> en hauteur CSS %
const filled = useTransform(smooth, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);

const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

useEffect(() => {
  if (!mounted) return;
  const el = scrollRef.current;
  if (!el) return;

  let raf = 0;

  const compute = () => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;

    // mapping “viewport-centric”
    const start = vh * (1 - START_OFFSET);       // ex: 80% du viewport
    const end   = -rect.height + vh * END_OFFSET; // ex: -H + 20% du viewport
    const y = rect.top;

    const t = (start - y) / (start - end);       // normalisation 0..1
    const clamped = Math.max(0, Math.min(1, t));

    // vitesse ajustable
    rawProgress.set(Math.min(1, clamped * SPEED));
  };

  const onScrollOrResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(compute);
  };

  // initial
  compute();
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScrollOrResize);
    window.removeEventListener("resize", onScrollOrResize);
  };
}, [mounted, rawProgress]);

  return (
    <div className="space-y-6">
      {/* Alerte retards */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
          <div className="font-semibold flex items-center gap-2 text-red-200">
            <AlertCircle size={16} /> Publications en retard
          </div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {overdue.slice(-5).map((o) => (
              <li key={o.id}>
                <span className="font-medium">{o.title}</span>{" — "}
                <span className="opacity-80">
                  {o.scheduledAt ? new Date(o.scheduledAt).toLocaleString() : "Non planifié"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtres + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="input-wrap">
            <input
              className="input input-icon w-64"
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Search className="icon-left" size={18} />
          </div>
          <ChannelMultiSelect value={filterChannels} onChange={setFilterChannels} />
          <select
            className="input"
            value={filterStatus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilterStatus((e.target.value as CommStatus) || "")
            }
          >
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouvel événement
        </button>
      </div>

      {/* Form créer */}
      {showCreate && (
        <div className="card space-y-3">
          <div className="grid sm:grid-cols-4 gap-3">
            <input
              className="input sm:col-span-2"
              placeholder="Titre (ex : Annonce Artiste 1)"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            />
            <ChannelMultiSelect
              value={createForm.channels}
              onChange={(channels) => setCreateForm((f) => ({ ...f, channels }))}
              className="sm:col-span-2"
            />
            <select
              className="input"
              value={createForm.status}
              onChange={(e) => setCreateForm((f) => ({ ...f, status: e.target.value as CommStatus }))}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="input sm:col-span-2"
              value={createForm.scheduled_at}
              onChange={(e) => setCreateForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>
              Annuler
            </button>
            <button className="btn" onClick={onCreate}>
              Créer
            </button>
          </div>
        </div>
      )}

      {/* TIMELINE ALTERNÉE */}
      {isLoading && <div className="opacity-70 text-sm">Chargement…</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="opacity-70 text-sm">Aucun événement à venir.</div>
      )}

      {filtered.length > 0 && (
        <div ref={scrollRef} className="relative">
          {/* Axe vertical (base + progression colorée) */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1">
            <div className="absolute inset-0 rounded-full bg-white/12" />
            {mounted && (
              <motion.div
                className="absolute left-0 right-0 rounded-full"
                style={{
                  height: filled, // 👈 piloté par notre calcul custom
                  background:
                    "linear-gradient(to bottom, color-mix(in srgb, var(--cyan) 60%, transparent), color-mix(in srgb, var(--vio) 60%, transparent))",
                }}
              />
            )}
          </div>

          <ol className="space-y-8 md:space-y-10 list-none">
            {groups.map((g, gi) => (
              <Fragment key={`group-${gi}`}>
                <MonthLabel label={g.month} />
                {g.items.map((e, i) => (
                  <TimelineItem
                    key={e.id}
                    e={e}
                    side={(gi + i) % 2 === 0 ? "left" : "right"}
                  />
                ))}
              </Fragment>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
