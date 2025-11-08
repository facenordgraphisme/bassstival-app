"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  listVolunteers,
  createVolunteer,
  deleteVolunteer,
  updateVolunteer,
  type Volunteer,
} from "@/lib/volunteers";
import { Team, TEAM_KEYS, TEAM_LABEL } from "@/lib/teams";

import { Plus, Trash2, Search, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FadeUp } from "@/components/FX";
import BackButton from "@/components/BackButton";

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

/* ---------- helpers ---------- */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

/** classes communes pour une tuile cohérente avec le reste du site */
const tileBase =
  "group relative overflow-hidden isolate rounded-2xl border border-white/10 bg-white/5 " +
  "backdrop-blur-md shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)] " +
  "transition-[transform,box-shadow,border-color,background] duration-300 will-change-transform " +
  "hover:scale-[1.015] hover:bg-white/[0.07] " +
  "hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)] " +
  "focus-within:ring-2 focus-within:ring-[var(--accent)]/40 p-4 sm:p-5";

/** halo + ring décoratifs (au survol) */
function TileDecor({ ring = "ring-[color-mix(in_srgb,var(--vio)_20%,transparent)]" }: { ring?: string }) {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
          style={{
            background:
              "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 28%, transparent), color-mix(in srgb, var(--vio) 28%, transparent), color-mix(in srgb, var(--flame) 22%, transparent), color-mix(in srgb, var(--cyan) 28%, transparent))",
          }}
        />
      </span>
      <div aria-hidden className={`absolute inset-0 rounded-2xl ring-1 ring-inset opacity-40 pointer-events-none ${ring} group-hover:opacity-60`} />
    </>
  );
}

/* ---------- component ---------- */
export default function VolunteersClient() {
type TeamFilter = "" | Team | "none"; // "" = toutes, "none" = sans équipe

  const [q, setQ] = useState("");
  const [team, setTeam] = useState<TeamFilter>("");         // 👈 accepte "none"
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [grouped, setGrouped] = useState(false);            // 👈 toggle vue groupée
const effectiveTeam =
  team === "" || team === "none" ? undefined : (team as Team);

const { data, mutate, isLoading } = useSWR<Volunteer[]>(
  ["volunteers", q, team || "-", order],
  () => listVolunteers({ q, team: effectiveTeam, order }), // 👈 on passe la valeur corrigée
  { keepPreviousData: true, fallbackData: [] }
);

  // ---- Création ----
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
    team: "",
  });

  const onCreate = async () => {
    if (!form.firstName || !form.lastName) {
      toast.error("Prénom et Nom requis");
      return;
    }
    const t = toast.loading("Création…");
    try {
      await createVolunteer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
        team: (form.team || undefined) as Team | undefined,
      });
      toast.success("Bénévole créé ✅", { id: t });
      setShowForm(false);
      setForm({ firstName: "", lastName: "", phone: "", email: "", notes: "", team: "" });
      mutate();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // ---- Édition ----
  const [editVolunteer, setEditVolunteer] = useState<Volunteer | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
    team: "",
  });

  const openEdit = (v: Volunteer) => {
    setEditVolunteer(v);
    setEditForm({
      firstName: v.firstName,
      lastName: v.lastName,
      phone: v.phone || "",
      email: v.email || "",
      notes: v.notes || "",
      team: v.team || "",
    });
  };

  const onEditSave = async () => {
    if (!editVolunteer) return;
    const t = toast.loading("Mise à jour…");
    try {
      await updateVolunteer(editVolunteer.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone || null,
        email: editForm.email || null,
        notes: editForm.notes || null,
        team: (editForm.team || undefined) as Team | undefined,
      });
      toast.success("Modifié ✅", { id: t });
      setEditVolunteer(null);
      mutate();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const onDelete = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteVolunteer(id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const all: Volunteer[] = data || [];

// --- filtre équipe côté client (béton même si l’API ne filtre pas) ---
const byTeam = (v: Volunteer) => {
  if (team === "") return true;           // toutes
  if (team === "none") return !v.team;    // sans équipe
  return v.team === team;                 // équipe précise
};

// --- tri alpha sur Nom Prénom ---
const sortByName = (a: Volunteer, b: Volunteer) => {
  const an = `${a.lastName} ${a.firstName}`.toLowerCase();
  const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
  return order === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
};

// --- on applique le tri + filtre ---
const rows: Volunteer[] = [...all].filter(byTeam).sort(sortByName);

// --- vue groupée activable par toggle ---
const showGrouped = grouped && !q; // groupé SI toggle actif et pas de recherche
const TEAMS_WITH_NULL: Array<Team | null> = ["bar","billetterie","parking","bassspatrouille","tech","autre", null];

const groupedByTeam = useMemo(() => {
  if (!showGrouped) return null;
  const map = new Map<Team | null, Volunteer[]>();
  for (const t of TEAMS_WITH_NULL) map.set(t, []);
  for (const v of rows) {
    const key = (v.team ?? null) as Team | null;
    map.get(key)!.push(v);
  }
  return TEAMS_WITH_NULL.map((t) => ({ team: t, items: map.get(t)! }));
}, [rows, showGrouped]);

  return (
    <FadeUp className="space-y-8">
      <div className="flex items-center gap-3">
          <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
          Liste des bénévoles
        </h1>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-4">
        {/* Ligne 1 : recherche + filtres principaux */}
        <div className="flex flex-wrap items-end gap-3">
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
            className="input min-w-[180px]"
            value={team}
            onChange={(e) => setTeam(e.target.value as TeamFilter)}
            title="Filtrer par équipe"
          >
            <option value="">Toutes équipes</option>
            <option value="none">Sans équipe</option>
            {TEAM_KEYS.map((t) => (
              <option key={t} value={t}>
                {TEAM_LABEL[t]}
              </option>
            ))}
          </select>

          <select
            className="input min-w-[150px]"
            value={order}
            onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
            title="Trier"
          >
            <option value="asc">Nom A→Z</option>
            <option value="desc">Nom Z→A</option>
          </select>

          <label className="inline-flex items-center gap-2 text-sm bg-white/5 px-3 py-2 rounded-lg border border-white/10">
            <input
              type="checkbox"
              className="accent-current"
              checked={grouped}
              onChange={(e) => setGrouped(e.target.checked)}
            />
            <span>Afficher par équipe</span>
          </label>

          {(q || team) && (
            <button
              className="btn-ghost"
              onClick={() => {
                setQ("");
                setTeam("");
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Ligne 2 : bouton d’action principal */}
        <div className="flex items-center justify-end">
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} className="mr-2" /> Nouveau bénévole
          </button>
        </div>
      </div>


      {/* Formulaire création */}
      {showForm && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Prénom"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Nom"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Téléphone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <select
              className="input"
              value={form.team}
              onChange={(e) => setForm((f) => ({ ...f, team: e.target.value as Team }))}
            >
              <option value="">— Équipe —</option>
              {TEAM_KEYS.map((t) => (
                <option key={t} value={t}>
                  {TEAM_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
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
      {!isLoading && rows.length === 0 && <div className="text-sm opacity-70">Aucun bénévole.</div>}

      {/* Vue groupée */}
      {showGrouped && groupedByTeam && (
        <div className="space-y-8">
          {groupedByTeam.map(({ team: t, items }) => (
            <section key={String(t)} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold capitalize">
                  {t ? TEAM_LABEL[t] : "Sans équipe"} {/* 👈 */}
                </h2>
                <span className="badge">{items.length}</span>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((v) => (
                  <div key={v.id} className={tileBase}>
                    <TileDecor />
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold truncate">
                          {v.firstName} {v.lastName}
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-ghost" onClick={() => openEdit(v)} title="Modifier">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-ghost" onClick={() => onDelete(v.id)} title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs opacity-70">
                        Équipe : <span className="font-medium">{v.team ? TEAM_LABEL[v.team] : "—"}</span>
                      </div>
                      <div className="text-sm opacity-80 truncate">Email: {v.email || "—"}</div>
                      <div className="text-sm opacity-80 truncate">Téléphone: {v.phone || "—"}</div>
                      {v.notes && <div className="text-xs opacity-70">{v.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Vue non groupée (recherche / filtre actifs) */}
      {!showGrouped && (
        <>
          {(team || q) && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold capitalize">
                  {team ? `Équipe : ${TEAM_LABEL[team as Team]}` : "Résultats de la recherche"}
                </h2>
                {rows.length > 0 && <span className="badge">{rows.length}</span>}
              </div>

              <button
                className="group flex items-center gap-2 rounded-full border border-yellow-500/50 bg-black/40 px-3 py-2 text-sm font-semibold text-yellow-400 transition-all hover:text-yellow-100 hover:border-yellow-400"
                onClick={() => {
                  setTeam("");
                  setQ("");
                }}
              >
                ← Retour à toutes les équipes
              </button>
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="text-sm opacity-70">
              Aucun bénévole {team ? `pour ${TEAM_LABEL[team as Team]}` : "correspondant à la recherche"}.
            </div>
          )}

          {rows.length > 0 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...rows]
                .sort((a, b) => {
                  const an = `${a.lastName} ${a.firstName}`.toLowerCase();
                  const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
                  return order === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
                })
                .map((v) => (
                  <div key={v.id} className={tileBase}>
                    <TileDecor />

                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold truncate">
                          {v.firstName} {v.lastName}
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-ghost" onClick={() => openEdit(v)} title="Modifier">
                            <Pencil size={16} />
                          </button>
                          <button className="btn-ghost" onClick={() => onDelete(v.id)} title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs opacity-70">
                        Équipe : <span className="font-medium">{TEAM_LABEL[v.team]}</span>
                      </div>
                      <div className="text-sm opacity-80 truncate">Email: {v.email || "—"}</div>
                      <div className="text-sm opacity-80 truncate">Téléphone: {v.phone || "—"}</div>
                      {v.notes && <div className="text-xs opacity-70">{v.notes}</div>}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Modale d’édition */}
      <Dialog open={!!editVolunteer} onOpenChange={(o) => !o && setEditVolunteer(null)}>
        <DialogContent className="max-w-md space-y-4 bg-[#07070a]">
          <DialogHeader>
            <DialogTitle>Modifier le bénévole</DialogTitle>
          </DialogHeader>

          {editVolunteer && (
            <>
              <div className="grid gap-2">
                <input
                  className="input"
                  placeholder="Prénom"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Nom"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Téléphone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <input
                  className="input"
                  placeholder="Email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
                <select
                  className="input"
                  value={editForm.team}
                  onChange={(e) => setEditForm((f) => ({ ...f, team: e.target.value as Team | "" }))}
                >
                  <option value="">— Aucune —</option> {/* 👈 */}
                  {TEAM_KEYS.map((t) => (
                    <option key={t} value={t}>
                      {TEAM_LABEL[t]}
                    </option>
                  ))}
                </select>
                <textarea
                  className="input h-20"
                  placeholder="Notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => setEditVolunteer(null)}>
                  Annuler
                </button>
                <button className="btn" onClick={onEditSave}>
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </FadeUp>
  );
}
