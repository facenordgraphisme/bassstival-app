"use client";

import { useState } from "react";
import useSWR from "swr";
import { listVolunteers, createVolunteer, deleteVolunteer, type Volunteer, type Team } from "@/lib/volunteers";
import { toast } from "sonner";
import { Search, Plus, Trash2 } from "lucide-react";

const TEAMS: Team[] = ["bar", "billetterie", "parking", "bassspatrouille", "tech", "autre"];

export default function VolunteersClient() {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState<Team | "">("");
  const [creating, setCreating] = useState(false);

  const { data, mutate, isLoading } = useSWR(["volunteers", q, team], () =>
    listVolunteers({ q, team: team || undefined, order: "asc" })
  );

  async function onCreate(formData: FormData) {
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const phone = String(formData.get("phone") || "").trim() || null;
    const email = String(formData.get("email") || "").trim() || null;
    const t = (String(formData.get("team") || "") as Team) || undefined;
    if (!firstName || !lastName) {
      toast.error("Prénom et nom requis");
      return;
    }
    const tId = toast.loading("Création…");
    try {
      await createVolunteer({ firstName, lastName, phone, email, team: t });
      toast.success("Bénévole créé", { id: tId });
      setCreating(false);
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Erreur création", { id: tId });
    }
  }

  async function onDelete(id: string) {
    const t = toast.loading("Suppression…");
    try {
      await deleteVolunteer(id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Erreur suppression", { id: t });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h2 className="text-2xl font-bold">Liste des bénévoles</h2>
        <div className="flex gap-3 items-center">
          <div className="input-wrap">
            <input
              className="input input-icon w-56"
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
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => setCreating((v) => !v)}>
            <Plus size={16} className="mr-1" /> Nouveau
          </button>
        </div>
      </div>

      {creating && (
        <form action={onCreate} className="card neon p-4 grid sm:grid-cols-5 gap-3">
          <input className="input" name="firstName" placeholder="Prénom" />
          <input className="input" name="lastName" placeholder="Nom" />
          <input className="input" name="phone" placeholder="Téléphone" />
          <input className="input" name="email" placeholder="Email" />
          <select className="input" name="team" defaultValue="">
            <option value="">Équipe (optionnel)</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="sm:col-span-5 flex justify-end">
            <button className="btn" type="submit">Créer</button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Équipe</th>
              <th className="text-left p-3">Téléphone</th>
              <th className="text-left p-3">Email</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((v: Volunteer) => (
              <tr key={v.id} className="border-t border-white/10">
                <td className="p-3 font-medium">
                  {v.firstName} {v.lastName}
                </td>
                <td className="p-3">{v.team}</td>
                <td className="p-3">{v.phone || "—"}</td>
                <td className="p-3">{v.email || "—"}</td>
                <td className="p-3 text-right">
                  <button className="btn-ghost" onClick={() => onDelete(v.id)}>
                    <Trash2 size={16} /> Suppr
                  </button>
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-4 opacity-70">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && (data?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="p-4 opacity-70">
                  Aucun bénévole.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
