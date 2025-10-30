"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type AdminUser,
  ALL_ROLES,
} from "@/lib/admin-users";
import { Search, Plus, Trash2, Pencil } from "lucide-react";

export default function AdminUsersClient() {
  const { data, mutate, isLoading } = useSWR<AdminUser[]>(
    ["admin-users"],
    listUsers,
    { keepPreviousData: true, fallbackData: [] }
  );

  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((u) =>
      [u.name, u.email, (u.roles || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [data, q]);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roles: [] as string[],
  });

  const toggleFormRole = (role: string) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));

  const onCreate = async () => {
    if (!form.email || !form.password)
      return toast.error("Email et mot de passe requis");
    const t = toast.loading("Création…");
    try {
      await createUser({
        name: form.name || form.email,
        email: form.email,
        password: form.password,
        roles: form.roles,
      });
      toast.success("Utilisateur créé", { id: t });
      setForm({ name: "", email: "", password: "", roles: [] });
      setShowCreate(false);
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur création";
      toast.error(msg, { id: t });
    }
  };

  // Edit
  const [edit, setEdit] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    password: string;
    roles: string[];
  }>({
    name: "",
    email: "",
    password: "",
    roles: [],
  });

  const openEdit = (u: AdminUser) => {
    setEdit(u);
    setEditForm({ name: u.name, email: u.email, password: "", roles: u.roles || [] });
  };

  const toggleEditRole = (role: string) =>
    setEditForm((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));

  const onSave = async () => {
    if (!edit) return;
    const t = toast.loading("Mise à jour…");
    try {
      await updateUser(edit.id, {
        name: editForm.name,
        email: editForm.email,
        roles: editForm.roles,
        password: editForm.password || undefined,
      });
      toast.success("Modifié", { id: t });
      setEdit(null);
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg, { id: t });
    }
  };

  const onDelete = async (id: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteUser(id);
      toast.success("Supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg, { id: t });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtres + action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="input-wrap">
          <input className="input input-icon w-72" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Search className="icon-left" size={18} />
        </div>
        <button className="btn" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} className="mr-2" /> Nouvel utilisateur
        </button>
      </div>

      {/* Form créer */}
      {showCreate && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input" placeholder="Nom" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder="Mot de passe" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                type="button"
                className={`badge ${form.roles.includes(r) ? "badge-green" : ""}`}
                onClick={() => toggleFormRole(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Annuler</button>
            <button className="btn" onClick={onCreate}>Créer</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading && <div className="opacity-70 text-sm">Chargement…</div>}
      {!isLoading && filtered.length === 0 && <div className="opacity-70 text-sm">Aucun utilisateur.</div>}

      {filtered.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(u => (
            <div key={u.id} className="card neon space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold truncate">{u.name}</div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(u)} title="Modifier">
                    <Pencil size={16} />
                  </button>
                  <button className="btn-ghost" onClick={() => onDelete(u.id)} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="text-sm opacity-80 truncate">{u.email}</div>
              <div className="flex flex-wrap gap-1">
                {(u.roles || []).map(r => <span key={r} className="badge">{r}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit panel */}
      {edit && (
        <div className="card space-y-3">
          <div className="text-lg font-bold">Modifier</div>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input" placeholder="Nom" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder="Nouveau mot de passe (optionnel)" type="password" value={editForm.password} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map(r => (
              <button
                key={r}
                type="button"
                className={`badge ${editForm.roles.includes(r) ? "badge-green" : ""}`}
                onClick={() => toggleEditRole(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
            <button className="btn" onClick={onSave}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}
