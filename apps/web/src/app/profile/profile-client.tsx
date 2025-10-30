// apps/web/src/app/profile/profile-client.tsx
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  getMe,
  updateMyName,
  changeMyPassword,
  type CurrentUser,
} from "@/lib/users";

export default function ProfileClient({ initial }: { initial: CurrentUser | null }) {
  const { data: me, mutate } = useSWR<CurrentUser>(
    ["me"],
    getMe,
    { fallbackData: initial ?? undefined, revalidateOnFocus: true }
  );

  // ---- Form name
  const [name, setName] = useState(me?.name ?? "");

  // Resync de l'input si SWR recharge / change
  useEffect(() => {
    if (me) setName(me.name ?? "");
  }, [me]);

  const saveName = async () => {
    const trimmed = (name || "").trim();
    if (!trimmed) return toast.error("Nom invalide");
    const t = toast.loading("Mise à jour du nom…");
    try {
      await updateMyName(trimmed);
      toast.success("Nom mis à jour", { id: t });
      await mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur", { id: t });
    }
  };

  // ---- Form password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const savePassword = async () => {
    if (newPassword.length < 8) return toast.error("Nouveau mot de passe trop court (min. 8)");
    if (newPassword !== newPassword2) return toast.error("Les mots de passe ne correspondent pas");
    const t = toast.loading("Mise à jour du mot de passe…");
    try {
      await changeMyPassword(currentPassword, newPassword);
      toast.success("Mot de passe mis à jour", { id: t });
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur", { id: t });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-title)" }}>
        Mon profil
      </h1>

      {/* Identité (email en lecture seule) */}
      <div className="card space-y-3">
        <div className="grid gap-3">
          <div>
            <label className="text-xs opacity-70 mb-1 block">Nom</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
            />
          </div>

          <div>
            <label className="text-xs opacity-70 mb-1 block">Email (non modifiable)</label>
            <input className="input opacity-70" value={me?.email ?? ""} disabled />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn" onClick={saveName}>Enregistrer</button>
        </div>
      </div>

      {/* Changer de mot de passe */}
      <div className="card space-y-3">
        <div className="font-semibold">Changer le mot de passe</div>
        <div className="grid gap-3">
          <input
            className="input"
            type="password"
            placeholder="Mot de passe actuel"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Nouveau mot de passe (min. 8)"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <button className="btn" onClick={savePassword}>Mettre à jour</button>
        </div>
      </div>
    </div>
  );
}
