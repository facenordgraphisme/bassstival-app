"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listSurveys,
  createSurvey,
  deleteSurvey,
  patchSurvey, // 👈 doit exister dans ta lib
  type PollSurvey,
} from "@/lib/polls";
import { Search, Plus, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/* ------------ Toast de confirmation suppression ------------ */
function useConfirmDelete(onDelete: (id: string) => Promise<void>) {
  return (id: string) => {
    toast.custom(
      (t: string | number) => (
        <div
          className="
            rounded-xl border border-white/10 bg-black/70 backdrop-blur
            px-4 py-3 text-sm flex items-center gap-3
            shadow-[0_10px_30px_-15px_rgba(0,0,0,.7)]
          "
        >
          <div className="font-medium">Supprimer ce sondage ?</div>
          <div className="ml-auto flex gap-2">
            <button className="text-sm" onClick={() => toast.dismiss(t)}>
              Annuler
            </button>
            <button
              className="btn text-sm"
              onClick={async () => {
                toast.dismiss(t);
                const loading = toast.loading("Suppression du sondage…");
                try {
                  await onDelete(id);
                  toast.success("Sondage supprimé", { id: loading });
                } catch (e: any) {
                  toast.error(e?.message ?? "Erreur suppression", { id: loading });
                }
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };
}

/* ------------ Carte sondage ------------ */
function SurveyCard({
  s,
  isOwner,
  canEdit,
  onDeleteSurvey,
  revalidate,
  onConfirmDelete,
}: {
  s: PollSurvey;
  isOwner: boolean;
  canEdit: boolean;
  onDeleteSurvey: (id: string) => Promise<void>;
  revalidate: () => void;
  onConfirmDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(s.title);
  const [editDesc, setEditDesc] = useState(s.description ?? "");

  const onSave = async () => {
    if (!editTitle.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    const t = toast.loading("Mise à jour…");
    try {
      await patchSurvey(s.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
      });
      toast.success("Sondage mis à jour", { id: t });
      setEditing(false);
      revalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur de mise à jour", { id: t });
    }
  };

  const created = new Date(s.created_at);
  const dateStr = created.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <div className="
      group relative isolate overflow-hidden rounded-2xl
      border border-white/10 bg-white/5 backdrop-blur-md
      shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
      transition-[transform,background,border-color] duration-300
      hover:-translate-y-0.5 hover:bg-white/[0.07]
      hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
    ">
      {/* glows */}
      <div aria-hidden className="pointer-events-none absolute -inset-[28%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(28rem 28rem at 30% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 60%)" }} />
      <div aria-hidden className="pointer-events-none absolute -inset-[30%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 delay-75 group-hover:opacity-100"
        style={{ background: "radial-gradient(26rem 26rem at 80% 50%, color-mix(in srgb, var(--vio) 18%, transparent), transparent 60%)" }} />

      <div className="relative z-10 p-5 space-y-4">
        {!editing ? (
          <>
            {/* HEADER amélioré */}
            <div className="space-y-2">
              <Link
                href={`/surveys/${s.id}`}
                title={s.title}
                className="
                  block text-[1.25rem] font-extrabold leading-snug tracking-tight
                  hover:underline line-clamp-2 bg-clip-text text-transparent
                  bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.85))]
                "
                style={{ fontFamily: "var(--font-title)" }}
              >
                {s.title}
              </Link>

              {/* META: créateur • date • # artistes */}
              <div className="text-xs opacity-75 flex items-center gap-2 flex-wrap">
                <span>par <span className="font-bold opacity-90">{s.creator_name}</span></span>
                <span aria-hidden>•</span>
                <span>{dateStr}</span>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                  {s.candidates_count} artiste{s.candidates_count > 1 ? "s" : ""}
                </span>
              </div>

              {s.description && (
                <p className="text-sm opacity-80 line-clamp-3">{s.description}</p>
              )}
            </div>

            {/* FOOTER actions */}
            <div className="
              rounded-xl border border-white/10 bg-white/5 p-3 text-sm
              flex flex-wrap items-center justify-between gap-2
            ">
              <div className="opacity-80 min-w-[160px]">
                {isOwner ? "Vous êtes le créateur" : "Sondage"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <button
                    className="btn-ghost"
                    title="Modifier le sondage"
                    onClick={() => {
                      setEditTitle(s.title);
                      setEditDesc(s.description ?? "");
                      setEditing(true);
                    }}
                  >
                    Modifier
                  </button>
                )}
                {canEdit && (
                  <button
                    className="btn-ghost"
                    title="Supprimer le sondage"
                    onClick={() => onConfirmDelete(s.id)}
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
          </>
        ) : (
          <>
            <div className="grid gap-3">
              <input
                className="input"
                placeholder="Titre du sondage"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <textarea
                className="input min-h-24"
                placeholder="Description"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
              <button className="btn" onClick={onSave}>
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


/* ------------ Page Surveys ------------ */
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

  /* Filtres */
  const [q, setQ] = useState("");
  const rows = data ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((p) =>
      [p.title, p.description ?? ""].join(" ").toLowerCase().includes(s)
    );
  }, [rows, q]);

  /* Création */
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

  /* Suppression (avec confirmation) */
  const onDeleteSurvey = async (id: string) => {
    await deleteSurvey(id);
    await mutate();
  };
  const onConfirmDelete = useConfirmDelete(onDeleteSurvey);

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
            const canEdit = isOwner || isAdmin;
            return (
              <SurveyCard
                key={s.id}
                s={s}
                isOwner={isOwner}
                canEdit={canEdit}
                onDeleteSurvey={onDeleteSurvey}
                revalidate={mutate}
                onConfirmDelete={onConfirmDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
