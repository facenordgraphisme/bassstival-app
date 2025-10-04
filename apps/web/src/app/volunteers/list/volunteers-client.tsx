"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  listVolunteers,
  createVolunteer,
  deleteVolunteer,
  type Volunteer,
  type Team,
} from "@/lib/volunteers";
import { Plus, Trash2, Search } from "lucide-react";

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

  // Formulaire création (simple)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes: string;
    team: Team | "";
  }>({
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
      const msg = e instanceof Error ? e.message : "Erreur création";
      toast.error(msg, { id: t });
    }
  };

  const onDelete = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteVolunteer(id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur suppression";
      toast.error(msg, { id: t });
    }
  };

  const rows: Volunteer[] = data || [];

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="input-wrap">
            <input
              className="input input-icon w-64"
              placeholder="Rechercher… (nom, email, tel)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Search className="icon-left" size={18} aria-hidden />
          </div>

          <select className="input" value={team} onChange={(e) => setTeam(e.target.value as Team | "")}>
            <option value="">Toutes équipes</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select className="input" value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")}>
            <option value="asc">Nom A→Z</option>
            <option value="desc">Nom Z→A</option>
          </select>

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

        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouveau bénévole
        </button>
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
              {TEAMS.map((t) => (
                <option key={t} value={t}>{t}</option>
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
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn" onClick={onCreate}>Créer</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading && <div className="text-sm opacity-70">Chargement…</div>}
      {!isLoading && rows.length === 0 && <div className="text-sm opacity-70">Aucun bénévole.</div>}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((v) => (
          <div key={v.id} className="card neon space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                {v.firstName} {v.lastName}
              </div>
              <button className="btn-ghost" onClick={() => onDelete(v.id)} title="Supprimer">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="text-sm opacity-80">Équipe: {v.team}</div>
            <div className="text-sm opacity-80">Email: {v.email || "—"}</div>
            <div className="text-sm opacity-80">Téléphone: {v.phone || "—"}</div>
            {v.notes && <div className="text-xs opacity-70">{v.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
