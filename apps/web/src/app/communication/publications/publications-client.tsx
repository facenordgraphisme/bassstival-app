"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listPublications, createPublication, removePublication, patchPublication,
  CHANNEL_LABELS, type CommPublication, type CommChannel
} from "@/lib/communication";
import { Search, Plus, Trash2 } from "lucide-react";

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

export default function PublicationsClient() {
  const [q, setQ] = useState("");

  // filtres multi-canaux
  const [filterChannels, setFilterChannels] = useState<CommChannel[]>([]);

  const { data, mutate, isLoading } = useSWR<{ data: CommPublication[] }>(
    ["comm-publications", [...filterChannels].sort().join(",")],
    () =>
      listPublications({
        channels: filterChannels.length ? filterChannels : undefined, // ✅ array
      }),
    { keepPreviousData: true, fallbackData: { data: [] } }
  );

  const rows = data?.data ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s
      ? rows.filter(p =>
          [p.title, p.body, p.hashtags ?? ""].join(" ").toLowerCase().includes(s)
        )
      : rows;
    return [...base].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [rows, q]);

  // création
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    channels: CommChannel[];   // ✅
    hashtags: string;
    body: string;
  }>({
    title: "",
    channels: ["facebook_post"], // ✅
    hashtags: "",
    body: "",
  });

  const toggleFormChannel = (c: CommChannel) =>
    setForm(f => ({
      ...f,
      channels: f.channels.includes(c) ? f.channels.filter(x => x !== c) : [...f.channels, c],
    }));

  const ChannelMultiSelect = ({
    value, onChange,
  }: { value: CommChannel[]; onChange: (next: CommChannel[]) => void }) => {
    const toggle = (c: CommChannel) =>
      onChange(value.includes(c) ? value.filter(v => v !== c) : [...value, c]);
    return (
      <div className="rounded-md border border-white/10 bg-white/5 p-2 flex flex-wrap gap-2">
        {Object.keys(CHANNEL_LABELS).map((k) => {
          const c = k as CommChannel;
          const checked = value.includes(c);
          return (
            <label key={c} className="inline-flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="accent-current"
                checked={checked}
                onChange={() => toggle(c)}
              />
              <span className="opacity-90">{CHANNEL_LABELS[c]}</span>
            </label>
          );
        })}
      </div>
    );
  };

  const onCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Titre et texte sont requis");
    if (form.channels.length === 0) return toast.error("Choisir au moins un canal");
    const t = toast.loading("Création…");
    try {
      await createPublication({
        title: form.title.trim(),
        channels: form.channels, // ✅
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
    patch: Partial<{ title: string; body: string; hashtags: string | null; channels: CommChannel[] }>
  ) => {
    const t = toast.loading("Mise à jour…");
    try {
      await patchPublication(id, patch);
      toast.success("Mis à jour", { id: t });
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur mise à jour", { id: t });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="input-wrap">
            <input
              className="input input-icon w-64"
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Search className="icon-left" size={18} />
          </div>

          {/* multi-canaux filtre */}
          <ChannelMultiSelect
            value={filterChannels}
            onChange={setFilterChannels}
          />
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
            <div className="sm:col-span-2">
              <ChannelMultiSelect
                value={form.channels}
                onChange={(next) => setForm(f => ({ ...f, channels: next }))}
              />
            </div>
            <input
              className="input"
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
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Annuler</button>
            <button className="btn" onClick={onCreate}>Enregistrer</button>
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
          {filtered.map((p) => (
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
              <div className="relative z-10 p-5 space-y-3">
                <div className="space-y-1">
                  <div className="font-semibold text-lg truncate">{p.title}</div>
                  <div className="text-sm opacity-80 flex items-center gap-2">
                    <ChannelBadges channels={p.channels} />
                    <span>• {new Date(p.updatedAt).toLocaleString()}</span>
                  </div>
                </div>

                {p.hashtags && <div className="text-sm opacity-80">{p.hashtags}</div>}
                <pre className="text-sm whitespace-pre-wrap rounded-md border border-white/10 bg-black/40 p-3">
                  {p.body}
                </pre>

                {/* inline edit */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm space-y-2">
                  <input
                    className="input"
                    defaultValue={p.title}
                    onBlur={(e) => onPatch(p.id, { title: e.target.value || p.title })}
                  />
                  <input
                    className="input"
                    defaultValue={p.hashtags ?? ""}
                    placeholder="#hashtags"
                    onBlur={(e) => onPatch(p.id, { hashtags: e.target.value })}
                  />
                  <textarea
                    className="input min-h-20"
                    defaultValue={p.body}
                    onBlur={(e) => onPatch(p.id, { body: e.target.value || p.body })}
                  />
                  <div className="flex items-center justify-between">
                    <div className="opacity-70">Auto-save au blur</div>
                    <button className="btn-ghost" title="Supprimer" onClick={() => onDelete(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
