"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  listBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  type Booking,
  BOOKING_STATUS_BADGE,
  BOOKING_STATUS_LABEL,
} from "@/lib/bookings";
import { listArtists, type Artist, type Stage } from "@/lib/artists";
import { toast } from "sonner";
import { confirmWithSonner } from "@/components/confirmWithSonner";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const STAGES: Stage[] = ["main", "second"];
const STAGE_LABEL: Record<Stage, string> = {
  main: "Main stage",
  second: "Alternative stage",
};

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

export default function BookingsClient({ initialArtistId = "" }: { initialArtistId?: string }) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { data, mutate, isLoading } = useSWR<Booking[]>(
    ["bookings", from || "-", to || "-"],
    () =>
      listBookings({
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      }),
    { keepPreviousData: true, fallbackData: [] }
  );

  const { data: artists } = useSWR<Artist[]>("artists-all", () => listArtists(), { fallbackData: [] });

  const artistNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of artists ?? []) m.set(a.id, a.name);
    return m;
  }, [artists]);

  // ----- Création rapide -----
  const [form, setForm] = useState<{ artistId: string; startAt: string; endAt: string; stage: Stage }>({
    artistId: initialArtistId,
    startAt: "",
    endAt: "",
    stage: "main",
  });

  const onCreate = async () => {
    if (!form.artistId || !form.startAt || !form.endAt) {
      toast.error("Champs requis : artiste, début, fin");
      return;
    }
    const sa = new Date(form.startAt);
    const ea = new Date(form.endAt);
    if (isNaN(+sa) || isNaN(+ea) || ea <= sa) {
      toast.error("Horaires invalides (fin après début)");
      return;
    }

    const t = toast.loading("Création…");
    try {
      await createBooking({
        artistId: form.artistId,
        stage: form.stage,
        startAt: sa.toISOString(),
        endAt: ea.toISOString(),
      });
      toast.success("Booking créé ✅", { id: t });
      setForm({ artistId: initialArtistId, startAt: "", endAt: "", stage: "main" });
      mutate();
    } catch (e) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // ----- Edition inline -----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ stage: Stage; startAt: string; endAt: string }>({
    stage: "main",
    startAt: "",
    endAt: "",
  });

  const startEdit = (b: Booking) => {
    setEditingId(b.id);
    setEdit({
      stage: (b.stage ?? "main") as Stage,
      startAt: b.startAt.slice(0, 16),
      endAt: b.endAt.slice(0, 16),
    });
  };

  const saveEdit = async (id: string) => {
    const sa = new Date(edit.startAt);
    const ea = new Date(edit.endAt);
    if (isNaN(+sa) || isNaN(+ea) || ea <= sa) {
      toast.error("Horaires invalides (fin après début)");
      return;
    }
    const t = toast.loading("Mise à jour…");
    try {
      await updateBooking(id, {
        stage: edit.stage,
        startAt: sa.toISOString(),
        endAt: ea.toISOString(),
      });
      toast.success("Booking mis à jour", { id: t });
      setEditingId(null);
      mutate();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const onDelete = async (b: Booking, artistName: string) => {
    const ok = await confirmWithSonner(
      `Supprimer le booking de “${artistName}” ?`,
      "Cette action est définitive.",
      "Supprimer",
      "Annuler"
    );
    if (!ok) return;

    const prev = data ?? [];
    mutate(prev.filter((x) => x.id !== b.id), { revalidate: false });

    try {
      await toast.promise(deleteBooking(b.id), {
        loading: "Suppression…",
        success: "Booking supprimé",
        error: "Erreur lors de la suppression",
      });
      mutate();
    } catch {
      mutate(prev, { revalidate: false });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col">
          <label className="text-xs opacity-70 mb-1">Du</label>
          <input className="input" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs opacity-70 mb-1">Au</label>
          <input className="input" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <button
            className="btn-ghost self-end"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Création rapide */}
      <div className="card space-y-3">
        <div className="grid md:grid-cols-4 gap-3">
          {!initialArtistId && (
            <select
              className="input"
              value={form.artistId}
              onChange={(e) => setForm((f) => ({ ...f, artistId: e.target.value }))}
            >
              <option value="">— Artiste —</option>
              {(artists ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="input"
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as Stage }))}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
          />
          <input
            className="input"
            type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
          />
        </div>

        <div className="flex justify-end">
          <button className="btn" onClick={onCreate}>
            Créer
          </button>
        </div>
      </div>

      {/* Liste */}
      {isLoading && <div className="text-sm opacity-70">Chargement…</div>}
      {!isLoading && (data ?? []).length === 0 && <div className="text-sm opacity-70">Aucun booking.</div>}

      <div className="space-y-4">
        {(data ?? []).map((b) => {
          const artist = artistNameById.get(b.artistId) ?? "Artiste";
          const statusBadge = BOOKING_STATUS_BADGE[b.status] || "badge";
          const isEditing = editingId === b.id;

          return (
            <div
              key={b.id}
              className="
                group relative isolate overflow-hidden rounded-2xl
                border border-white/10 bg-black/30 backdrop-blur-md
                shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
                transition-[transform,background,border-color] duration-300 will-change-transform
                hover:-translate-y-0.5 hover:bg-black/35
                hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
              "
            >
              {/* overlay glow EXACTEMENT comme la home */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                  className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
                  style={{
                    background:
                      "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 30%, transparent), color-mix(in srgb, var(--vio) 30%, transparent), color-mix(in srgb, var(--flame) 30%, transparent), color-mix(in srgb, var(--cyan) 30%, transparent))",
                  }}
                />
              </div>
              <div
                className="absolute -top-12 -left-12 h-40 w-40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
              />

              {/* contenu au-dessus du glow */}
              <div className="relative z-10 space-y-3 p-5">
                {/* ---- Header ---- */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center text-sm font-bold">
                      {artist?.[0]?.toUpperCase() ?? "A"}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold leading-tight">
                        {artist} • {STAGE_LABEL[b.stage ?? "main"]}
                      </div>
                      <span className={statusBadge}>{BOOKING_STATUS_LABEL[b.status]}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/bookings/${b.id}`} className="btn-ghost">Ouvrir</Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="btn-ghost btn-icon" aria-label="Actions">
                          <MoreHorizontal size={18} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-48 bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-xl text-foreground shadow-lg backdrop-blur"
                      >
                        <DropdownMenuItem onClick={() => startEdit(b)}>
                          <Pencil size={16} className="mr-2" />
                          Modifier date/heure & scène
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(b, artist)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* ---- Infos temps / éditeur (inchangé) ---- */}
                {!isEditing ? (
                  <div className="text-sm opacity-80">
                    {new Date(b.startAt).toLocaleString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}{" "}
                    → {new Date(b.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ) : (
                  <div className="space-y-3 flash">
                    <div className="grid md:grid-cols-3 gap-3">
                      {/* ... inputs d'édition identiques ... */}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button className="btn-ghost" onClick={() => setEditingId(null)}>Annuler</button>
                      <button className="btn" onClick={() => saveEdit(b.id)}>Enregistrer</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
