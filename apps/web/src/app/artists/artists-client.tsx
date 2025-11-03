"use client";

import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import {
  listArtists,
  createArtist,
  updateArtist,
  deleteArtist,
  type Artist,
  type ArtistStatus,
  ARTIST_STATUS,
  ARTIST_STATUS_LABEL,
} from "@/lib/artists";
import {
  Search,
  Plus,
  MoreHorizontal,
  CalendarPlus,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { confirmWithSonner } from "@/components/confirmWithSonner";

// shadcn/ui
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* Badges (couleurs dispo dans ton global.css) */
const ARTIST_STATUS_BADGE: Record<ArtistStatus, string> = {
  prospect: "badge",
  pending: "badge",        // neutre
  confirmed: "badge-green",
  canceled: "badge-red",
};

function StatusBadge({ status }: { status: ArtistStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 ${ARTIST_STATUS_BADGE[status]}`}>
      {ARTIST_STATUS_LABEL[status]}
    </span>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

export default function ArtistsClient() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ArtistStatus | "">("");

  const { data, mutate, isLoading } = useSWR<Artist[]>(
    ["artists", q, status || "-"],
    () => listArtists({ q, status: status || undefined }),
    { keepPreviousData: true, fallbackData: [] }
  );

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    genre: "",
    agency: "",
    status: "prospect" as ArtistStatus,
  });

  // Création (optimistic insert + revalidation)
  const onCreate = async () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    const payload = { ...form, notes: null };
    const t = toast.loading("Création…");
    try {
      const created = await createArtist(payload);
      const matches =
        (!q || created.name.toLowerCase().includes(q.toLowerCase())) &&
        (!status || created.status === status);

      mutate((prev) => {
        const list = prev ?? [];
        return matches ? [...list, created].sort((a, b) => a.name.localeCompare(b.name)) : list;
      }, false);

      mutate(); // revalidate
      toast.success("Artiste créé", { id: t });
      setShowForm(false);
      setForm({ name: "", genre: "", agency: "", status: "prospect" });
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // Changement statut (optimistic + rollback)
  const changeStatus = async (artist: Artist, next: ArtistStatus) => {
    if (artist.status === next) return;
    const prev = data ?? [];
    mutate(prev.map(a => a.id === artist.id ? { ...a, status: next } : a), { revalidate: false });
    try {
      await updateArtist(artist.id, { status: next });
      toast.success("Statut mis à jour");
      mutate();
    } catch {
      mutate(prev, { revalidate: false });
    }
  };

  // Suppression (confirm Sonner)
  const removeArtist = async (artist: Artist) => {
    const ok = await confirmWithSonner(
      `Supprimer “${artist.name}” ?`,
      "Les contacts, coûts et bookings rattachés seront également supprimés.",
      "Supprimer",
      "Annuler"
    );
    if (!ok) return;

    const prev = data ?? [];
    mutate(prev.filter(a => a.id !== artist.id), { revalidate: false });
    try {
      await toast.promise(deleteArtist(artist.id), {
        loading: "Suppression…",
        success: "Artiste supprimé",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3 items-end">
          <div className="input-wrap">
            <input
              className="input input-icon w-64"
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Search className="icon-left" size={18} aria-hidden />
          </div>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as ArtistStatus | "")}
          >
            <option value="">Tous statuts</option>
            {ARTIST_STATUS.map((s) => (
              <option key={s} value={s}>
                {ARTIST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-1" /> Nouvel artiste
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Nom"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Genre"
              value={form.genre}
              onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Agence / Label"
              value={form.agency}
              onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))}
            />
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ArtistStatus }))}
            >
              {ARTIST_STATUS.map((s) => (
                <option key={s} value={s}>
                  {ARTIST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>
              Annuler
            </button>
            <button className="btn" onClick={onCreate}>
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading && <div className="text-sm opacity-70">Chargement…</div>}
      {!isLoading && (data ?? []).length === 0 && (
        <div className="text-sm opacity-70">Aucun artiste.</div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(data ?? []).map((a) => (
          <div
            key={a.id}
            className="
              group relative isolate overflow-hidden rounded-2xl
              border border-white/10 bg-white/5 backdrop-blur-md
              shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
              transition-[transform,background,border-color] duration-300 will-change-transform
              hover:-translate-y-0.5 hover:bg-white/[0.07]
              hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
            "
          >
            {/* 1) couche “sweep” comme sur la Home */}
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div
                className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
                style={{
                  background:
                    "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 30%, transparent), color-mix(in srgb, var(--vio) 30%, transparent), color-mix(in srgb, var(--flame) 30%, transparent), color-mix(in srgb, var(--cyan) 30%, transparent))",
                }}
              />
            </div>

            {/* 2) petit halo accent (piloté par --accent) */}
            <div
              aria-hidden
              className="absolute -top-12 -left-12 h-40 w-40 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)" }}
            />

            {/* 3) contenu */}
            <div className="relative z-10 space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/artists/${a.id}`} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center text-sm font-bold">
                    {a.name?.[0]?.toUpperCase() ?? "A"}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold leading-tight">{a.name}</div>
                    <StatusBadge status={a.status} />
                  </div>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="btn-ghost p-2" aria-label="Actions">
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-56 bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-xl text-foreground shadow-lg backdrop-blur"
                  >
                    <DropdownMenuLabel className="opacity-70">Actions</DropdownMenuLabel>

                    <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 rounded-lg cursor-pointer">
                      <Link href={`/artists/${a.id}`} className="flex w-full items-center">
                        <ExternalLink size={16} className="mr-2" />
                        Voir la fiche
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 rounded-lg cursor-pointer">
                      <Link href={`/bookings?artistId=${a.id}`} className="flex w-full items-center">
                        <CalendarPlus size={16} className="mr-2" />
                        Nouveau booking
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuItem
                      onClick={() => removeArtist(a)}
                      className="text-red-500 focus:text-red-500 hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm opacity-80">
                <div>Genre: {a.genre || "—"}</div>
                <div>Agence: {a.agency || "—"}</div>
              </div>

              <div className="space-y-2">
                <label className="text-xs opacity-70 block">Statut</label>
                <select
                  className="input w-full"
                  value={a.status}
                  onChange={(e) => changeStatus(a, e.target.value as ArtistStatus)}
                >
                  {ARTIST_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {ARTIST_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>

                <div className="flex justify-between items-center pt-2">
                  <Link className="btn-ghost" href={`/bookings?artistId=${a.id}`}>
                    Nouveau booking
                  </Link>
                </div>
              </div>
            </div>
          </div>

        ))}
      </div>
    </div>
  );
}
