"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listPublications,
  createPublication,
  removePublication,
  patchPublication,
  getPublicationHistory,
  CHANNEL_LABELS,
  type CommPublication,
  type CommChannel,
  type CommPublicationHistoryItem, 
} from "@/lib/communication";
import { Search, Plus, Trash2, Check, History, Pencil } from "lucide-react";
import { useSession } from "next-auth/react";

/* ---------- Badges (affichage liste) ---------- */
function ChannelBadges({ channels }: { channels: CommChannel[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {channels.map((c) => (
        <span
          key={c}
          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs"
        >
          {CHANNEL_LABELS[c]}
        </span>
      ))}
    </span>
  );
}

/* ---------- Sélecteur multi-canaux réutilisable ---------- */
function ChannelMultiSelect({
  value,
  onChange,
  className,
  label = "Canaux",
}: {
  value: CommChannel[];
  onChange: (next: CommChannel[]) => void;
  className?: string;
  label?: string;
}) {
  const toggle = (c: CommChannel) =>
    onChange(value.includes(c) ? value.filter((v) => v !== c) : [...value, c]);

  const entries = Object.keys(CHANNEL_LABELS).map((k) => k as CommChannel);

  return (
    <div
      className={[
        "relative group/island isolate rounded-xl border border-white/10 bg-white/5",
        "shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]",
        "transition-[background,border-color] duration-300",
        "hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]",
        className ?? "",
      ].join(" ")}
    >
      {/* glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[28%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 group-hover/island:opacity-100"
        style={{
          background:
            "radial-gradient(28rem 28rem at 30% 50%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[30%] rounded-[22px] z-0 opacity-0 transition-opacity duration-300 delay-75 group-hover/island:opacity-100"
        style={{
          background:
            "radial-gradient(26rem 26rem at 80% 50%, color-mix(in srgb, var(--vio) 14%, transparent), transparent 60%)",
        }}
      />

      <div className="relative z-10 p-2">
        <div className="text-xs opacity-70 mb-1">{label}</div>
        <div role="group" aria-label={label} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {entries.map((c) => {
            const selected = value.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(c)}
                className={[
                  "w-full rounded-lg px-2.5 py-1.5 text-[13px] flex items-center justify-between gap-2",
                  "border transition-colors",
                  selected ? "border-white/20 bg-white/10" : "border-white/10 bg-black/30 hover:bg-white/5",
                ].join(" ")}
                title={CHANNEL_LABELS[c]}
              >
                <span className="truncate opacity-90">{CHANNEL_LABELS[c]}</span>
                {selected && <Check size={14} className="shrink-0 opacity-90" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PublicationsClient() {
  const { data: session } = useSession();
  const meId = session?.user?.id ?? "";

  const [q, setQ] = useState("");

  // --- FILTRE: simple select (une seule valeur) ---
  const [filterChannel, setFilterChannel] = useState<"" | CommChannel>("");

  const { data, mutate, isLoading } = useSWR<{ data: CommPublication[] }>(
    ["comm-publications", filterChannel || "(all)"],
    () =>
      listPublications({
        // côté API on supporte channels="a,b" — ici on envoie 0 ou 1 canal
        channels: filterChannel ? [filterChannel] : undefined,
      }),
    { keepPreviousData: true, fallbackData: { data: [] } }
  );

  const rows = data?.data ?? [];

  // --- Fallback côté client: on filtre aussi par canal si nécessaire ---
  const searched = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s
      ? rows.filter((p) =>
          [p.title, p.body, p.hashtags ?? ""].join(" ").toLowerCase().includes(s)
        )
      : rows;
    return base;
  }, [rows, q]);

  const filtered = useMemo(() => {
    const chan = filterChannel;
    const base = chan ? searched.filter((p) => p.channels.includes(chan)) : searched;
    // on remonte les modifiés (updatedAt DESC)
    return [...base].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [searched, filterChannel]);

  // création
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    channels: CommChannel[];
    hashtags: string;
    body: string;
  }>({
    title: "",
    channels: ["facebook_post"],
    hashtags: "",
    body: "",
  });

  const onCreate = async () => {
    if (!form.title.trim() || !form.body.trim())
      return toast.error("Titre et texte sont requis");
    if (form.channels.length === 0)
      return toast.error("Choisir au moins un canal");
    const t = toast.loading("Création…");
    try {
      await createPublication({
        title: form.title.trim(),
        channels: form.channels,
        body: form.body,
        hashtags: form.hashtags.trim() || undefined,
      });
      toast.success("Publication ajoutée", { id: t });
      setForm({ title: "", channels: ["facebook_post"], hashtags: "", body: "" });
      setShowCreate(false);
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur création", { id: t });
    }
  };

  const onDelete = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await removePublication(id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur suppression", { id: t });
    }
  };

  const onPatch = async (
    id: string,
    patch: Partial<{
      title: string;
      body: string;
      hashtags: string | null;
      channels: CommChannel[];
    }>
  ) => {
    const t = toast.loading("Mise à jour…");
    try {
      await patchPublication(id, patch);
      toast.success("Mis à jour", { id: t });
      mutate(); // updatedAt change => revient en tête
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur mise à jour", { id: t });
    }
  };

  // --- État d’édition local par carte ---
  type EditState = {
    title: string;
    hashtags: string;
    body: string;
    channels: CommChannel[];
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const { data: historyData, isLoading: historyLoading, mutate: mutateHistory } =
  useSWR<{ data: CommPublicationHistoryItem[] }>(
    historyFor ? ["pub-history", historyFor] : null,
    () => getPublicationHistory(historyFor as string),
    { keepPreviousData: true }
  );

  const startEdit = (p: CommPublication) => {
    setEditingId(p.id);
    setEditing((prev) => ({
      ...prev,
      [p.id]: {
        title: p.title,
        hashtags: p.hashtags ?? "",
        body: p.body,
        channels: p.channels,
      },
    }));
  };

  const cancelEdit = (id: string) => {
    setEditingId((curr) => (curr === id ? null : curr));
    setEditing((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveEdit = async (id: string) => {
    const st = editing[id];
    if (!st) return;
    await onPatch(id, {
      title: st.title.trim() || "",
      hashtags: st.hashtags.trim(),
      body: st.body,
      channels: st.channels,
    });
    cancelEdit(id);
  };

  return (
    <div className="space-y-6">
      {/* Filtres + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-1">
          <div className="input-wrap">
            <input
              className="input input-icon w-64"
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Search className="icon-left" size={18} />
          </div>

          {/* --- Sélecteur simple pour filtrer --- */}
          <select
            className="input sm:min-w-[240px]"
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value as CommChannel | "")}
            title="Filtrer par canal"
          >
            <option value="">Tous canaux</option>
            {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouveau modèle
        </button>
      </div>

      {/* Form créer */}
      {showCreate && (
        <div className="card space-y-3">
          <div className="grid sm:grid-cols-4 gap-3">
            <input
              className="input sm:col-span-2"
              placeholder="Titre"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <ChannelMultiSelect
              label="Publier sur"
              value={form.channels}
              onChange={(next) => setForm((f) => ({ ...f, channels: next }))}
              className="sm:col-span-2"
            />
            <input
              className="input sm:col-span-4"
              placeholder="#hashtags"
              value={form.hashtags}
              onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
            />
          </div>
          <textarea
            className="input min-h-28"
            placeholder="Texte prêt à poster…"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>
              Annuler
            </button>
            <button className="btn" onClick={onCreate}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading && <div className="opacity-70 text-sm">Chargement…</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="opacity-70 text-sm">Aucun modèle.</div>
      )}

      {filtered.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const cardIsEditing = editingId === p.id;
            const st = editing[p.id];

            return (
              <div
                key={p.id}
                className="
                  group relative isolate overflow-hidden rounded-2xl
                  border border-white/10 bg-white/5 backdrop-blur-md
                  shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
                  transition-[transform,background,border-color] duration-300 will-change-transform
                  hover:-translate-y-0.5 hover:bg-white/[0.07]
                  hover:[border-color:color-mix(in_srgb,var(--vio)_35%,transparent)]
                "
              >
                {/* glows */}
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

                <div className="relative z-10 p-5 space-y-3">
                  {/* HEADER */}
                  <div className="space-y-1">
                    {!cardIsEditing ? (
                      <div
                        className="font-extrabold text-lg leading-snug tracking-tight"
                        style={{ fontFamily: "var(--font-title)" }}
                        title={p.title}
                      >
                        {p.title}
                      </div>
                    ) : (
                      <input
                        className="input"
                        value={st?.title ?? ""}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [p.id]: { ...(prev[p.id] as EditState), title: e.target.value },
                          }))
                        }
                      />
                    )}

                    <div className="text-xs opacity-80 flex items-center gap-2 flex-wrap">
                      <ChannelBadges channels={p.channels} />
                      <span aria-hidden>•</span>
                      <span>créé le {new Date(p.createdAt).toLocaleString()}</span>
                      {p.creator_name && (
                        <>
                          <span aria-hidden>•</span>
                          <span>par <span className="font-semibold opacity-95">{p.creator_name}</span></span>
                        </>
                      )}

                      {/* Bloc “modifié” uniquement si une édition a eu lieu */}
                      {p.updatedBy && (
                        <>
                          <span aria-hidden>•</span>
                          <span>MAJ {new Date(p.updatedAt).toLocaleString()}</span>
                          {p.editor_name && (
                            <>
                              <span aria-hidden>•</span>
                              <span>édité par <span className="font-semibold opacity-95">{p.editor_name}</span></span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Hashtags */}
                  {!cardIsEditing ? (
                    p.hashtags && <div className="text-sm opacity-80">{p.hashtags}</div>
                  ) : (
                    <input
                      className="input"
                      placeholder="#hashtags"
                      value={st?.hashtags ?? ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [p.id]: { ...(prev[p.id] as EditState), hashtags: e.target.value },
                        }))
                      }
                    />
                  )}

                  {/* Corps */}
                  {!cardIsEditing ? (
                    <pre className="text-sm whitespace-pre-wrap rounded-md border border-white/10 bg-black/40 p-3">
                      {p.body}
                    </pre>
                  ) : (
                    <textarea
                      className="input min-h-24"
                      value={st?.body ?? ""}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [p.id]: { ...(prev[p.id] as EditState), body: e.target.value },
                        }))
                      }
                    />
                  )}

                  {/* Édition des canaux quand on est en mode édition */}
                  {cardIsEditing && (
                    <ChannelMultiSelect
                      label="Publier sur"
                      value={st?.channels ?? []}
                      onChange={(next) =>
                        setEditing((prev) => ({
                          ...prev,
                          [p.id]: { ...(prev[p.id] as EditState), channels: next },
                        }))
                      }
                    />
                  )}

                  {/* FOOTER actions */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm flex items-center justify-between">
                    {!cardIsEditing ? (
                      <>
                        <div className="opacity-70">Modèle</div>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-ghost"
                            title="Modifier"
                            onClick={() => startEdit(p)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn-ghost"
                            title="Historique"
                            onClick={() => setHistoryFor(p.id)}
                          >
                            <History size={14} />
                          </button>
                          <button
                            className="btn-ghost"
                            title="Supprimer"
                            onClick={() => onDelete(p.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="opacity-70">Édition en cours…</div>
                        <div className="flex items-center gap-2">
                          <button className="btn-ghost" onClick={() => cancelEdit(p.id)}>
                            Annuler
                          </button>
                          <button className="btn" onClick={() => saveEdit(p.id)}>
                            Enregistrer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
            
          })}
          {historyFor && (
            <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
              <div className="max-w-3xl w-full bg-zinc-900 rounded-xl border border-white/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">Historique des modifications</div>
                  <button className="btn-ghost" onClick={() => setHistoryFor(null)}>
                    Fermer
                  </button>
                </div>

                {historyLoading && <div className="opacity-70 text-sm">Chargement…</div>}
                {!historyLoading && (!historyData || historyData.data.length === 0) && (
                  <div className="opacity-70 text-sm">Aucune entrée d’historique.</div>
                )}

                {historyData && historyData.data.length > 0 && (
                  <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
                    {historyData.data.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wide">
                            {h.action}
                          </span>
                          <span aria-hidden>•</span>
                          <span>{new Date(h.changedAt).toLocaleString()}</span>
                          {h.editor_name || h.editor_email ? (
                            <>
                              <span aria-hidden>•</span>
                              <span>
                                par{" "}
                                <span className="font-semibold">
                                  {h.editor_name ?? h.editor_email}
                                </span>
                              </span>
                            </>
                          ) : null}
                        </div>

                        {h.changedFields.length > 0 && (
                          <div className="mt-2 opacity-80">
                            Champs modifiés:{" "}
                            <span className="font-mono">{h.changedFields.join(", ")}</span>
                          </div>
                        )}

                        {/* Optionnel : petits diff bruts */}
                        {/* Vous pouvez garder seulement "after" si vous souhaitez rester simple */}
                        {h.note && <div className="mt-2 opacity-70">Note: {h.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

