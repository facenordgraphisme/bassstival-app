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
  // type Team,
} from "@/lib/volunteers";
import { Team, TEAM_KEYS, TEAM_LABEL } from "@/lib/teams";

import { Plus, Trash2, Search, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

export default function VolunteersClient() {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState<Team | "">("");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const { data, mutate, isLoading } = useSWR<Volunteer[]>(
    ["volunteers", q, team || "-", order],
    () => listVolunteers({ q, team: team || undefined, order }),
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
    } catch (e: any) {
      toast.error(e.message || "Erreur création", { id: t });
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
    } catch (e: any) {
      toast.error(e.message || "Erreur mise à jour", { id: t });
    }
  };

  const onDelete = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteVolunteer(id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: any) {
      toast.error(e.message || "Erreur suppression", { id: t });
    }
  };

  const rows: Volunteer[] = data || [];
  const showGrouped = !q && !team;

  const groupedByTeam = useMemo(() => {
    if (!showGrouped) return null;
    const sorted = [...rows].sort((a, b) => {
      const an = `${a.lastName} ${a.firstName}`.toLowerCase();
      const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
      return order === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
    });
    const map = new Map<Team, Volunteer[]>();
    for (const t of TEAMS) map.set(t, []);
    for (const v of sorted) {
      const key = (TEAMS.includes(v.team) ? v.team : "autre") as Team;
      map.get(key)!.push(v);
    }
    return TEAMS.map((t) => ({ team: t, items: map.get(t)! }));
  }, [rows, order, showGrouped]);

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
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
            value={team}
            onChange={(e) => setTeam(e.target.value as Team | "")}
          >
            <option value="">Toutes équipes</option>
            {TEAM_KEYS.map((t) => (
              <option key={t} value={t}>{TEAM_LABEL[t]}</option>
            ))}
          </select>

          <select className="input" value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")}>
            <option value="asc">Nom A→Z</option>
            <option value="desc">Nom Z→A</option>
          </select>

          {(q || team) && (
            <button className="btn-ghost" onClick={() => { setQ(""); setTeam(""); }}>
              Réinitialiser
            </button>
          )}
        </div>

        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouveau bénévole
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input" placeholder="Prénom" value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            <input className="input" placeholder="Nom" value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            <input className="input" placeholder="Téléphone" value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className="input" placeholder="Email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <select className="input" value={form.team}
              onChange={(e) => setForm((f) => ({ ...f, team: e.target.value as Team }))}>
              <option value="">— Équipe —</option>
              {TEAM_KEYS.map((t) => <option key={t} value={t}>{TEAM_LABEL[t]}</option>)}
            </select>
            <input className="input" placeholder="Notes" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn" onClick={onCreate}>Créer</button>
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
            <section key={t} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold capitalize">{t}</h2>
                <span className="badge">{items.length}</span>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((v) => (
                  <div key={v.id} className="card neon space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{v.firstName} {v.lastName}</div>
                      <div className="flex gap-2">
                        <button className="btn-ghost" onClick={() => openEdit(v)} title="Modifier">
                          <Pencil size={16} />
                        </button>
                        <button className="btn-ghost" onClick={() => onDelete(v.id)} title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm opacity-80">Email: {v.email || "—"}</div>
                    <div className="text-sm opacity-80">Téléphone: {v.phone || "—"}</div>
                    {v.notes && <div className="text-xs opacity-70">{v.notes}</div>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modale d’édition */}
      <Dialog open={!!editVolunteer} onOpenChange={(o) => !o && setEditVolunteer(null)}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>Modifier le bénévole</DialogTitle>
          </DialogHeader>

          {editVolunteer && (
            <>
              <div className="grid gap-2">
                <input className="input" placeholder="Prénom" value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} />
                <input className="input" placeholder="Nom" value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
                <input className="input" placeholder="Téléphone" value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                <input className="input" placeholder="Email" value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                <select className="input" value={editForm.team}
                  onChange={(e) => setEditForm((f) => ({ ...f, team: e.target.value as Team }))}>
                  {TEAM_KEYS.map((t) => <option key={t} value={t}>{TEAM_LABEL[t]}</option>)}
                </select>
                <textarea className="input h-20" placeholder="Notes"
                  value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => setEditVolunteer(null)}>Annuler</button>
                <button className="btn" onClick={onEditSave}>Enregistrer</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
