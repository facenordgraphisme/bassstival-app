"use client";

import useSWR from "swr";
import { useEffect, useState, useCallback } from "react";
import {
  getSurvey,
  addCandidate,
  patchCandidate,
  removeCandidate,
  voteCandidate,
  type PollSurveyDetail,
} from "@/lib/polls";
import { getSurveyVoters, type PollVoters } from "@/lib/polls";
import { toast } from "sonner";
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import BackButton from "@/components/BackButton";
import Image from "next/image";

/* ---------- Modal d'édition ---------- */
function EditCandidateModal({
  open,
  onClose,
  onSave,
  form,
  setForm,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: {
    artist_name: string;
    genre: string;
    youtube_link: string;
    image_url: string;
    description: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      artist_name: string;
      genre: string;
      youtube_link: string;
      image_url: string;
      description: string;
    }>
  >;
}) {
  // Fermer sur ESC
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  // Bloquer le scroll arrière-plan quand la modale est ouverte
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      {/* overlay click */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="
          relative max-w-2xl w-full rounded-xl border border-white/10
          bg-zinc-900 p-4 md:p-5 space-y-4
          shadow-[0_25px_80px_rgba(0,0,0,.55)]
        "
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">Modifier l’artiste</div>
          <button className="btn-ghost" onClick={onClose} title="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Nom de l’artiste"
            value={form.artist_name}
            onChange={(e) => setForm((f) => ({ ...f, artist_name: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Genre musical"
            value={form.genre}
            onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
          />
          <textarea
            className="input md:col-span-2 min-h-24"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Lien YouTube (chaîne)"
            value={form.youtube_link}
            onChange={(e) => setForm((f) => ({ ...f, youtube_link: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Image (URL) — optionnel"
            value={form.image_url}
            onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn" onClick={onSave}>
            <Save size={16} className="mr-2" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SurveyClient({ surveyId }: { surveyId: string }) {
  const { data: session } = useSession();
  const meId = session?.user?.id ?? "";

  const { data, mutate, isLoading } = useSWR<PollSurveyDetail>(
    ["survey", surveyId],
    () => getSurvey(surveyId),
    { keepPreviousData: true }
  );

  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const candidates = data?.candidates ?? [];
  const current = candidates[i];
  const isOwner = data?.created_by === meId;

  const next = () => setI((v) => Math.min(v + 1, candidates.length - 1));
  const prev = () => setI((v) => Math.max(v - 1, 0));

  /* ---------- ADD CANDIDATE (owner only) ---------- */
  const [createForm, setCreateForm] = useState({
    artist_name: "",
    genre: "",
    youtube_link: "",
    image_url: "",
    description: "",
  });
  const onAdd = async () => {
    if (
      !createForm.artist_name.trim() ||
      !createForm.genre.trim() ||
      !createForm.youtube_link.trim()
    ) {
      return toast.error("Nom artiste, genre et lien YouTube sont requis");
    }
    const t = toast.loading("Ajout…");
    try {
      await addCandidate(surveyId, {
        artist_name: createForm.artist_name.trim(),
        genre: createForm.genre.trim(),
        youtube_link: createForm.youtube_link.trim(),
        image_url: createForm.image_url.trim() || undefined,
        description: createForm.description.trim() || undefined,
        order: candidates.length,
      });
      toast.success("Artiste ajouté", { id: t });
      setCreateForm({
        artist_name: "",
        genre: "",
        youtube_link: "",
        image_url: "",
        description: "",
      });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur ajout";
      toast.error(msg, { id: t });
    }
  };

  /* ---------- EDIT/DELETE CANDIDATE (owner only) ---------- */
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    artist_name: "",
    genre: "",
    youtube_link: "",
    image_url: "",
    description: "",
  });
  const openEdit = (c: PollSurveyDetail["candidates"][number]) => {
    setEditId(c.id);
    setEditForm({
      artist_name: c.artist_name,
      genre: c.genre,
      youtube_link: c.youtube_link,
      image_url: c.image_url ?? "",
      description: (c as any).description ?? "",
    });
  };
  const saveEdit = async () => {
    if (!editId) return;
    const t = toast.loading("Mise à jour…");
    try {
      await patchCandidate(surveyId, editId, {
        artist_name: editForm.artist_name.trim(),
        genre: editForm.genre.trim(),
        youtube_link: editForm.youtube_link.trim(),
        image_url: editForm.image_url.trim() || undefined,
        description: editForm.description.trim() || undefined,
      });
      toast.success("Modifié", { id: t });
      setEditId(null);
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg, { id: t });
    }
  };
  const del = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await removeCandidate(surveyId, id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg, { id: t });
    }
  };

  /* ---------- VOTE ---------- */
  const onVote = async (candidateId: string, choice: "yes" | "no" | "abstain") => {
    const t = toast.loading("Vote…");
    try {
      await voteCandidate(candidateId, choice);
      toast.success("Vote enregistré", { id: t });
      mutate();
      mutateVoters?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur vote";
      toast.error(msg, { id: t });
    }
  };

  const [showVoters, setShowVoters] = useState(false);
  const {
    data: votersData,
    isLoading: votersLoading,
    mutate: mutateVoters,
  } = useSWR<PollVoters>(
    showVoters ? ["survey-voters", surveyId] : null,
    () => getSurveyVoters(surveyId),
    { keepPreviousData: true }
  );

  if (isLoading) return <div className="opacity-70 text-sm">Chargement…</div>;
  if (!data) return <div className="opacity-70 text-sm">Introuvable.</div>;

  const isFirst = i === 0;
  const isLast = i === candidates.length - 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Bloc gauche : titre + description */}
        <div className="w-full sm:w-auto">
          {/* Ligne titre + retour + badge */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <BackButton className="!px-2.5 !py-1.5" />
            <h1
              className="text-2xl md:text-3xl font-extrabold leading-tight break-words whitespace-normal title-underline"
              style={{ fontFamily: "var(--font-title)" }}
            >
              {data.title}
            </h1>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs md:text-sm opacity-80">
              {candidates.length} champ{candidates.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Description */}
          {data.description && (
            <p className="opacity-80 text-sm md:text-base leading-relaxed mt-3 pl-10 sm:pl-[3.2rem] max-w-2xl">
              {data.description}
            </p>
          )}
        </div>

        {/* Bloc droit : actions */}
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end w-full sm:w-auto sm:pt-1">
          <button
            className="btn w-full sm:w-auto"
            onClick={() => {
              if (candidates.length === 0) {
                toast.info(
                  isOwner
                    ? "Ajoute d’abord des artistes au sondage"
                    : "Aucun artiste dans ce sondage"
                );
                return;
              }
              setI(0);
              setOpen(true);
            }}
          >
            Ouvrir le sondage
          </button>

          <button
            className="btn-ghost w-full sm:w-auto"
            onClick={() => setShowVoters((v) => !v)}
          >
            {showVoters ? "Masquer les détails" : "Voir détails des votes"}
          </button>
        </div>
      </div>

      {/* Owner: add form */}
      {isOwner && (
        <div className="card space-y-3">
          <div className="text-lg font-bold">Ajouter un artiste</div>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Nom de l’artiste"
              value={createForm.artist_name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, artist_name: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Genre musical"
              value={createForm.genre}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, genre: e.target.value }))
              }
            />
            <textarea
              className="input md:col-span-2 min-h-24"
              placeholder="Description (quelques phrases) – optionnel"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Lien YouTube ou autre"
              value={createForm.youtube_link}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, youtube_link: e.target.value }))
              }
            />
            <input
              className="input"
              placeholder="Image (URL) — optionnel"
              value={createForm.image_url}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, image_url: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={onAdd}>
              <Plus size={16} className="mr-2" /> Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Liste des artistes */}
      {candidates.length === 0 ? (
        <div className="opacity-70 text-sm">
          Aucun artiste dans ce sondage.
          {isOwner ? " Ajoute des artistes via le formulaire ci-dessus." : ""}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {candidates.map((c) => (
            <div
              key={c.id}
              className="
                group relative isolate overflow-hidden rounded-2xl
                border border-white/10 bg-white/5 backdrop-blur-md
                shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
                transition-[transform,background,border-color] duration-300 will-change-transform
                hover:-translate-y-0.5 hover:bg-white/[0.07]
                hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
              "
            >
              {/* GLOW 1 */}
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
              {/* GLOW 2 */}
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.artist_name}</div>
                    <div className="text-sm opacity-80">{c.genre}</div>
                    {(c as any).description && (
                      <p className="text-sm opacity-80 mt-1 line-clamp-3">
                        {(c as any).description}
                      </p>
                    )}
                  </div>
                  <a
                    href={c.youtube_link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost shrink-0"
                    title="Ouvrir le lien"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {c.image_url ? (
                  <div className="relative h-40 rounded-md overflow-hidden border border-white/10">
                    <Image
                      src={c.image_url}
                      alt={c.artist_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 p-6 text-sm opacity-70">
                    Aucune image
                  </div>
                )}

                <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm flex items-center justify-between">
                  <div className="opacity-80">Résultats</div>
                  <div className="font-mono">
                    Oui {c.results.yes} | Non {c.results.no} | Abst {c.results.abstain}
                  </div>
                </div>

                {isOwner && (
                  <div className="flex justify-end gap-2">
                    <button className="btn-ghost" onClick={() => openEdit(c)} title="Modifier">
                      <Pencil size={16} />
                    </button>
                    <button className="btn-ghost" onClick={() => del(c.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showVoters && (
        <div className="card space-y-4">
          <div className="text-lg font-bold">Synthèse des votes</div>
          {votersLoading && <div className="opacity-70 text-sm">Chargement…</div>}
          {!votersLoading && (!votersData || votersData.candidates.length === 0) && (
            <div className="opacity-70 text-sm">Aucun vote.</div>
          )}
          {votersData &&
            votersData.candidates.map((cv) => (
              <div key={cv.id} className="rounded-md border border-white/10 p-3 space-y-2">
                <div className="font-semibold">{cv.artist_name}</div>
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="opacity-70 mb-1">
                      Oui ({cv.voters.yes.length})
                    </div>
                    <ul className="space-y-0.5">
                      {cv.voters.yes.map((u) => (
                        <li key={u.id} className="truncate">
                          {u.name}
                        </li>
                      ))}
                      {cv.voters.yes.length === 0 && <li className="opacity-60">—</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="opacity-70 mb-1">
                      Non ({cv.voters.no.length})
                    </div>
                    <ul className="space-y-0.5">
                      {cv.voters.no.map((u) => (
                        <li key={u.id} className="truncate">
                          {u.name}
                        </li>
                      ))}
                      {cv.voters.no.length === 0 && <li className="opacity-60">—</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="opacity-70 mb-1">
                      Abstention ({cv.voters.abstain.length})
                    </div>
                    <ul className="space-y-0.5">
                      {cv.voters.abstain.map((u) => (
                        <li key={u.id} className="truncate">
                          {u.name}
                        </li>
                      ))}
                      {cv.voters.abstain.length === 0 && <li className="opacity-60">—</li>}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal carrousel */}
      {open && candidates.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-zinc-900 rounded-xl border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">{data.title}</div>
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Fermer
              </button>
            </div>

            {current && (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-semibold">{current.artist_name}</div>
                    <div className="opacity-80">{current.genre}</div>
                    {(current as any).description && (
                      <p className="text-sm opacity-80 mt-2 max-w-prose">
                        {(current as any).description}
                      </p>
                    )}
                  </div>
                  <a
                    href={current.youtube_link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>

                {current.image_url ? (
                  <div className="relative h-64 rounded-lg overflow-hidden border border-white/10">
                    <Image
                      src={current.image_url}
                      alt={current.artist_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 768px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-white/10 p-10 text-sm opacity-70 text-center">
                    Aucune image
                  </div>
                )}

                {/* Vote radio */}
                <div className="space-y-2">
                  <div className="text-sm opacity-80">Votre vote :</div>
                  <div className="flex items-center gap-4">
                    {(["yes", "no", "abstain"] as const).map((opt) => (
                      <label key={opt} className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`vote-${current.id}`}
                          className="accent-current"
                          checked={current.my_vote === opt}
                          onChange={() => onVote(current.id, opt)}
                        />
                        <span className="text-sm capitalize">
                          {opt === "yes" ? "Oui" : opt === "no" ? "Non" : "S’abstiens"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-md bg-white/5 p-3 text-sm flex items-center justify-between">
                  <div className="opacity-80">Résultats :</div>
                  <div className="font-mono">
                    Oui {current.results.yes} | Non {current.results.no} | Abst{" "}
                    {current.results.abstain}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    className={`btn-ghost inline-flex items-center gap-1 ${
                      isFirst ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                    onClick={isFirst ? undefined : prev}
                    disabled={isFirst}
                    aria-disabled={isFirst}
                    tabIndex={isFirst ? -1 : 0}
                    title={isFirst ? "Début" : "Précédent"}
                  >
                    <ChevronLeft size={16} /> Précédent
                  </button>

                  <div className="text-sm opacity-80">
                    {i + 1} / {candidates.length}
                  </div>

                  <button
                    className={`btn-ghost inline-flex items-center gap-1 ${
                      isLast ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                    onClick={isLast ? undefined : next}
                    disabled={isLast}
                    aria-disabled={isLast}
                    tabIndex={isLast ? -1 : 0}
                    title={isLast ? "Dernier" : "Suivant"}
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal d’édition (z-50) */}
      {isOwner && (
        <EditCandidateModal
          open={!!editId}
          onClose={() => setEditId(null)}
          onSave={saveEdit}
          form={editForm}
          setForm={setEditForm}
        />
      )}
    </div>
  );
}
