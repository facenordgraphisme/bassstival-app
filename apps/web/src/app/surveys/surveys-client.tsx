"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { listSurveys, createSurvey, deleteSurvey, type PollSurvey } from "@/lib/polls";
import { Search, Plus, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function SurveysClient() {
  const { data: session } = useSession();
  const meId = session?.user?.id ?? "";
  const myRoles = (session?.user?.roles ?? []) as string[];
  const isAdmin = myRoles.includes("admin");

  const { data, mutate, isLoading } = useSWR<PollSurvey[]>(
    ["poll-surveys"],
    listSurveys,
    { keepPreviousData: true, fallbackData: [] }
  );

  /* ---------- Filtres ---------- */
  const [q, setQ] = useState("");
  const rows = data ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((p) =>
      [p.title, p.description ?? ""].join(" ").toLowerCase().includes(s)
    );
  }, [rows, q]);

  /* ---------- Création ---------- */
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "" });

  const onCreate = async () => {
    if (!createForm.title.trim()) return toast.error("Le titre du sondage est requis");
    const t = toast.loading("Création du sondage…");
    try {
      await createSurvey({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
      });
      toast.success("Sondage créé", { id: t });
      setCreateForm({ title: "", description: "" });
      setShowCreate(false);
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la création", { id: t });
    }
  };

  const onDeleteSurvey = async (id: string) => {
    const t = toast.loading("Suppression du sondage…");
    try {
      await deleteSurvey(id);
      toast.success("Sondage supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur suppression", { id: t });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="input-wrap">
          <input
            className="input input-icon w-72"
            placeholder="Rechercher un sondage…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="icon-left" size={18} />
        </div>
        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouveau sondage
        </button>
      </div>

      {/* Form créer sondage */}
      {showCreate && (
        <div className="card space-y-3">
          <div className="grid gap-3">
            <input
              className="input"
              placeholder="Titre du sondage (ex : Prospects 2026 – House)"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            />
            <textarea
              className="input min-h-24"
              placeholder="Description (contexte optionnel)"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
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

      {/* Liste */}
      {isLoading && <div className="opacity-70 text-sm">Chargement…</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="opacity-70 text-sm">Aucun sondage.</div>
      )}

      {filtered.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const isOwner = s.created_by === meId;
            return (
              <div
                key={s.id}
                className="
                  group relative isolate overflow-hidden rounded-2xl
                  border border-white/10 bg-white/5 backdrop-blur-md
                  shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
                  transition-[transform,background,border-color] duration-300 will-change-transform
                  hover:-translate-y-0.5 hover:bg-white/[0.07]
                  hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
                "
              >
                {/* GLOWS — éléments réels (pas de ::before/::after) */}
                <div
                  aria-hidden
                  className="
                    pointer-events-none absolute -inset-[28%] rounded-[22px] z-0
                    opacity-0 transition-opacity duration-300
                    group-hover:opacity-100
                  "
                  style={{
                    background:
                      "radial-gradient(28rem 28rem at 30% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%)",
                  }}
                />
                <div
                  aria-hidden
                  className="
                    pointer-events-none absolute -inset-[30%] rounded-[22px] z-0
                    opacity-0 transition-opacity duration-300 delay-75
                    group-hover:opacity-100
                  "
                  style={{
                    background:
                      "radial-gradient(26rem 26rem at 80% 50%, color-mix(in srgb, var(--vio) 18%, transparent), transparent 60%)",
                  }}
                />

                {/* CONTENU */}
                <div className="relative z-10 p-5 space-y-3">
                  <div className="space-y-1">
                    <Link
                      href={`/surveys/${s.id}`}
                      className="font-semibold text-lg truncate hover:underline"
                      title="Ouvrir"
                    >
                      {s.title}
                    </Link>
                    {s.description && (
                      <div className="text-sm opacity-80 line-clamp-3">{s.description}</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm flex items-center justify-between">
                    <div className="opacity-80">
                      {isOwner ? "Vous êtes le créateur" : "Sondage"}
                    </div>
                    <div className="flex items-center gap-2">
                      {(isOwner || isAdmin) && (
                        <button
                          className="btn-ghost"
                          title="Supprimer le sondage"
                          onClick={() => onDeleteSurvey(s.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <Link
                        href={`/surveys/${s.id}`}
                        className="btn-ghost inline-flex items-center gap-1"
                        title="Ouvrir"
                      >
                        Ouvrir <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
