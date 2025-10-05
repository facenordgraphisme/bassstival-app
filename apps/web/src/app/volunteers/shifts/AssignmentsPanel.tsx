"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  getShiftAssignments,
  assignVolunteer,
  unassignVolunteer,
  listVolunteers,
  checkInByAssignment,
  checkOutByAssignment,
  markNoShowByAssignment,
  type Team,
  type Volunteer,
  type ShiftAssignments,
} from "@/lib/volunteers";
import { CheckCircle, DoorOpen, EyeOff, X, UserPlus } from "lucide-react";

/* ---------- Petits composants ---------- */

function StatusBadge({ status }: { status?: "pending" | "in" | "done" | "no_show" }) {
  const s = status ?? "pending";
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "badge" },
    in: { label: "En poste", cls: "badge badge-green" },
    done: { label: "Terminé", cls: "badge" },
    no_show: { label: "No-show", cls: "badge badge-red" },
  };
  const m = map[s];
  return <span className={m.cls}>{m.label}</span>;
}

function Initials({ first, last }: { first?: string | null; last?: string | null }) {
  const f = (first?.[0] ?? "").toUpperCase();
  const l = (last?.[0] ?? "").toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
      {(f || l) ? `${f}${l}` : "?"}
    </div>
  );
}

/* ---------- Panel principal ---------- */

export default function AssignmentsPanel({
  shiftId,
  team,
}: {
  shiftId: string;
  team: Team;
}) {
  // Affectations + capacité
  const { data, mutate, isLoading } = useSWR<ShiftAssignments>(
    ["shift-assignments", shiftId],
    () => getShiftAssignments(shiftId),
    { keepPreviousData: true }
  );

  // Liste des bénévoles de l’équipe (pour le select)
  const { data: teamVols } = useSWR<Volunteer[]>(
    ["team-volunteers", team],
    () => listVolunteers({ team, order: "asc" }),
    { keepPreviousData: true, fallbackData: [] }
  );

  // Select d’ajout
  const [selected, setSelected] = useState<string>("");

  // Exclure ceux déjà assignés
  const assignedIds = useMemo(
    () => new Set((data?.assignments ?? []).map((a) => a.volunteerId).filter(Boolean) as string[]),
    [data]
  );
  const selectable = useMemo(
    () => (teamVols ?? []).filter((v) => !assignedIds.has(v.id)),
    [teamVols, assignedIds]
  );

  // ----- Actions -----

  const add = async () => {
    if (!selected) {
      toast.error("Sélectionne un bénévole");
      return;
    }
    const t = toast.loading("Assignation…");
    try {
      await assignVolunteer(shiftId, selected);
      toast.success("Bénévole assigné", { id: t });
      setSelected("");
      mutate();
    } catch (e: any) {
      const msg = String(e?.message || "");
      // message renvoyé par l’API si capacité atteinte ou doublon
      if (msg.toLowerCase().includes("capacité")) {
        toast.error("Capacité atteinte pour ce shift.", { id: t });
      } else if (msg.toLowerCase().includes("déjà assigné")) {
        toast.error("Ce bénévole est déjà sur ce shift.", { id: t });
      } else {
        toast.error(msg || "Erreur assignation", { id: t });
      }
    }
  };

  const remove = async (assignmentId: string) => {
    const t = toast.loading("Suppression…");
    try {
      await unassignVolunteer(assignmentId);
      toast.success("Bénévole retiré", { id: t });
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Erreur suppression", { id: t });
    }
  };

  const doCheckIn = async (assignmentId: string) => {
    const t = toast.loading("Check-in…");
    try {
      await checkInByAssignment(assignmentId);
      toast.success("Pointage enregistré", { id: t });
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Erreur check-in", { id: t });
    }
  };

  const doCheckOut = async (assignmentId: string) => {
    const t = toast.loading("Check-out…");
    try {
      await checkOutByAssignment(assignmentId);
      toast.success("Fin de shift enregistrée", { id: t });
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Erreur check-out", { id: t });
    }
  };

  const doNoShow = async (assignmentId: string) => {
    const t = toast.loading("Marquage no-show…");
    try {
      await markNoShowByAssignment(assignmentId);
      toast.success("Marqué no-show", { id: t });
      mutate();
    } catch (e: any) {
      toast.error(e?.message || "Erreur no-show", { id: t });
    }
  };

  // ----- UI -----

  return (
    <div className="space-y-4">
      {/* Capacités */}
      <div className="text-sm opacity-80">
        {isLoading ? (
          "Chargement…"
        ) : (
          <>
            {data?.used ?? 0} / {data?.capacity ?? 0} assigné(s)
            {!!data && data.remaining === 0 && (
              <span className="badge badge-red ml-2">Complet</span>
            )}
          </>
        )}
      </div>

      {/* Assignés */}
      <div className="space-y-2">
        {(data?.assignments ?? []).length === 0 ? (
          <div className="text-sm opacity-70">Personne encore assigné.</div>
        ) : (
          (data?.assignments ?? []).map((a) => {
            const canCheckIn = (a.status ?? "pending") === "pending";
            const canCheckOut = a.status === "in";
            const canNoShow = (a.status ?? "pending") === "pending";

            return (
              <div
                key={a.assignmentId}
                className="flex flex-col items-center justify-between gap-3 border-b border-white/10 pb-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Initials first={a.firstName} last={a.lastName} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {[a.firstName, a.lastName].filter(Boolean).join(" ") || "—"}
                    </div>
                    <div className="text-xs opacity-70 truncate">
                      {a.email || a.phone || "—"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <StatusBadge status={a.status} />

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => doCheckIn(a.assignmentId)}
                    disabled={!canCheckIn}
                    title="Check-in"
                  >
                    <CheckCircle size={16} />
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => doCheckOut(a.assignmentId)}
                    disabled={!canCheckOut}
                    title="Check-out"
                  >
                    <DoorOpen size={16} />
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => doNoShow(a.assignmentId)}
                    disabled={!canNoShow}
                    title="No-show"
                  >
                    <EyeOff size={16} />
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => remove(a.assignmentId)}
                    title="Retirer du shift"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ajout via SELECT (par équipe) */}
      <div className="space-y-2">
        <label className="text-xs opacity-70">Ajouter un bénévole</label>
        <div className="flex gap-2">
          <select
            className="input w-full"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {selectable.map((v) => (
              <option key={v.id} value={v.id}>
                {[v.firstName, v.lastName].filter(Boolean).join(" ")}{" "}
                {v.email ? ` • ${v.email}` : v.phone ? ` • ${v.phone}` : ""}
              </option>
            ))}
          </select>

          <button type="button" className="btn" onClick={add} disabled={!selected}>
            <UserPlus size={16} className="mr-1" /> Ajouter
          </button>
        </div>
        {selectable.length === 0 && (
          <div className="text-xs opacity-60">
            Aucun bénévole disponible pour l’équipe « {team} » (ou tous déjà assignés).
          </div>
        )}
      </div>
    </div>
  );
}
